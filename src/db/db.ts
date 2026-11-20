import Dexie, { type Table } from 'dexie';
import type { Draft, DraftEntry, Session, SetLog, Settings } from './models';
import { DEFAULT_SETTINGS } from './models';
import type { Day, Program, TemplateId } from '../program/types';
import { PROGRAM_VERSION, exerciseById } from '../program/program';
import { TEMPLATE_BY_ID } from '../catalog/templates';
import { entryToValues, hasValues, isComplete, newId } from '../logic/values';
import { model1Programs, settingsToAdd, upgradeSession, type SettingRow } from './migrate';

export const DB_NAME = 'teachergym';

/** Solo per le prove automatiche: fa fallire la migrazione a metà (mai impostato nell'app). */
declare global {
  // eslint-disable-next-line no-var
  var __TG_TEST_FAIL_UPGRADE__: boolean | undefined;
}

/**
 * Database IndexedDB. Per cambiare la struttura: aggiungere una nuova
 * `this.version(N+1).stores(...).upgrade(...)` SENZA toccare le versioni precedenti.
 */
class GymDB extends Dexie {
  sessions!: Table<Session, string>;
  setLogs!: Table<SetLog, string>;
  drafts!: Table<Draft, Day>;
  settings!: Table<SettingRow, string>;
  programs!: Table<Program, string>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      sessions: 'id, date, day',
      setLogs: 'id, sessionId, exerciseId',
      drafts: 'day',
      settings: 'key',
    });
    /*
     * Versione 2 (Fase 4-bis): nuova tabella `programs` (le schede). Le altre tabelle restano uguali:
     * `day` di sedute e bozze contiene ora l'id della scheda (Modello 1 = 'A' / 'B' / 'C').
     * L'upgrade gira UNA volta, solo su un database v1 esistente, dentro un'unica transazione:
     * se qualcosa fallisce il browser annulla tutto e il database resta v1, intatto.
     * Aggiunge soltanto (schede, campi delle sedute, impostazioni mancanti): niente viene cancellato.
     */
    this.version(2)
      .stores({ programs: 'id, order' })
      .upgrade(async (tx) => {
        // 1. schede del Modello 1 (solo se la tabella è vuota)
        const programs = tx.table<Program, string>('programs');
        if ((await programs.count()) === 0) await programs.bulkAdd(model1Programs());
        // 2. sedute: nome della scheda e copia delle voci previste (i campi esistenti non si toccano)
        await tx
          .table<Session, string>('sessions')
          .toCollection()
          .modify((s) => {
            const u = upgradeSession(s);
            if (u !== s) Object.assign(s, { programName: u.programName, plan: u.plan });
          });
        if (globalThis.__TG_TEST_FAIL_UPGRADE__) throw new Error('Migrazione interrotta apposta (prova automatica)');
        // 3. impostazioni nuove, solo quelle che mancano
        const rows = await tx.table<SettingRow, string>('settings').toArray();
        const sessions = await tx.table<Session, string>('sessions').toArray();
        const add = settingsToAdd(rows, sessions);
        if (add.length) await tx.table<SettingRow, string>('settings').bulkAdd(add);
        // 4. bozze: nessuna modifica (la chiave `day` vale già come id della scheda)
      });
  }
}

export const db = new GymDB();

// ---------- impostazioni ----------

export async function loadSettings(): Promise<Settings> {
  const rows = await db.settings.toArray();
  const s: Settings = { ...DEFAULT_SETTINGS };
  for (const r of rows) (s as unknown as Record<string, unknown>)[r.key] = r.value;
  return s;
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  await db.settings.put({ key, value });
}

// ---------- schede ----------

/**
 * Schede nuove da un modello: id GENERATI (mai 'A'/'B'/'C', che restano alle sedute migrate),
 * così le sedute vecchie non si mescolano con una scheda nuova che si chiama "A".
 */
export function programsFromTemplate(templateId: TemplateId): Program[] {
  const t = TEMPLATE_BY_ID[templateId];
  if (!t) throw new Error(`Modello sconosciuto: ${templateId}`);
  return t.programs.map((p, i) => ({
    ...JSON.parse(JSON.stringify(p)),
    id: newId(),
    order: i + 1,
  }));
}

/** Sostituisce le schede con quelle di un modello. Lo storico non si tocca. */
export async function applyTemplate(templateId: TemplateId): Promise<Program[]> {
  const programs = programsFromTemplate(templateId);
  await db.transaction('rw', [db.programs, db.settings], async () => {
    await db.programs.clear();
    await db.programs.bulkAdd(programs);
    await db.settings.put({ key: 'templateId', value: templateId });
  });
  return programs;
}

/**
 * PROVVISORIO (passo 4, fino al primo avvio del passo 5): un'installazione nuova senza schede
 * riceve il Modello 1 con id generati, così l'app è usabile.
 */
export async function ensurePrograms(): Promise<void> {
  // controllo e scrittura nella stessa transazione: due chiamate insieme non creano due volte le schede
  await db.transaction('rw', [db.programs, db.settings], async () => {
    if ((await db.programs.count()) > 0) return;
    await db.programs.bulkAdd(programsFromTemplate('m1'));
    await db.settings.put({ key: 'templateId', value: 'm1' });
  });
}

// ---------- bozza della seduta in corso ----------

export async function saveDraft(draft: Draft): Promise<void> {
  await db.drafts.put({ ...draft, updatedAt: new Date().toISOString() });
}

export async function deleteDraft(day: Day): Promise<void> {
  await db.drafts.delete(day);
}

