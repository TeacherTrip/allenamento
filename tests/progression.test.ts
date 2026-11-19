import { describe, expect, it } from 'vitest';
import { progressionHint, reachedTop } from '../src/logic/progression';
import { EXERCISE_BY_ID } from '../src/program/program';

const gsq = EXERCISE_BY_ID.gsq; // kg, 8-12
const pull = EXERCISE_BY_ID.pull; // band assistance, 3-6
const lpd = EXERCISE_BY_ID.lpd; // band resistance, 12-15
const sp = EXERCISE_BY_ID.sp; // time, 20-40

describe('reachedTop', () => {
  it('vero solo se TUTTE le serie arrivano al massimo del range', () => {
    expect(reachedTop(gsq, [{ load: 14, reps: 12 }, { load: 14, reps: 12 }])).toBe(true);
    expect(reachedTop(gsq, [{ load: 14, reps: 12 }, { load: 14, reps: 11 }])).toBe(false);
    expect(reachedTop(gsq, [])).toBe(false);
  });
  it('per metric time usa i secondi', () => {
    expect(reachedTop(sp, [{ seconds: 40 }, { seconds: 45 }])).toBe(true);
    expect(reachedTop(sp, [{ seconds: 40 }, { seconds: 30 }])).toBe(false);
  });
});

describe('progressionHint', () => {
  it('kg: aumenta carico o variante', () => {
    expect(progressionHint(gsq, [{ load: 14, reps: 12 }])).toBe('Aumenta carico o variante');
    expect(progressionHint(gsq, [{ load: 14, reps: 10 }])).toBeNull();
  });

  it('ASSISTANCE: suggerisce un elastico più LEGGERO', () => {
    expect(progressionHint(pull, [{ load: 30, reps: 6 }, { load: 30, reps: 6 }])).toMatch(/più leggero/);
  });
  it('ASSISTANCE senza elastico: passa a una variante', () => {
    expect(progressionHint(pull, [{ load: 0, reps: 6 }])).toMatch(/variante/);
  });

  it('RESISTANCE: suggerisce un elastico più PESANTE', () => {
    expect(progressionHint(lpd, [{ load: 20, reps: 15 }, { load: 20, reps: 15 }])).toMatch(/più pesante/);
  });
  it('RESISTANCE al massimo (60): passa a una variante', () => {
    expect(progressionHint(lpd, [{ load: 60, reps: 15 }])).toMatch(/variante/);
  });
});
