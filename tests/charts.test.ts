import { describe, expect, it } from 'vitest';
import type { Session, SetLog } from '../src/db/models';
import {
  bestSet,
  exerciseCharts,
  exerciseIndex,
  fmtDelta,
  groupIndex,
  lastWeeks,
  stepLabels,
  weekStart,
  weeklySets,
} from '../src/logic/charts';
import { EXERCISE_BY_ID } from '../src/program/program';
import type { Exercise } from '../src/program/types';

const gsq = EXERCISE_BY_ID.gsq; // kg; primari quadricipiti, glutei; secondario core
const bss = EXERCISE_BY_ID.bss; // kg unilaterale; primari quadricipiti, glutei
const pull = EXERCISE_BY_ID.pull; // band assistance
const lpd = EXERCISE_BY_ID.lpd; // band resistance
const pu = EXERCISE_BY_ID.pu; // level
const sp = EXERCISE_BY_ID.sp; // time

// dati di prova inventati
let n = 0;
const sess = (id: string, date: string): Session => ({ id, date, day: 'A', phase1: false, notes: '', programVersion: 1 });
const log = (sessionId: string, exerciseId: string, v: Partial<SetLog>): SetLog => ({
  id: `l${n++}`,
  sessionId,
  exerciseId,
  setIndex: n,
  confirmed: true,
  ...v,
});

describe('bestSet', () => {
  it("kg: la serie con l'e1RM più alto, non quella col carico più alto", () => {
    // 10 × 12 → 14; 12 × 5 → 14; 14 × 2 → 14,93 ; 8 × 20 → 13,33
    expect(bestSet(gsq, [{ load: 10, reps: 12 }, { load: 14, reps: 2 }, { load: 8, reps: 20 }])).toEqual({ load: 14, reps: 2 });
    expect(bestSet(gsq, [{ load: 12, reps: 12 }, { load: 14, reps: 2 }])).toEqual({ load: 12, reps: 12 });
  });
});

describe('exerciseCharts', () => {
  const sessions = [sess('s2', '2026-11-10T18:00:00Z'), sess('s1', '2026-11-03T18:00:00Z'), sess('s3', '2026-11-17T18:00:00Z')];

  it('kg: e1RM + carico della serie migliore, in ordine di data, e riepilogo Partenza → Attuale', () => {
    const logs = [
      log('s1', 'gsq', { load: 10, reps: 12 }),
      log('s1', 'gsq', { load: 10, reps: 10 }),
      log('s2', 'gsq', { load: 12, reps: 10 }),
      log('s3', 'gsq', { load: 12, reps: 12 }),
      log('s3', 'rdl', { load: 14, reps: 8 }), // altro esercizio: ignorato
    ];
    const c = exerciseCharts(gsq, sessions, logs);
    expect(c.dates).toEqual(['2026-11-03T18:00:00Z', '2026-11-10T18:00:00Z', '2026-11-17T18:00:00Z']);
    expect(c.charts).toHaveLength(1);
    expect(c.charts[0].series[0].values).toEqual([14, 16, 16.8]);
    expect(c.charts[0].series[1].values).toEqual([10, 12, 12]);
    expect(c.summary[0]).toMatchObject({ label: 'e1RM', first: '14 kg', last: '16,8 kg', delta: '+2,8 kg (+20%)', trend: 1 });
    expect(c.summary[1]).toMatchObject({ label: 'Carico', first: '10 kg', last: '12 kg', delta: '+2 kg (+20%)' });
  });

  it('nessun dato: grafico vuoto, nessun riepilogo', () => {
    const c = exerciseCharts(gsq, sessions, []);
    expect(c.dates).toEqual([]);
    expect(c.summary).toEqual([]);
  });

  it('elastico ASSISTANCE: il gradino sale quando l\'aiuto scende; ripetizioni totali a parte', () => {
    const logs = [
      log('s1', 'pull', { load: 30, reps: 5 }),
      log('s1', 'pull', { load: 30, reps: 4 }),
      log('s3', 'pull', { load: 20, reps: 4 }),
      log('s3', 'pull', { load: 30, reps: 6 }),
    ];
    const c = exerciseCharts(pull, sessions, logs);
    expect(c.charts[0].steps).toEqual(['30', '20', '10', 'nessuno']);
    expect(c.charts[0].series[0].values).toEqual([0, 1]); // gradino più difficile usato
    expect(c.charts[1].series[0].values).toEqual([9, 10]);
    expect(c.summary[0]).toMatchObject({ label: 'Elastico', first: '30', last: '20', delta: 'più difficile', trend: 1 });
    expect(c.summary[1]).toMatchObject({ label: 'Ripetizioni totali', delta: '+1 (+11%)' });
  });

  it('elastico RESISTANCE: più pesante = gradino più alto', () => {
    expect(stepLabels(lpd)).toEqual(['10', '20', '30', '40', '50', '60']);
    const c = exerciseCharts(lpd, sessions, [log('s1', 'lpd', { load: 40, reps: 12 }), log('s2', 'lpd', { load: 20, reps: 15 })]);
    expect(c.charts[0].series[0].values).toEqual([3, 1]);
    expect(c.summary[0]).toMatchObject({ first: '40', last: '20', delta: 'più facile', trend: -1 });
  });

  it('livello dei push-up: L1…L5', () => {
    const c = exerciseCharts(pu, sessions, [log('s1', 'pu', { load: 2, reps: 8 }), log('s2', 'pu', { load: 3, reps: 8 })]);
    expect(c.charts[0].series[0].values).toEqual([1, 2]);
    expect(c.summary[0]).toMatchObject({ first: 'L2', last: 'L3' });
  });

  it('tempo: secondi totali; unilaterale = per lato', () => {
    const c = exerciseCharts(sp, sessions, [log('s1', 'sp', { seconds: 20 }), log('s1', 'sp', { seconds: 25 }), log('s2', 'sp', { seconds: 30 })]);
    expect(c.charts[0].title).toBe('Secondi totali per lato');
    expect(c.charts[0].series[0].values).toEqual([45, 30]);
    expect(c.summary[0]).toMatchObject({ delta: '−15 s (−33%)', trend: -1 });
  });
});

