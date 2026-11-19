import { describe, expect, it } from 'vitest';
import { bestScore, difficultyStep, e1rm, isHarder, setScore } from '../src/logic/difficulty';
import { EXERCISE_BY_ID } from '../src/program/program';

const pull = EXERCISE_BY_ID.pull; // assistance
const lpd = EXERCISE_BY_ID.lpd; // resistance
const pu = EXERCISE_BY_ID.pu; // level

describe('configurazione elastici', () => {
  it('ogni esercizio band ha una direzione', () => {
    expect(pull.bandDirection).toBe('assistance');
    expect(lpd.bandDirection).toBe('resistance');
    expect(EXERCISE_BY_ID.pa.bandDirection).toBe('resistance');
  });
});

describe('e1RM (Epley)', () => {
  it('14 kg × 12 = 19,6', () => {
    expect(e1rm(14, 12)).toBeCloseTo(19.6, 5);
  });
});

describe('direzione ASSISTANCE (trazioni): elastico più leggero = più difficile', () => {
  it('gradini 30/20/10/nessuno = 0/1/2/3', () => {
    expect([30, 20, 10, 0].map((v) => difficultyStep(pull, v))).toEqual([0, 1, 2, 3]);
  });
  it('elastico 10 è più difficile di 30', () => {
    expect(isHarder(pull, 10, 30)).toBe(true);
    expect(isHarder(pull, 30, 10)).toBe(false);
  });
  it('a parità di reps, meno assistenza = punteggio più alto', () => {
    expect(setScore(pull, { load: 20, reps: 5 })).toBeGreaterThan(setScore(pull, { load: 30, reps: 5 }));
    expect(setScore(pull, { load: 30, reps: 5 })).toBeCloseTo(5, 5);
    expect(setScore(pull, { load: 0, reps: 5 })).toBeCloseTo(5 * 1.45, 5);
  });
});

describe('direzione RESISTANCE (lat pulldown): elastico più pesante = più difficile', () => {
  it('gradini 10/20/30/40/50/60 = 0..5 (combinazioni comprese)', () => {
    expect([10, 20, 30, 40, 50, 60].map((v) => difficultyStep(lpd, v))).toEqual([0, 1, 2, 3, 4, 5]);
  });
  it('elastico 30 è più difficile di 10', () => {
    expect(isHarder(lpd, 30, 10)).toBe(true);
    expect(isHarder(lpd, 10, 30)).toBe(false);
  });
  it('a parità di reps, più resistenza = punteggio più alto', () => {
    expect(setScore(lpd, { load: 50, reps: 12 })).toBeGreaterThan(setScore(lpd, { load: 20, reps: 12 }));
    expect(setScore(lpd, { load: 20, reps: 12 })).toBeCloseTo(12 * 1.15, 5);
  });
});

describe('side plank (metric time)', () => {
  const sp = EXERCISE_BY_ID.sp;
  it('è a tempo e per lato', () => {
    expect(sp.metric).toBe('time');
    expect(sp.unilateral).toBe(true);
  });
  it('l’indice usa i secondi, non le ripetizioni', () => {
    expect(setScore(sp, { seconds: 35 })).toBe(35);
    expect(setScore(sp, { reps: 35 })).toBe(0);
    expect(bestScore(sp, [{ seconds: 30 }, { seconds: 40 }])).toBe(40);
  });
});

describe('livelli push-up', () => {
  it('livello 1→5 = gradino 0→4; livello più alto vince anche con meno reps', () => {
    expect(difficultyStep(pu, 1)).toBe(0);
    expect(difficultyStep(pu, 5)).toBe(4);
    expect(setScore(pu, { load: 3, reps: 10 })).toBeCloseTo(13, 5);
    // 9 × 1,30 = 11,7 > 10 × 1,15 = 11,5
    expect(setScore(pu, { load: 3, reps: 9 })).toBeGreaterThan(setScore(pu, { load: 2, reps: 10 }));
  });
});
