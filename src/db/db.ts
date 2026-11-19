import Dexie, { type Table } from 'dexie';
import type { Draft, Session, SetLog, Settings } from './models';
import { DEFAULT_SETTINGS } from './models';
import type { Day } from '../program/types';
import { EXERCISE_BY_ID, PROGRAM_VERSION } from '../program/program';
import { entryToValues, hasValues, isComplete, newId } from '../logic/values';

interface SettingRow {
  key: keyof Settings;
  value: unknown;
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

  constructor() {
    super('teachergym');
    this.version(1).stores({
      sessions: 'id, date, day',
      setLogs: 'id, sessionId, exerciseId',
      drafts: 'day',
      settings: 'key',
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
  durationSec?: number,
): Promise<number> {
  const sessionId = newId();
  const logs: SetLog[] = [];
  for (const [exerciseId, arr] of Object.entries(draft.sets)) {
    const ex = EXERCISE_BY_ID[exerciseId];
    if (!ex) continue;
    const limit = maxSets[exerciseId] ?? arr.length;
    arr.slice(0, limit).forEach((entry, setIndex) => {
      if (!entry || entry.pending) return; // non confermata
      const v = entryToValues(entry);
      if (!isComplete(ex.metric, v)) return;
      logs.push({ id: newId(), sessionId, exerciseId, setIndex, confirmed: true, ...v });
    });
  }
  const hasCircuit = !!draft.circuit && draft.circuit.completedRounds > 0;
  if (logs.length === 0 && !hasCircuit) return 0;

  await db.transaction('rw', [db.sessions, db.setLogs, db.drafts, db.settings], async () => {
    await db.sessions.add({
      id: sessionId,
      date: new Date().toISOString(),
      day: draft.day,
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

/** Sostituisce TUTTI i dati con quelli del backup. */
export async function replaceAllData(sessions: Session[], setLogs: SetLog[], settings?: Settings): Promise<void> {
  await db.transaction('rw', [db.sessions, db.setLogs, db.settings], async () => {
    await db.setLogs.clear();
    await db.sessions.clear();
    await db.sessions.bulkAdd(sessions);
    await db.setLogs.bulkAdd(setLogs);
    if (settings) {
      for (const [key, value] of Object.entries(settings)) {
        await db.settings.put({ key: key as keyof Settings, value });
      }
    }
  });
}

/** Aggiunge sedute (es. dal prototipo) saltando quelle già presenti. Restituisce quante ne ha aggiunte. */
export async function mergeSessions(sessions: Session[], setLogs: SetLog[]): Promise<number> {
  let added = 0;
  await db.transaction('rw', [db.sessions, db.setLogs], async () => {
    for (const s of sessions) {
      if (await db.sessions.get(s.id)) continue;
      await db.sessions.add(s);
      await db.setLogs.bulkAdd(setLogs.filter((l) => l.sessionId === s.id));
      added++;
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