describe('fmtDelta', () => {
  it('uguale, in calo, partenza zero (niente percentuale)', () => {
    expect(fmtDelta(10, 10, 'kg')).toEqual({ text: '=', trend: 0 });
    expect(fmtDelta(10, 9, '')).toEqual({ text: '−1 (−10%)', trend: -1 });
    expect(fmtDelta(0, 5, '')).toEqual({ text: '+5', trend: 1 });
  });

  it('percentuale calcolata sulla differenza vera, non arrotondata (bug trovato sul telefono)', () => {
    // e1RM 5×9 = 6,5 → 8×10 = 10,67: +4,17 kg = +64,1%
    expect(fmtDelta(6.5, 8 * (1 + 10 / 30), 'kg')).toEqual({ text: '+4,2 kg (+64%)', trend: 1 });
  });
});

describe('indice di progressione', () => {
  const sessions = [sess('s1', '2026-11-03T18:00:00Z'), sess('s2', '2026-11-05T18:00:00Z'), sess('s3', '2026-11-10T18:00:00Z')];

  it('esercizio: 100 alla prima seduta', () => {
    const logs = [log('s1', 'gsq', { load: 12, reps: 10 }), log('s3', 'gsq', { load: 12, reps: 13 })];
    const idx = exerciseIndex(gsq, sessions, logs);
    expect(idx.map((p) => p.value)).toEqual([100, (12 * (1 + 13 / 30)) / (12 * (1 + 10 / 30)) * 100]);
  });

  it('gruppo: media degli esercizi PRIMARI con l\'ultimo valore noto di ciascuno', () => {
    const logs = [
      log('s1', 'gsq', { load: 12, reps: 10 }), // gsq 100
      log('s2', 'bss', { load: 10, reps: 10 }), // bss 100 → media 100
      log('s3', 'gsq', { load: 18, reps: 10 }), // gsq 150, bss resta 100 → 125
    ];
    expect(groupIndex('quadricipiti', sessions, logs).map((p) => p.value)).toEqual([100, 100, 125]);
    // core è solo SECONDARIO nel goblet squat: nessun indice
    expect(groupIndex('core', sessions, logs, [gsq, bss])).toEqual([]);
  });

  it('due esercizi dello stesso gruppo nella stessa seduta: un solo punto', () => {
    const logs = [log('s1', 'gsq', { load: 12, reps: 10 }), log('s1', 'bss', { load: 10, reps: 10 }), log('s3', 'bss', { load: 15, reps: 10 })];
    expect(groupIndex('glutei', sessions, logs, [gsq, bss]).map((p) => p.value)).toEqual([100, 125]);
  });

  it('gli esercizi tolti dalla scheda contano ancora (lo storico resta)', () => {
    const retired: Exercise = { ...gsq, id: 'old', retired: true };
    const logs = [log('s1', 'old', { load: 10, reps: 10 }), log('s3', 'old', { load: 20, reps: 10 })];
    expect(groupIndex('quadricipiti', sessions, logs, [retired]).map((p) => p.value)).toEqual([100, 200]);
  });
});

describe('serie settimanali', () => {
  it('settimana da lunedì', () => {
    expect(weekStart('2026-11-16T10:00:00')).toBe('2026-11-16'); // lunedì
    expect(weekStart('2026-11-22T21:00:00')).toBe('2026-11-16'); // domenica
    expect(weekStart('2026-11-23T08:00:00')).toBe('2026-11-23');
  });

  it('primario = 1, secondario = 0,5, sommati per settimana', () => {
    const sessions = [sess('s1', '2026-11-16T10:00:00'), sess('s2', '2026-11-18T10:00:00'), sess('s3', '2026-11-23T10:00:00')];
    const logs = [
      log('s1', 'gsq', { load: 12, reps: 10 }),
      log('s1', 'gsq', { load: 12, reps: 10 }),
      log('s2', 'pull', { load: 30, reps: 5 }), // schiena 1, bicipiti 0,5
      log('s3', 'gsq', { load: 12, reps: 10 }),
    ];
    const w = weeklySets(sessions, logs);
    expect(w.get('2026-11-16')).toMatchObject({ quadricipiti: 2, glutei: 2, core: 1, schiena: 1, bicipiti: 0.5, petto: 0 });
    expect(w.get('2026-11-23')).toMatchObject({ quadricipiti: 1, core: 0.5 });
  });

  it('ultime N settimane, comprese quelle vuote', () => {
    expect(lastWeeks(3, new Date('2026-11-19T12:00:00'))).toEqual(['2026-11-02', '2026-11-09', '2026-11-16']);
  });
});
