/**
 * Strumenti per le prove della migrazione del database (v1 → v2):
 * - creare nel browser un database v1 "nudo" (come lo lasciava l'app prima della Fase 4-bis);
 * - rileggerlo dopo la migrazione;
 * - calcolare i valori che l'utente vede (storico, precompilazione, e1RM, serie settimanali, indici)
 *   e confrontarli PRIMA/DOPO.
 * Usati da e2e/migrazione.spec.ts (dati inventati) e da e2e/prova-a-secco.spec.ts (dati reali, solo a mano).
 */
import type { Page } from '@playwright/test';
import type { Draft, Session, SetLog } from '../src/db/models';
import type { SettingRow } from '../src/db/migrate';
import { EXERCISES, EXERCISE_BY_ID, catalogExercise } from '../src/program/program';
import { CATALOG_BY_ID } from '../src/catalog/exercises';
import { exerciseCharts, exerciseIndex, groupIndex, MUSCLES, weeklySets } from '../src/logic/charts';
import { buildPrefill, lastSessionSets } from '../src/logic/prefill';
import { progressionHint } from '../src/logic/progression';
import { formatSet } from '../src/logic/format';
import type { Exercise } from '../src/program/types';

export interface V1Data {
  sessions: Session[];
  setLogs: SetLog[];
  drafts: Draft[];
  settings: SettingRow[];
}

export interface RawDb {
  version: number;
  stores: Record<string, unknown[]>;
}

/** Apre una pagina dell'app che NON avvia l'app (stessa origine, quindi stesso IndexedDB). */
export async function openBlank(page: Page) {
  await page.goto('favicon.svg');
}

/**
 * Crea il database v1 con le API di IndexedDB (Dexie versione 1 = versione IndexedDB 10),
 * con le stesse tabelle e gli stessi indici dell'app prima della Fase 4-bis.
 * keepOpen: lascia la connessione aperta (per provare l'avviso "altre schede").
 */
export async function seedV1(page: Page, data: V1Data, keepOpen = false) {
  await openBlank(page);
  await page.evaluate(
    ({ data, keepOpen }) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('teachergym', 10);
        req.onupgradeneeded = () => {
          const db = req.result;
          const sessions = db.createObjectStore('sessions', { keyPath: 'id' });
          sessions.createIndex('date', 'date');
          sessions.createIndex('day', 'day');
          const logs = db.createObjectStore('setLogs', { keyPath: 'id' });
          logs.createIndex('sessionId', 'sessionId');
          logs.createIndex('exerciseId', 'exerciseId');
          db.createObjectStore('drafts', { keyPath: 'day' });
          db.createObjectStore('settings', { keyPath: 'key' });
        };
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['sessions', 'setLogs', 'drafts', 'settings'], 'readwrite');
          for (const s of data.sessions) tx.objectStore('sessions').put(s);
          for (const l of data.setLogs) tx.objectStore('setLogs').put(l);
          for (const d of data.drafts) tx.objectStore('drafts').put(d);
          for (const r of data.settings) tx.objectStore('settings').put(r);
          tx.oncomplete = () => {
            if (keepOpen) (window as unknown as { __v1db: IDBDatabase }).__v1db = db;
            else db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { data, keepOpen },
  );
}

/** Rilegge tutto il database così com'è (senza Dexie e senza aggiornarlo). */
export async function readDb(page: Page): Promise<RawDb> {
  return page.evaluate(
    () =>
      new Promise<RawDb>((resolve, reject) => {
        const req = indexedDB.open('teachergym');
        req.onerror = () => reject(req.error);
        req.onsuccess = async () => {
          const db = req.result;
          const stores: Record<string, unknown[]> = {};
          for (const name of Array.from(db.objectStoreNames)) {
            stores[name] = await new Promise<unknown[]>((res, rej) => {
              const r = db.transaction(name, 'readonly').objectStore(name).getAll();
              r.onsuccess = () => res(r.result);
              r.onerror = () => rej(r.error);
            });
          }
          const version = db.version;
          db.close();
          resolve({ version, stores });
        };
      }),
  );
}

// ---------- valori calcolati (quelli che l'utente vede) ----------

