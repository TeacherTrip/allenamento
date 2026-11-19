import type { Session, SetLog, SetValues } from '../db/models';

/** Serie dell'ultima seduta (per data) in cui l'esercizio è stato fatto, ordinate. */
export function lastSessionSets(exerciseId: string, sessions: Session[], logs: SetLog[]): SetLog[] {
  const dateOf = new Map(sessions.map((s) => [s.id, s.date]));
  let bestId: string | null = null;
  let bestDate = '';
  for (const l of logs) {
    if (l.exerciseId !== exerciseId) continue;
    const d = dateOf.get(l.sessionId);
    if (d && d > bestDate) {
      bestDate = d;
      bestId = l.sessionId;
    }
  }
  if (!bestId) return [];
  return logs
    .filter((l) => l.sessionId === bestId && l.exerciseId === exerciseId)
    .sort((a, b) => a.setIndex - b.setIndex);
}

/**
 * Valori precompilati per `count` serie: serie per serie dall'ultima volta;
 * se l'ultima volta le serie erano meno, le mancanti copiano l'ultima disponibile.
 */
export function buildPrefill(last: SetLog[], count: number): (SetValues | undefined)[] {
  const out: (SetValues | undefined)[] = [];
  for (let i = 0; i < count; i++) {
    const src = last[i] ?? last[last.length - 1];
    out.push(src ? pick(src) : undefined);
  }
  return out;
}

function pick(l: SetValues): SetValues {
  const v: SetValues = {};
  if (l.load != null) v.load = l.load;
  if (l.reps != null) v.reps = l.reps;
  if (l.seconds != null) v.seconds = l.seconds;
  return v;
}
