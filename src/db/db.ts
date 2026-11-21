import Dexie, { type Table } from 'dexie';
import type { Draft, Session, SetLog, Settings } from './models';
import { DEFAULT_SETTINGS } from './models';
import type { Day, Program, TemplateId } from '../program/types';
import { phase1SinceOnSave, phase1Snooze, phase1Toggle } from '../logic/phase1';
import { logsFromDraft } from '../logic/draftLogs';
import { PROGRAM_VERSION } from '../program/program';
import { TEMPLATE_BY_ID } from '../catalog/templates';
import { hasValues, newId } from '../logic/values';
import { model1Programs, settingsToAdd, upgradeSession, type SettingRow } from './migrate';

export const DB_NAME = 'teachergym';

/** Solo per le prove automatiche: fa fallire la migrazione a metà (mai impostato nell'app). */
declare global {
  // eslint-disable-next-line no-var
  var __TG_TEST_FAIL_UPGRADE__: boolean | undefined;
  /** Solo per le prove automatiche: fa fallire «Ricarica un modello» a metà transazione. */
  // eslint-disable-next-line no-var
  var __TG_TEST_FAIL_RELOAD__: boolean | undefined;
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

/**
 * Primo avvio, al tocco di «Inizia»: schede del modello scelto + impostazioni, tutto in UNA transazione
 * (se si chiude l'app prima, non resta niente di salvato e il primo avvio riparte da capo).
 * Se nel frattempo le schede esistono già (es. un'altra scheda del browser), non le duplica.
 */
export async function completeFirstRun(templateId: TemplateId): Promise<void> {
  await db.transaction('rw', [db.programs, db.settings], async () => {
    if ((await db.programs.count()) === 0) await db.programs.bulkAdd(programsFromTemplate(templateId));
    await db.settings.bulkPut([
      { key: 'templateId', value: templateId },
      { key: 'onboarded', value: true },
    ]);
  });
}

/** Bozza "avviata": cronometro partito o circuito in corso. */
export const isStarted = (d: { startedAt?: string; circuitRun?: unknown }) => !!d.startedAt || !!d.circuitRun;

/** Cambio di un'impostazione rifiutato: c'è un allenamento avviato su questa scheda. */
export class StartedWorkoutError extends Error {
  constructor(public readonly programName: string, what: string) {
    super(`C'è un allenamento avviato sulla scheda ${programName}: concludilo o annullalo prima di ${what}.`);
    this.name = 'StartedWorkoutError';
  }
}

/**
 * Nome della scheda con un allenamento avviato, o null. Dentro una transazione usa quella; fuori, due letture
 * in sola lettura (bozze, poi il nome della scheda solo se serve).
 */
async function startedProgramName(): Promise<string | null> {
  const started = (await db.drafts.toArray()).find(isStarted);
  if (!started) return null;
  return (await db.programs.get(started.day))?.name ?? started.day;
}

/**
 * «Separa i lati» (Info): bloccato con un allenamento avviato.
 * Controllo in sola lettura, poi una sola scrittura su `settings` (nessuna tabella bloccata in scrittura senza motivo).
 * Basta così perché i dati li tocca una sola copia dell'app per volta (src/db/appLock.ts) e in questa pagina,
 * tra il controllo e la scrittura, nessuno può avviare un allenamento.
 * Le bozze non avviate restano: spento, un «primo lato fatto» torna semplicemente «da confermare».
 */
export async function setSeparateSides(on: boolean): Promise<void> {
  const name = await startedProgramName();
  if (name) throw new StartedWorkoutError(name, 'cambiare «Separa i lati»');
  await db.settings.put({ key: 'separateSides', value: on });
}

/**
 * «Ricarica un modello»: le schede attuali vengono CANCELLATE e sostituite da quelle del modello (id nuovi).
 * Lo storico non si tocca: ogni seduta ha già la sua copia (`day` = id vecchio, `programName`, `plan`).
 * In UNA transazione (o tutto o niente):
 * - bloccata se c'è un allenamento avviato (StartedWorkoutError con il nome della scheda);
 * - le bozze NON avviate (valori scritti senza Inizia) appartengono a schede che spariscono: cancellate;
 * - `templateId` aggiornato.
 * Fuori dalla transazione (non è IndexedDB) resta solo la scheda aperta in `localStorage`: chi chiama la aggiorna;
 * se non ci riesce l'app apre comunque la prima scheda, perché ignora un id che non esiste più.
 */
export async function reloadTemplate(templateId: TemplateId): Promise<Program[]> {
  const programs = programsFromTemplate(templateId);
  await db.transaction('rw', [db.programs, db.settings, db.drafts], async () => {
    const name = await startedProgramName();
    if (name) throw new StartedWorkoutError(name, 'ricaricare un modello');
    await db.drafts.clear();
    await db.programs.clear();
    await db.programs.bulkAdd(programs);
    if (globalThis.__TG_TEST_FAIL_RELOAD__) throw new Error('Ricarica interrotta apposta (prova automatica)');
    await db.settings.put({ key: 'templateId', value: templateId });
  });
  return programs;
}

// ---------- Settimane 1-2 ----------

/** Interruttore in Info: riattivarle azzera data e rinvio (vedi src/logic/phase1.ts). */
export async function setPhase1(on: boolean): Promise<void> {
  await db.settings.bulkPut(Object.entries(phase1Toggle(on)).map(([key, value]) => ({ key: key as keyof Settings, value })));
}

/** Avviso «Disattivarle?» → «Non ancora». */
export async function snoozePhase1(now = new Date()): Promise<void> {
  await db.settings.bulkPut(Object.entries(phase1Snooze(now)).map(([key, value]) => ({ key: key as keyof Settings, value })));
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
  const logs = logsFromDraft(draft, maxSets, sessionId);
  const hasCircuit = !!draft.circuit && draft.circuit.completedRounds > 0;
  if (logs.length === 0 && !hasCircuit) return 0;

  const date = new Date().toISOString();
  await db.transaction('rw', [db.sessions, db.setLogs, db.drafts, db.settings], async () => {
    await db.sessions.add({
      id: sessionId,
      date,
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
    // Settimane 1-2: la data parte dalla prima seduta salvata con l'interruttore attivo
    const p1 = await db.settings.get('phase1');
    const since = await db.settings.get('phase1Since');
    const newSince = phase1SinceOnSave(
      { phase1: (p1?.value as boolean | undefined) ?? DEFAULT_SETTINGS.phase1, phase1Since: (since?.value as string | null | undefined) ?? null },
      date,
    );
    if (newSince) await db.settings.put({ key: 'phase1Since', value: newSince });
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
  // solo le tabelle che servono: schede e impostazioni solo se il backup le contiene
  const tables = [db.sessions, db.setLogs, ...(settings ? [db.settings] : []), ...(programs ? [db.programs] : [])];
  await db.transaction('rw', tables, async () => {
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
