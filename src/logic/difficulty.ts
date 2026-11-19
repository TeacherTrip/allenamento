import { bandOptions } from '../program/bands';
import type { Exercise } from '../program/types';
import type { SetValues } from '../db/models';

/** Massimale stimato (formula di Epley). */
export function e1rm(kg: number, reps: number): number {
  return kg * (1 + reps / 30);
}

/**
 * Gradino di difficoltà del carico (0 = più facile).
 * level: 1→0 … 5→4. band: posizione nella scala della sua direzione
 * (assistance 30/20/10/0 → 0/1/2/3; resistance 10/20/…/60 → 0/1/…/5).
 */
export function difficultyStep(ex: Exercise, load: number | undefined): number {
  if (load == null) return 0;
  if (ex.metric === 'level') return Math.max(0, load - 1);
  if (ex.metric === 'band') {
    const dir = ex.bandDirection ?? 'resistance';
    const idx = bandOptions(dir).findIndex((o) => o.value === load);
    if (idx >= 0) return idx;
    // valore fuori scala: stima lineare a passi di 10 kg
    return dir === 'assistance' ? Math.max(0, (30 - load) / 10) : Math.max(0, load / 10 - 1);
  }
  return 0;
}

/** Il carico `a` è più difficile di `b`? (tiene conto della direzione degli elastici) */
export function isHarder(ex: Exercise, a: number, b: number): boolean {
  return difficultyStep(ex, a) > difficultyStep(ex, b);
}

/** Punteggio di una serie, usato per l'indice di progressione. */
export function setScore(ex: Exercise, v: SetValues): number {
  switch (ex.metric) {
    case 'kg':
      return v.load != null && v.reps != null ? e1rm(v.load, v.reps) : 0;
    case 'band':
    case 'level':
      return (v.reps ?? 0) * (1 + 0.15 * difficultyStep(ex, v.load));
    case 'bodyweight':
      return v.reps ?? 0;
    case 'time':
      return v.seconds ?? 0;
  }
}

/** Punteggio della serie migliore. */
export function bestScore(ex: Exercise, sets: SetValues[]): number {
  return sets.reduce((m, s) => Math.max(m, setScore(ex, s)), 0);
}
