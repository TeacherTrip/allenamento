import { bandOptions } from '../program/bands';
import type { Exercise } from '../program/types';
import type { SetValues } from '../db/models';

/** Nell'ultima seduta ha raggiunto il massimo del range su tutte le serie fatte? */
export function reachedTop(ex: Exercise, lastSets: SetValues[]): boolean {
  if (lastSets.length === 0) return false;
  const top = ex.repRange[1];
  return lastSets.every((s) => {
    const v = ex.metric === 'time' ? s.seconds : s.reps;
    return v != null && v >= top;
  });
}

/** Testo del suggerimento di progressione, o null se non serve. */
export function progressionHint(ex: Exercise, lastSets: SetValues[]): string | null {
  if (!reachedTop(ex, lastSets)) return null;
  const loads = lastSets.map((s) => s.load).filter((x): x is number => x != null);

  switch (ex.metric) {
    case 'kg':
      return 'Aumenta carico o variante';
    case 'level': {
      const lv = loads.length ? Math.min(...loads) : 0;
      return lv >= 5 ? 'Appoggio a terra raggiunto: passa a una variante più difficile' : "Passa all'appoggio successivo (più basso)";
    }
    case 'band': {
      const dir = ex.bandDirection ?? 'resistance';
      const opts = bandOptions(dir);
      const hardest = opts[opts.length - 1].value;
      // carico "più facile" usato nell'ultima seduta
      const steps = loads.map((l) => opts.findIndex((o) => o.value === l));
      const atHardest = loads.length > 0 && loads.every((l) => l === hardest);
      if (atHardest) return 'Elastico al massimo della scala: passa a una variante più difficile';
      if (steps.length === 0) return 'Aumenta carico o variante';
      return dir === 'assistance'
        ? 'Usa un elastico più leggero (meno assistenza)'
        : 'Usa un elastico più pesante';
    }
    case 'bodyweight':
    case 'time':
      return 'Aumenta la difficoltà o passa a una variante';
  }
}