/**
 * Salva la seduta: solo le serie confermate (presenti nella bozza) e COMPLETE
 * (ripetizioni/secondi presenti, carico dove serve). `durationSec` solo se il cronometro era partito.
 * Restituisce il numero di serie salvate (0 = niente salvato).
 */
export async function saveSessionFromDraft(
  draft: Draft,
  phase1: boolean,
  maxSets: Record<string, number>,
  durationSec: number | undefined,
  program: Pick<Program, 'name' | 'items'>,
): Promise<number> {
  const sessionId = newId();
  const logs: SetLog[] = [];
  const add = (exerciseId: string, entries: (DraftEntry | null)[], firstIndex: number, extra: boolean) => {
    const ex = exerciseById(exerciseId);
    if (!ex) return;
    entries.forEach((entry, k) => {
      if (!entry || entry.pending) return; // non confermata
      const v = entryToValues(entry);
      if (!isComplete(ex.metric, v)) return;
      logs.push({ id: newId(), sessionId, exerciseId, setIndex: firstIndex + k, confirmed: true, ...v, ...(extra ? { extra } : {}) });
    });
  };
  // serie previste (maxSets = quante ne prevede ora la scheda), poi le extra numerate di seguito
  for (const [exerciseId, arr] of Object.entries(draft.sets)) {
    add(exerciseId, arr.slice(0, maxSets[exerciseId] ?? arr.length), 0, false);
  }
  for (const [exerciseId, arr] of Object.entries(draft.extra ?? {})) {
    add(exerciseId, arr, maxSets[exerciseId] ?? 0, true);
  }
  const hasCircuit = !!draft.circuit && draft.circuit.completedRounds > 0;
  if (logs.length === 0 && !hasCircuit) return 0;

  await db.transaction('rw', [db.sessions, db.setLogs, db.drafts, db.settings], async () => {
    await db.sessions.add({
      id: sessionId,
      date: new Date().toISOString(),
      day: draft.day,
      // copia della scheda di adesso: modificarla dopo non cambia questa seduta
      programName: program.name,
      plan: JSON.parse(JSON.stringify(program.items)),
      phase1,
      notes: draft.notes.trim(),
      programVersion: PROGRAM_VERSION,
      ...(hasCircuit ? { circuit: draft.circuit } : {}),
      ...(durationSec != null ? { durationSec } : {}),
    });
    await db.setLogs.bulkAdd(logs);
    await db.drafts.delete(draft.day);
    const row = await db.settings.get('sessionsSinceBackup');
    await db.settings.put({ key: 'sessionsSinceBackup', value: ((row?.value as number) ?? 0) + 1 });
  });
  return logs.length || 1;
}

// ---------- storico ----------

export async function updateSession(session: Session, logs: SetLog[]): Promise<void> {
  await db.transaction('rw', [db.sessions, db.setLogs], async () => {
    await db.sessions.put(session);
    await db.setLogs.where('sessionId').equals(session.id).delete();
    await db.setLogs.bulkAdd(logs.filter((l) => hasValues(l)));
  });
}

export async function deleteSession(id: string): Promise<void> {
  await db.transaction('rw', [db.sessions, db.setLogs], async () => {
    await db.setLogs.where('sessionId').equals(id).delete();
    await db.sessions.delete(id);
  });
}

// ---------- backup ----------

/**
 * Sostituisce TUTTI i dati con quelli del backup.
 * Impostazioni: solo le chiavi presenti nel backup (un backup v1 non tocca nome, lato, primo avvio…).
 * Schede: sostituite solo se il backup le contiene (backup v2).
 */
export async function replaceAllData(
  sessions: Session[],
  setLogs: SetLog[],
  settings?: Partial<Settings>,
  programs?: Program[],
): Promise<void> {
  await db.transaction('rw', [db.sessions, db.setLogs, db.settings, db.programs], async () => {
    await db.setLogs.clear();
    await db.sessions.clear();
    await db.sessions.bulkAdd(sessions);
    await db.setLogs.bulkAdd(setLogs);
    if (programs) {
      await db.programs.clear();
      await db.programs.bulkAdd(programs);
    }
    if (settings) {
      for (const [key, value] of Object.entries(settings)) {
        await db.settings.put({ key: key as keyof Settings, value });
      }
    }
  });
}

/** Aggiunge sedute (es. dal prototipo) saltando quelle già presenti. Restituisce quante ne ha aggiunte. */
/** Aggiunge le sedute non ancora presenti; restituisce gli id di quelle aggiunte. */
export async function mergeSessions(sessions: Session[], setLogs: SetLog[]): Promise<string[]> {
  const added: string[] = [];
  await db.transaction('rw', [db.sessions, db.setLogs], async () => {
    for (const s of sessions) {
      if (await db.sessions.get(s.id)) continue;
      await db.sessions.add(s);
      await db.setLogs.bulkAdd(setLogs.filter((l) => l.sessionId === s.id));
      added.push(s.id);
    }
  });
  return added;
}

export async function markBackupDone(): Promise<void> {
  await db.settings.bulkPut([
    { key: 'lastBackupAt', value: new Date().toISOString() },
    { key: 'sessionsSinceBackup', value: 0 },
  ]);
}

// ---------- archiviazione persistente ----------

export type PersistState = 'granted' | 'denied' | 'unsupported';

/** Chiede al browser di non cancellare i dati. */
export async function requestPersistence(): Promise<PersistState> {
  if (!navigator.storage?.persist) return 'unsupported';
  try {
    if (await navigator.storage.persisted()) return 'granted';
    return (await navigator.storage.persist()) ? 'granted' : 'denied';
  } catch {
    return 'unsupported';
  }
}
