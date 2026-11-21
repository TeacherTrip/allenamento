import type { Settings } from './models';
import { DEFAULT_SETTINGS } from './models';
import { CARDIO_PROTOCOLS } from '../program/cardio';

/*
 * Dati non validi trovati nel database (correzione del 21/11/2026, punto f). Funzioni PURE: tests/sanitize.test.ts.
 * - Impostazione non valida → si usa il valore predefinito (il database non viene scritto).
 * - Bozza (seduta in corso) non valida → si scarta (src/db/db.ts, discardInvalidDrafts).
 * - Le sedute salvate non si toccano mai.
 * Ciò che viene scartato resta in memoria (startupRepairs) e si può scaricare con un tocco.
 */

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isDate = (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const dateOrNull = (v: unknown) => v === null || isDate(v);

/** Valori ammessi per ogni impostazione conosciuta. */
const SETTING_RULES: { [K in keyof Settings]: (v: unknown) => boolean } = {
  phase1: (v) => typeof v === 'boolean',
  cardioProtocol: (v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) < CARDIO_PROTOCOLS.length,
  lastBackupAt: dateOrNull,
  sessionsSinceBackup: (v) => Number.isInteger(v) && (v as number) >= 0,
  autoRest: (v) => typeof v === 'boolean',
  userName: (v) => typeof v === 'string',
  startSide: (v) => v === 'left' || v === 'right',
  separateSides: (v) => typeof v === 'boolean',
  templateId: (v) => v === null || v === 'm1' || v === 'm2',
  onboarded: (v) => typeof v === 'boolean',
  phase1Since: dateOrNull,
  phase1SnoozedUntil: dateOrNull,
};

export interface InvalidSetting {
  key: string;
  value: unknown;
}

/** Impostazioni dalle righe del database: le non valide tornano al predefinito e vengono elencate. */
export function sanitizeSettings(rows: { key: string; value: unknown }[]): { settings: Settings; invalid: InvalidSetting[] } {
  const settings: Settings = { ...DEFAULT_SETTINGS };
  const invalid: InvalidSetting[] = [];
  for (const { key, value } of rows) {
    const rule = SETTING_RULES[key as keyof Settings];
    if (!rule) continue; // chiave sconosciuta (es. versione futura): ignorata
    if (rule(value)) (settings as unknown as Record<string, unknown>)[key] = value;
    else invalid.push({ key, value });
  }
  return { settings, invalid };
}

const isEntry = (e: unknown) =>
  e === null ||
  (isObj(e) &&
    ['load', 'reps', 'seconds'].every((f) => e[f] === undefined || typeof e[f] === 'string') &&
    ['pending', 'leftDone'].every((f) => e[f] === undefined || typeof e[f] === 'boolean'));

const isSetMap = (v: unknown) => isObj(v) && Object.values(v).every((arr) => Array.isArray(arr) && arr.every(isEntry));

const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

/** La bozza ha la forma che l'app sa leggere? (altrimenti va scartata) */
export function validDraft(d: unknown): boolean {
  if (!isObj(d) || typeof d.day !== 'string' || !isSetMap(d.sets)) return false;
  if (d.extra !== undefined && !isSetMap(d.extra)) return false;
  if (d.notes !== undefined && typeof d.notes !== 'string') return false;
  if (d.startedAt !== undefined && !isDate(d.startedAt)) return false;
  if (d.circuitRun !== undefined && !(isObj(d.circuitRun) && isNum(d.circuitRun.protocol) && isNum(d.circuitRun.startedAt) && isNum(d.circuitRun.pausedMs)))
    return false;
  if (d.circuit !== undefined && !(isObj(d.circuit) && isNum(d.circuit.protocol) && isNum(d.circuit.completedRounds))) return false;
  return true;
}

// ---------- ciò che è stato scartato all'avvio (solo in memoria) ----------

export interface StartupRepairs {
  /** Bozze scartate, così com'erano nel database. */
  drafts: unknown[];
  /** Nomi delle schede delle bozze scartate (per l'avviso). */
  draftNames: string[];
  settings: InvalidSetting[];
}

let repairs: StartupRepairs = { drafts: [], draftNames: [], settings: [] };
const listeners = new Set<() => void>();

export function setStartupRepairs(r: StartupRepairs): void {
  repairs = r;
  listeners.forEach((l) => l());
}

/** Avvisa quando il controllo all'avvio (in secondo piano) ha finito. Restituisce la funzione per smettere. */
export function onStartupRepairs(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getStartupRepairs(): StartupRepairs {
  return repairs;
}
