import { PUSHUP_LEVELS } from '../program/program';
import { bandLabel } from '../program/bands';
import type { Exercise } from '../program/types';
import type { SetValues } from '../db/models';
import { fmtNum } from './values';

/** "14 kg × 10 per lato", "elastico 20 × 12", "L2 Schienale divano × 9", "30 s", "12 reps per lato". */
export function formatSet(ex: Exercise, v: SetValues): string {
  const side = ex.unilateral ? ' per lato' : '';
  const reps = v.reps != null ? `${v.reps}${side}` : '?';
  switch (ex.metric) {
    case 'kg':
      return `${v.load != null ? fmtNum(v.load) + ' kg' : '? kg'} × ${reps}`;
    case 'band':
      return `${v.load != null ? bandLabel(ex.bandDirection ?? 'resistance', v.load) : 'elastico ?'} × ${reps}`;
    case 'level':
      return `${v.load != null ? `L${v.load} ${PUSHUP_LEVELS[v.load] ?? ''}`.trim() : 'L?'} × ${reps}`;
    case 'bodyweight':
      return `${v.reps ?? '?'} reps${side}`;
    case 'time':
      return `${v.seconds ?? '?'} s${side}`;
  }
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Durata trascorsa: "23:41" oppure "1:02:03". */
export function fmtElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(s % 60)}` : `${p(m)}:${p(s % 60)}`;
}

/** Secondi trascorsi dall'inizio (mai negativi). */
export function durationSec(startedAt: string, now = Date.now()): number {
  return Math.max(0, Math.round((now - Date.parse(startedAt)) / 1000));
}

/** 2820 → "47 min"; 4500 → "1 h 15 min". */
export function fmtDuration(sec: number): string {
  const min = Math.round(sec / 60);
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
}

export function fmtRange(ex: Exercise): string {
  const [a, b] = ex.repRange;
  const r = a === b ? `${a}` : `${a}-${b}`;
  return `${r}${ex.metric === 'time' ? ' s' : ''}${ex.unilateral ? ' per lato' : ''}`;
}

/** Spazio non separabile: il browser non va a capo in quel punto. */
export const NBSP = '\u00a0';

/**
 * Testo da mostrare senza a capo sbagliati: numero + unità ("14 kg", "30 s", "7 esercizi", "2 serie"),
 * "· 7", "2 × 10", "RIR 3", "✓" e "fino al 05/11/2026" con le parole vicine restano insieme. Usata solo per mostrare: i dati e le funzioni di formato restano con spazi normali.
 */
export function nb(text: string): string {
  return text
    .replace(/(\d) (?=(?:kg|s|min|h|esercizi|esercizio|serie|reps|rip\.|ripetizioni|round|settimane|sedute|seduta)(?![\p{L}]))/gu, `$1${NBSP}`)
    .replace(/RIR (?=\d)/g, `RIR${NBSP}`)
    .replace(/ × /g, `${NBSP}×${NBSP}`)
    .replace(/· (?=\d)/g, `·${NBSP}`)
    .replace(/ ✓/g, `${NBSP}✓`)
    .replace(/✓ (?=\p{L})/gu, `✓${NBSP}`)
    .replace(/fino al /g, `fino${NBSP}al `)
    .replace(/(al) (?=\d{2}\/\d{2}\/\d{4})/g, `$1${NBSP}`);
}
