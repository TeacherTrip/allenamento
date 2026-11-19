import { describe, expect, it } from 'vitest';
import {
  PREP_MS,
  type CircuitRun,
  circuitElapsed,
  circuitPosition,
  circuitTotalMs,
  exerciseIndexForRound,
  pauseRun,
  resumeRun,
  shownExerciseIndex,
} from '../src/logic/circuit';
import { CARDIO_PROTOCOLS } from '../src/program/cardio';

const P = { label: 'prova', rounds: 3, workSec: 30, restSec: 20 };
const s = (n: number) => n * 1000;

describe('circuitPosition', () => {
  it('preparazione di 5 s prima del round 1', () => {
    expect(circuitPosition(P, 0)).toMatchObject({ phase: 'prep', round: 0, remainingMs: PREP_MS, completedRounds: 0 });
    expect(circuitPosition(P, s(4.9)).phase).toBe('prep');
  });

  it('lavoro → pausa → lavoro, con round e tempo restante', () => {
    expect(circuitPosition(P, PREP_MS)).toMatchObject({ phase: 'work', round: 1, remainingMs: s(30), completedRounds: 0 });
    expect(circuitPosition(P, PREP_MS + s(30))).toMatchObject({ phase: 'rest', round: 1, remainingMs: s(20), completedRounds: 1 });
    expect(circuitPosition(P, PREP_MS + s(50))).toMatchObject({ phase: 'work', round: 2, remainingMs: s(30), completedRounds: 1 });
    expect(circuitPosition(P, PREP_MS + s(55))).toMatchObject({ phase: 'work', round: 2, remainingMs: s(25), intoPhaseMs: s(5) });
  });

  it("nessuna pausa dopo l'ultimo round: subito completato", () => {
    const lastWorkEnd = PREP_MS + s(30) * 3 + s(20) * 2;
    expect(circuitTotalMs(P)).toBe(lastWorkEnd);
    expect(circuitPosition(P, lastWorkEnd - 1)).toMatchObject({ phase: 'work', round: 3, completedRounds: 2 });
    expect(circuitPosition(P, lastWorkEnd)).toMatchObject({ phase: 'done', round: 3, completedRounds: 3 });
    expect(circuitPosition(P, lastWorkEnd + s(999)).phase).toBe('done');
  });

  it('durate dei protocolli della scheda', () => {
    // 6 × 30/30: 5 s + 3 min di lavoro + 2,5 min di pausa
    expect(circuitTotalMs(CARDIO_PROTOCOLS[0])).toBe(PREP_MS + s(180) + s(150));
    // 10 × 40/20
    expect(circuitTotalMs(CARDIO_PROTOCOLS[3])).toBe(PREP_MS + s(400) + s(180));
  });
});

describe('rotazione degli esercizi', () => {
  it('round 1-4 → esercizi 0-3, round 5 → di nuovo il primo', () => {
    expect([1, 2, 3, 4, 5, 6].map((r) => exerciseIndexForRound(r, 4))).toEqual([0, 1, 2, 3, 0, 1]);
  });

  it('in pausa si mostra il PROSSIMO esercizio, in preparazione il primo', () => {
    expect(shownExerciseIndex(circuitPosition(P, 0), 4)).toBe(0);
    expect(shownExerciseIndex(circuitPosition(P, PREP_MS + s(1)), 4)).toBe(0);
    expect(shownExerciseIndex(circuitPosition(P, PREP_MS + s(31)), 4)).toBe(1);
    expect(shownExerciseIndex(circuitPosition(P, PREP_MS + s(51)), 4)).toBe(1);
  });
});

describe('pausa e ripresa', () => {
  it('il tempo in pausa non conta', () => {
    let run: CircuitRun = { protocol: 0, startedAt: 1_000_000, pausedMs: 0 };
    expect(circuitElapsed(run, 1_010_000)).toBe(10_000);
    run = pauseRun(run, 1_010_000);
    expect(circuitElapsed(run, 1_500_000)).toBe(10_000); // fermo durante la pausa
    run = resumeRun(run, 1_500_000);
    expect(run.pausedAt).toBeUndefined();
    expect(run.pausedMs).toBe(490_000);
    expect(circuitElapsed(run, 1_503_000)).toBe(13_000);
  });

  it('pausa doppia e ripresa senza pausa non cambiano nulla', () => {
    const run = pauseRun({ protocol: 0, startedAt: 0, pausedMs: 0 }, 100);
    expect(pauseRun(run, 999)).toBe(run);
    const live = { protocol: 0, startedAt: 0, pausedMs: 0 };
    expect(resumeRun(live, 999)).toBe(live);
  });
});
