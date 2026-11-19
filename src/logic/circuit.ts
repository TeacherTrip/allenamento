import type { CardioProtocol } from '../program/cardio';

/** Preparazione prima del round 1. */
export const PREP_MS = 5000;

/**
 * Circuito in corso, salvato nella bozza (sopravvive a ricaricamento e app chiusa).
 * Come per il recupero, la posizione si calcola sempre dagli orari, mai contando i tick.
 */
export interface CircuitRun {
  protocol: number; // indice in CARDIO_PROTOCOLS
  startedAt: number; // Date.now() alla pressione di "Avvia"
  /** Se presente: in pausa da quell'istante. */
  pausedAt?: number;
  /** Totale delle pause già concluse. */
  pausedMs: number;
}

export type CircuitPhase = 'prep' | 'work' | 'rest' | 'done';

export interface CircuitPos {
  phase: CircuitPhase;
  /** Round corrente (1…rounds). In pausa: il round appena finito. In prep: 0. */
  round: number;
  /** Millisecondi alla fine della fase (0 se done). */
  remainingMs: number;
  /** Millisecondi passati dall'inizio della fase. */
  intoPhaseMs: number;
  /** Round di lavoro già completati. */
  completedRounds: number;
}

/** Tempo effettivo trascorso (pause escluse). */
export function circuitElapsed(run: CircuitRun, now = Date.now()): number {
  const end = run.pausedAt ?? now;
  return Math.max(0, end - run.startedAt - run.pausedMs);
}

/** Durata totale: preparazione + round di lavoro + pause tra i round (nessuna pausa dopo l'ultimo). */
export function circuitTotalMs(p: CardioProtocol): number {
  return PREP_MS + p.rounds * p.workSec * 1000 + (p.rounds - 1) * p.restSec * 1000;
}

/** Posizione nel circuito dopo `elapsed` millisecondi effettivi. */
export function circuitPosition(p: CardioProtocol, elapsed: number): CircuitPos {
  const work = p.workSec * 1000;
  const rest = p.restSec * 1000;
  if (elapsed < PREP_MS) {
    return { phase: 'prep', round: 0, remainingMs: PREP_MS - elapsed, intoPhaseMs: elapsed, completedRounds: 0 };
  }
  const t = elapsed - PREP_MS;
  const cycle = work + rest;
  const idx = Math.floor(t / cycle); // 0-based
  const inCycle = t - idx * cycle;
  if (idx >= p.rounds || (idx === p.rounds - 1 && inCycle >= work)) {
    return { phase: 'done', round: p.rounds, remainingMs: 0, intoPhaseMs: 0, completedRounds: p.rounds };
  }
  if (inCycle < work) {
    return { phase: 'work', round: idx + 1, remainingMs: work - inCycle, intoPhaseMs: inCycle, completedRounds: idx };
  }
  return { phase: 'rest', round: idx + 1, remainingMs: cycle - inCycle, intoPhaseMs: inCycle - work, completedRounds: idx + 1 };
}

/** Indice dell'esercizio per un round (1-based): rotazione dei 4 esercizi. */
export function exerciseIndexForRound(round: number, count: number): number {
  return (((Math.max(1, round) - 1) % count) + count) % count;
}

/** Esercizio da mostrare: in prep il primo, in lavoro quello del round, in pausa il prossimo. */
export function shownExerciseIndex(pos: CircuitPos, count: number): number {
  if (pos.phase === 'prep') return 0;
  if (pos.phase === 'rest') return exerciseIndexForRound(pos.round + 1, count);
  return exerciseIndexForRound(pos.round, count);
}

export function pauseRun(run: CircuitRun, now = Date.now()): CircuitRun {
  return run.pausedAt != null ? run : { ...run, pausedAt: now };
}

export function resumeRun(run: CircuitRun, now = Date.now()): CircuitRun {
  if (run.pausedAt == null) return run;
  const { pausedAt, ...rest } = run;
  return { ...rest, pausedMs: run.pausedMs + Math.max(0, now - pausedAt) };
}

/** Chiave della fase: cambia a ogni passaggio prep → lavoro → pausa → … */
export const phaseKey = (pos: CircuitPos) => `${pos.phase}-${pos.round}`;
