import type { DraftEntry, SetValues } from '../db/models';

/** "12,5" → 12.5; vuoto o non numerico → undefined. */
export function parseNum(s: string | undefined | null): number | undefined {
  if (s == null) return undefined;
  const t = String(s).trim().replace(',', '.');
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** 12.5 → "12,5" (formato italiano). */
export function fmtNum(n: number | undefined): string {
  if (n == null) return '';
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

export function entryToValues(e: DraftEntry): SetValues {
  const v: SetValues = {};
  const load = parseNum(e.load);
  const reps = parseNum(e.reps);
  const seconds = parseNum(e.seconds);
  if (load != null) v.load = load;
  if (reps != null) v.reps = Math.round(reps);
  if (seconds != null) v.seconds = Math.round(seconds);
  return v;
}

export function valuesToEntry(v: SetValues | undefined): DraftEntry {
  const e: DraftEntry = {};
  if (v?.load != null) e.load = fmtNum(v.load);
  if (v?.reps != null) e.reps = String(v.reps);
  if (v?.seconds != null) e.seconds = String(v.seconds);
  return e;
}

export function hasValues(v: SetValues): boolean {
  return v.load != null || v.reps != null || v.seconds != null;
}

/** Id univoci senza crypto.randomUUID (non disponibile su http in Wi-Fi). */
export function newId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}