const exerciseFor = (id: string): Exercise | undefined => EXERCISE_BY_ID[id] ?? (CATALOG_BY_ID[id] ? catalogExercise(id) : undefined);

/** Campi della seduta che esistevano già nella v1 (la migrazione non deve cambiarli). */
const sessionV1 = (s: Session) => ({
  id: s.id, date: s.date, day: s.day, phase1: s.phase1, notes: s.notes, programVersion: s.programVersion,
  circuit: s.circuit ?? null, durationSec: s.durationSec ?? null,
});
const logV1 = (l: SetLog) => ({
  id: l.id, sessionId: l.sessionId, exerciseId: l.exerciseId, setIndex: l.setIndex,
  load: l.load ?? null, reps: l.reps ?? null, seconds: l.seconds ?? null, extra: l.extra ?? false, confirmed: l.confirmed,
});

export function computeStats(sessions: Session[], logs: SetLog[]) {
  const ids = [...new Set([...EXERCISES.map((e) => e.id), ...logs.map((l) => l.exerciseId)])].sort();
  const perExercise: Record<string, unknown> = {};
  for (const id of ids) {
    const ex = exerciseFor(id);
    if (!ex) {
      perExercise[id] = 'esercizio sconosciuto';
      continue;
    }
    const last = lastSessionSets(id, sessions, logs);
    const planned = last.filter((l) => !l.extra);
    const charts = exerciseCharts(ex, sessions, logs);
    perExercise[id] = {
      // e1RM, carico, ripetizioni/secondi, gradini (grafici + riepilogo "Partenza → Attuale")
      charts,
      index: exerciseIndex(ex, sessions, logs),
      // precompilazione: serie piene e "Settimane 1-2"
      prefill: buildPrefill(planned, ex.sets),
      prefillPhase1: buildPrefill(planned, Math.min(ex.sets, 2)),
      hint: progressionHint(ex, planned),
      last: last.map(logV1),
    };
  }
  const weekly = Object.fromEntries([...weeklySets(sessions, logs, EXERCISES)].sort(([a], [b]) => a.localeCompare(b)));
  const groups = Object.fromEntries(MUSCLES.map((m) => [m, groupIndex(m, sessions, logs, EXERCISES)]));
  const history = [...sessions]
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .map((s) => ({
      ...sessionV1(s),
      sets: logs
        .filter((l) => l.sessionId === s.id)
        .sort((a, b) => a.exerciseId.localeCompare(b.exerciseId) || a.setIndex - b.setIndex || a.id.localeCompare(b.id))
        .map(logV1),
    }));
  return { counts: { sessions: sessions.length, logs: logs.length, exercises: ids.length, weeks: Object.keys(weekly).length }, history, perExercise, weekly, groups };
}

/** "Ultima volta: …" come lo scrive la schermata della seduta. */
export function expectedLastText(exerciseId: string, sessions: Session[], logs: SetLog[]): string | null {
  const ex = EXERCISE_BY_ID[exerciseId];
  const last = lastSessionSets(exerciseId, sessions, logs);
  if (!last.length) return null;
  const date = sessions.find((s) => s.id === last[0].sessionId)!.date;
  const d = new Date(date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Rome' });
  return `Ultima volta: ${d} · ${last.map((l) => formatSet(ex, l) + (l.extra ? ' (extra)' : '')).join(' · ')}`;
}

/**
 * Differenze tra due valori (percorso: prima → dopo). Al massimo `max` righe.
 * NB: i valori vengono stampati; per i dati reali si mostrano solo i percorsi (showValues = false).
 */
export function diff(a: unknown, b: unknown, path = '', out: string[] = [], showValues = true, max = 50): string[] {
  if (out.length >= max) return out;
  const show = (v: unknown) => (showValues ? JSON.stringify(v) : typeof v);
  if (Object.is(a, b)) return out;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') {
    out.push(`${path || '(radice)'}: prima ${show(a)} → dopo ${show(b)}`);
    return out;
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    out.push(`${path}: tipo diverso`);
    return out;
  }
  const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
  for (const k of keys) diff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], path ? `${path}.${k}` : k, out, showValues, max);
  return out;
}
