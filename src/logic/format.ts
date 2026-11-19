import { PUSHUP_LEVELS } from '../program/program';
import { bandLabel } from '../program/bands';
import type { Exercise } from '../program/types';
import type { SetValues } from '../db/models';
import { fmtNum } from './values';

/** "14 kg × 10 /lato", "elastico 20 × 12", "L2 Schienale divano × 9", "30 s". */
export function formatSet(ex: Exercise, v: SetValues): string {
  const side = ex.unilateral ? ' /lato' : '';
  const reps = v.reps != null ? `${v.reps}${side}` : '?';
  switch (ex.metric) {
    case 'kg':
      return `${v.load != null ? fmtNum(v.load) + ' kg' : '? kg'} × ${reps}`;
    case 'band':
      return `${v.load != null ? bandLabel(ex.bandDirection ?? 'resistance', v.load) : 'elastico ?'} × ${reps}`;
    case 'level':
      return `${v.load != null ? `L${v.load} ${PUSHUP_LEVELS[v.load] ?? ''}`.trim() : 'L?'} × ${reps}`;
    case 'bodyweight':
      return `${reps} reps`;
    case 'time':
      return `${v.seconds ?? '?'} s${side}`;
  }
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtRange(ex: Exercise): string {
  const [a, b] = ex.repRange;
  const r = a === b ? `${a}` : `${a}-${b}`;
  return `${r}${ex.metric === 'time' ? ' s' : ''}${ex.unilateral ? ' /lato' : ''}`;
}
