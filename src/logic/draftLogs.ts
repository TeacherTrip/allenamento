import type { Draft, DraftEntry, SetLog } from '../db/models';
import { exerciseById } from '../program/program';
import { entryToValues, isComplete, newId } from './values';

/**
 * Bozza → serie da salvare (funzione PURA, provata in tests/lati.test.ts).
 * Solo le serie confermate e COMPLETE. Una serie è UNA riga con i valori «per lato»,
 * sia con «Separa i lati» acceso ([Sx] poi [Dx]: la serie è confermata solo dopo il secondo lato)
 * sia spento (un solo ✓): storico, e1RM, grafici e serie settimanali la contano allo stesso modo.
 * `maxSets` = quante serie prevede ora la scheda per esercizio; le extra sono numerate di seguito.
 */
export function logsFromDraft(
  draft: Pick<Draft, 'sets' | 'extra'>,
  maxSets: Record<string, number>,
  sessionId: string,
  makeId: () => string = newId,
): SetLog[] {
  const logs: SetLog[] = [];
  const add = (exerciseId: string, entries: (DraftEntry | null)[], firstIndex: number, extra: boolean) => {
    const ex = exerciseById(exerciseId);
    if (!ex) return;
    entries.forEach((entry, k) => {
      if (!entry || entry.pending) return; // non confermata (anche: solo il primo lato fatto)
      const v = entryToValues(entry);
      if (!isComplete(ex.metric, v)) return;
      logs.push({ id: makeId(), sessionId, exerciseId, setIndex: firstIndex + k, confirmed: true, ...v, ...(extra ? { extra } : {}) });
    });
  };
  for (const [exerciseId, arr] of Object.entries(draft.sets)) {
    add(exerciseId, arr.slice(0, maxSets[exerciseId] ?? arr.length), 0, false);
  }
  for (const [exerciseId, arr] of Object.entries(draft.extra ?? {})) {
    add(exerciseId, arr, maxSets[exerciseId] ?? 0, true);
  }
  return logs;
}
