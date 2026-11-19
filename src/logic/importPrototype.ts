import { EXERCISE_BY_ID, PROGRAM_VERSION } from '../program/program';
import { bandOptions } from '../program/bands';
import type { Day, Exercise } from '../program/types';
import type { Session, SetLog, SetValues } from '../db/models';
import { parseNum } from './values';

/**
 * Import dal prototipo scheda-casa.html (chiave localStorage "schedaCasa_v1"):
 * { sessions: [{ id, day, date, entries: { <exerciseId>: [{ l, r }] }, note }] }
 * Nel prototipo "l" è testo libero: lo convertiamo dove possibile,
 * altrimenti lo riportiamo nelle note della seduta (mai inventare valori).
 */

interface ProtoSet { l?: string; r?: string }
interface ProtoSession {
  id: number | string;
  day: string;
  date: string;
  entries?: Record<string, (ProtoSet | null)[]>;
  note?: string;
}

export interface ProtoImportResult {
  sessions: Session[];
  setLogs: SetLog[];
  warnings: string[];
}

const numbers = (s: string) => (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((x) => Number(x.replace(',', '.')));

const LEVEL_WORDS: [RegExp, number][] = [
  [/cucina|tavolo/, 1],
  [/schienale|bracciolo/, 2],
  [/seduta/, 3],
  [/gradino/, 4],
  [/terra|pavimento/, 5],
];

/** Converte il testo libero del carico. undefined = non interpretabile. */
export function parseProtoLoad(ex: Exercise, raw: string): number | undefined {
  const s = raw.trim().toLowerCase();
  if (!s) return undefined;
  const nums = numbers(s);

  if (ex.metric === 'kg') {
    if (nums.length === 1) return nums[0];
    if (nums.length === 2 && /[x×*]/.test(s)) return nums[1]; // "2 x 10" = due manubri da 10
    return undefined;
  }
  if (ex.metric === 'band') {
    const dir = ex.bandDirection ?? 'resistance';
    const allowed = bandOptions(dir).map((o) => o.value);
    let v: number | undefined;
    if (dir === 'assistance' && /nessun|senza/.test(s)) v = 0;
    else if (nums.length === 1) v = nums[0];
    else if (nums.length > 1 && s.includes('+')) v = nums.reduce((a, b) => a + b, 0);
    return v != null && allowed.includes(v) ? v : undefined;
  }
  if (ex.metric === 'level') {
    if (nums.length === 1 && nums[0] >= 1 && nums[0] <= 5 && Number.isInteger(nums[0])) return nums[0];
    const hits = LEVEL_WORDS.filter(([re]) => re.test(s)).map(([, n]) => n);
    return hits.length === 1 ? hits[0] : undefined;
  }
  return undefined;
}

export function convertPrototype(obj: unknown): ProtoImportResult {
  const o = obj as { sessions?: ProtoSession[] };
  if (!o || !Array.isArray(o.sessions)) throw new Error('Il file non è un backup del prototipo.');

  const sessions: Session[] = [];
  const setLogs: SetLog[] = [];
  const warnings: string[] = [];

  for (const ps of o.sessions) {
    if (!ps || !['A', 'B', 'C'].includes(ps.day) || Number.isNaN(Date.parse(ps.date))) {
      warnings.push('Una seduta del prototipo non è valida ed è stata saltata.');
      continue;
    }
    const sessionId = `proto-${ps.id}`;
    const notes: string[] = ps.note ? [ps.note] : [];

    for (const [exId, arr] of Object.entries(ps.entries ?? {})) {
      const ex = EXERCISE_BY_ID[exId];
      if (!ex) {
        warnings.push(`Esercizio sconosciuto "${exId}" saltato.`);
        continue;
      }
      (arr ?? []).forEach((set, i) => {
        if (!set) return;
        const l = (set.l ?? '').trim();
        const r = (set.r ?? '').trim();
        if (!l && !r) return;
        const v: SetValues = {};
        const rn = r ? parseNum(numbers(r)[0]?.toString()) : undefined;
        if (rn != null) {
          if (ex.metric === 'time') v.seconds = Math.round(rn);
          else v.reps = Math.round(rn);
        }
        if (l) {
          const load = ex.metric === 'bodyweight' || ex.metric === 'time' ? undefined : parseProtoLoad(ex, l);
          if (load != null) v.load = load;
          else notes.push(`[Import] ${ex.name} S${i + 1}: "${l}" non interpretato`);
        }
        if (r && rn == null) notes.push(`[Import] ${ex.name} S${i + 1}: ripetizioni "${r}" non interpretate`);
        if (v.load == null && v.reps == null && v.seconds == null) return;
        setLogs.push({ id: `${sessionId}-${exId}-${i}`, sessionId, exerciseId: exId, setIndex: i, confirmed: true, ...v });
      });
    }

    sessions.push({
      id: sessionId,
      date: new Date(ps.date).toISOString(),
      day: ps.day as Day,
      phase1: false,
      notes: notes.join('\n'),
      programVersion: PROGRAM_VERSION,
    });
  }

  const unparsed = sessions.reduce((n, s) => n + (s.notes.match(/\[Import\]/g)?.length ?? 0), 0);
  if (unparsed) warnings.push(`${unparsed} valori non interpretati: li trovi nelle note delle sedute.`);
  return { sessions, setLogs, warnings };
}
