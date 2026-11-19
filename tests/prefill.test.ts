import { describe, expect, it } from 'vitest';
import { buildPrefill, lastSessionSets } from '../src/logic/prefill';
import type { Session, SetLog } from '../src/db/models';

const sess = (id: string, date: string): Session => ({ id, date, day: 'A', phase1: false, notes: '', programVersion: 1 });
const log = (sessionId: string, exerciseId: string, setIndex: number, load: number, reps: number): SetLog => ({
  id: `${sessionId}-${exerciseId}-${setIndex}`, sessionId, exerciseId, setIndex, load, reps, confirmed: true,
});

describe('lastSessionSets', () => {
  const sessions = [sess('s1', '2026-01-05T10:00:00Z'), sess('s2', '2026-01-12T10:00:00Z'), sess('s3', '2026-01-14T10:00:00Z')];
  const logs = [
    log('s1', 'gsq', 0, 10, 8),
    log('s2', 'gsq', 1, 12, 9),
    log('s2', 'gsq', 0, 12, 10),
    log('s3', 'rdl', 0, 10, 12), // altro esercizio, seduta più recente
  ];

  it('prende la seduta più recente in cui l’esercizio è stato fatto, serie in ordine', () => {
    const last = lastSessionSets('gsq', sessions, logs);
    expect(last.map((l) => [l.setIndex, l.load, l.reps])).toEqual([[0, 12, 10], [1, 12, 9]]);
  });

  it('nessuno storico → lista vuota', () => {
    expect(lastSessionSets('pu', sessions, logs)).toEqual([]);
  });
});

describe('buildPrefill', () => {
  const last = [log('s', 'gsq', 0, 12, 10), log('s', 'gsq', 1, 12, 9)];

  it('precompila serie per serie', () => {
    expect(buildPrefill(last, 2)).toEqual([{ load: 12, reps: 10 }, { load: 12, reps: 9 }]);
  });

  it('serie mancanti = valori dell’ultima serie disponibile', () => {
    expect(buildPrefill(last, 3)[2]).toEqual({ load: 12, reps: 9 });
  });

  it('se ora le serie sono meno, usa solo le prime', () => {
    expect(buildPrefill(last, 1)).toEqual([{ load: 12, reps: 10 }]);
  });

  it('senza storico → nessun valore', () => {
    expect(buildPrefill([], 3)).toEqual([undefined, undefined, undefined]);
  });
});
