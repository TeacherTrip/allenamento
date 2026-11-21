import { describe, expect, it } from 'vitest';
import type { Session, SetLog } from '../src/db/models';
import { afterCheck, blockOf, blockRest, manualRest, supersetToast, type FlowItem } from '../src/logic/superset';
import { bestSet, exerciseCharts, exerciseIndex, groupIndex, MUSCLES, weeklySets } from '../src/logic/charts';
import { prefillWithStart, startValues } from '../src/logic/prefill';
import { progressionHint } from '../src/logic/progression';
import { isComplete } from '../src/logic/values';
import { formatSet, nb } from '../src/logic/format';
import { catalogExercise } from '../src/program/program';

// ---------- superset e recupero ----------

const it3 = (id: string, count: number, restSec: number | null, supersetNext = false): FlowItem => ({ id, count, restSec, supersetNext });

describe('superset con serie diverse (es. gsq 3 serie + cr 2 serie, recupero 90 s dopo la coppia)', () => {
  // Modello 2, scheda A (inizio): gsq+cr, row+pu, gb, ...
  const plan = [it3('gsq', 3, null, true), it3('cr', 2, 90), it3('row', 3, null, true), it3('pu', 3, 75), it3('gb', 2, 75), it3('hfs', 2, null)];

  it('serie 1 e 2 del primo → passa al secondo, niente recupero', () => {
    expect(afterCheck(plan, 0, 0)).toEqual({ kind: 'next', to: 'cr' });
    expect(afterCheck(plan, 0, 1)).toEqual({ kind: 'next', to: 'cr' });
  });

  it('dopo il secondo → recupero della coppia', () => {
    expect(afterCheck(plan, 1, 0)).toEqual({ kind: 'rest', sec: 90 });
    expect(afterCheck(plan, 1, 1)).toEqual({ kind: 'rest', sec: 90 });
  });

  it('3ª serie: solo il primo → il recupero parte dopo il primo', () => {
    expect(afterCheck(plan, 0, 2)).toEqual({ kind: 'rest', sec: 90 });
  });

  it('caso inverso: il secondo ha più serie del primo', () => {
    const p = [it3('a', 2, null, true), it3('b', 3, 60), it3('c', 1, 30)];
    expect(afterCheck(p, 0, 1)).toEqual({ kind: 'next', to: 'b' });
    expect(afterCheck(p, 1, 2)).toEqual({ kind: 'rest', sec: 60 });
  });

  it('"Settimane 1-2": entrambi a 2 serie → sempre in coppia', () => {
    const p = [it3('gsq', 2, null, true), it3('cr', 2, 90), it3('x', 2, 60)];
    expect(afterCheck(p, 0, 1)).toEqual({ kind: 'next', to: 'cr' });
    expect(afterCheck(p, 1, 1)).toEqual({ kind: 'rest', sec: 90 });
  });

  it('serie extra del primo oltre quelle del secondo → recupero (non "passa a")', () => {
    const p = [it3('pu', 4, null, true), it3('row', 3, 75), it3('x', 3, 60)];
    expect(afterCheck(p, 0, 3)).toEqual({ kind: 'rest', sec: 75 });
  });

  it('Modello 1 invariato: pu → row, recupero 75 s dopo la coppia', () => {
    const p = [it3('gsq', 3, 90), it3('pu', 3, null, true), it3('row', 3, 75), it3('db', 3, 45)];
    expect(afterCheck(p, 0, 0)).toEqual({ kind: 'rest', sec: 90 });
    expect(afterCheck(p, 1, 0)).toEqual({ kind: 'next', to: 'row' });
    expect(afterCheck(p, 2, 0)).toEqual({ kind: 'rest', sec: 75 });
  });
});

describe('recupero "–" e fine seduta', () => {
  it('voce singola con "–": nessun timer, nemmeno tra le sue serie', () => {
    const p = [it3('hfs', 2, null), it3('x', 2, 60)];
    expect(afterCheck(p, 0, 0)).toEqual({ kind: 'none' });
  });

  it('ultima serie della seduta: nessun timer', () => {
    const p = [it3('a', 2, 60), it3('b', 2, 45)];
    expect(afterCheck(p, 1, 0)).toEqual({ kind: 'rest', sec: 45 });
    expect(afterCheck(p, 1, 1)).toEqual({ kind: 'none' });
  });

  it('ultimo blocco in superset: nessun timer solo dopo l\'ultimo giro', () => {
    const p = [it3('x', 1, 60), it3('a', 3, null, true), it3('b', 2, 60)];
    expect(afterCheck(p, 2, 1)).toEqual({ kind: 'rest', sec: 60 }); // manca ancora la 3ª di "a"
    expect(afterCheck(p, 1, 2)).toEqual({ kind: 'none' }); // 3ª di "a" = fine seduta
  });

  it('blocchi, recupero del blocco e pulsante manuale', () => {
    const p = [it3('a', 3, null, true), it3('b', 3, 90), it3('c', 2, null)];
    expect(blockOf(p, 0)).toEqual([0, 1]);
    expect(blockOf(p, 1)).toEqual([0, 1]);
    expect(blockOf(p, 2)).toEqual([2, 2]);
    expect(blockRest(p, 0)).toBe(90);
    expect(manualRest(p, 0)).toBe(90);
    expect(blockRest(p, 2)).toBeNull();
    expect(manualRest(p, 2)).toBe(60);
  });
});

// ---------- 0 kg ----------

let n = 0;
const sess = (id: string, date: string): Session => ({ id, date, day: 'A', phase1: false, notes: '', programVersion: 1 });
const log = (sessionId: string, exerciseId: string, v: Partial<SetLog>): SetLog => ({
  id: `l${n++}`, sessionId, exerciseId, setIndex: n, confirmed: true, ...v,
});

describe('0 kg (ponte glutei, split squat statico)', () => {
  const gb = catalogExercise('gb');
  const ss = catalogExercise('ss');

  it('una serie a 0 kg è completa e si scrive "0 kg"', () => {
    expect(isComplete('kg', { load: 0, reps: 12 })).toBe(true);
    expect(formatSet(gb, { load: 0, reps: 12 })).toBe('0 kg × 12');
    expect(formatSet(ss, { load: 0, reps: 8 })).toBe('0 kg × 8 per lato');
  });

  it('serie migliore a 0 kg: quella con più ripetizioni', () => {
    expect(bestSet(gb, [{ load: 0, reps: 10 }, { load: 0, reps: 14 }, { load: 0, reps: 12 }])).toEqual({ load: 0, reps: 14 });
  });

  it('grafici: e1RM vuoto a 0 kg, carico 0, ripetizioni totali; nessuna % partendo da 0', () => {
    const sessions = [sess('s1', '2026-11-02T10:00:00Z'), sess('s2', '2026-11-09T10:00:00Z'), sess('s3', '2026-11-16T10:00:00Z')];
    const logs = [
      log('s1', 'gb', { load: 0, reps: 12 }), log('s1', 'gb', { load: 0, reps: 12 }),
      log('s2', 'gb', { load: 0, reps: 15 }), log('s2', 'gb', { load: 0, reps: 15 }),
      log('s3', 'gb', { load: 6, reps: 12 }), log('s3', 'gb', { load: 6, reps: 10 }),
    ];
    const c = exerciseCharts(gb, sessions, logs);
    const [best, reps] = c.charts;
    expect(best.series[0].values).toEqual([null, null, 8.4]); // e1RM: 6 × (1 + 12/30)
    expect(best.series[1].values).toEqual([0, 0, 6]); // carico
    expect(reps.title).toBe('Ripetizioni totali');
    expect(reps.series[0].values).toEqual([24, 30, 22]);
    const carico = c.summary.find((r) => r.label === 'Carico')!;
    expect([carico.first, carico.last, carico.delta]).toEqual(['0 kg', '6 kg', '+6 kg']); // niente % (si parte da 0)
    for (const v of [...best.series.flatMap((s) => s.values), ...reps.series[0].values]) {
      if (v != null) expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('senza sedute a 0 kg: nessun grafico in più (Modello 1 invariato)', () => {
    const gsq = catalogExercise('gsq');
    const c = exerciseCharts(gsq, [sess('s1', '2026-11-02T10:00:00Z')], [log('s1', 'gsq', { load: 14, reps: 10 })]);
    expect(c.charts.map((x) => x.title)).toEqual(['Serie migliore']);
  });

  it('indice: le sedute a 0 kg non fanno da base (niente divisioni per 0)', () => {
    const sessions = [sess('s1', '2026-11-02T10:00:00Z'), sess('s2', '2026-11-09T10:00:00Z'), sess('s3', '2026-11-16T10:00:00Z')];
    const logs = [log('s1', 'gb', { load: 0, reps: 12 }), log('s2', 'gb', { load: 2, reps: 12 }), log('s3', 'gb', { load: 4, reps: 12 })];
    const idx = exerciseIndex(gb, sessions, logs);
    expect(idx.map((p) => p.sessionId)).toEqual(['s2', 's3']);
    expect(idx[0].value).toBe(100);
    expect(idx[1].value).toBeCloseTo(200);
  });
});

// ---------- mobilità e polpacci ----------

describe('mobilità esclusa dai conteggi; polpacci', () => {
  const hfs = catalogExercise('hfs');
  const cr = catalogExercise('cr');
  const gb = catalogExercise('gb');
  const sessions = [sess('s1', '2026-11-16T10:00:00Z'), sess('s2', '2026-11-18T10:00:00Z')];
  const logs = [
    log('s1', 'hfs', { seconds: 30 }), log('s1', 'hfs', { seconds: 30 }),
    log('s1', 'cr', { reps: 15 }), log('s1', 'cr', { reps: 15 }),
    log('s1', 'gb', { load: 6, reps: 12 }),
    log('s2', 'hfs', { seconds: 40 }), log('s2', 'gb', { load: 6, reps: 15 }),
  ];

  it('polpacci è un gruppo muscolare dei grafici', () => {
    expect(MUSCLES).toContain('polpacci');
  });

  it('serie settimanali: hfs non conta (quadricipiti a 0), cr conta per i polpacci', () => {
    const w = weeklySets(sessions, logs, [hfs, cr, gb]).get('2026-11-16')!;
    expect(w.quadricipiti).toBe(0);
    expect(w.polpacci).toBe(2);
    expect(w.glutei).toBe(2);
    expect(w.femorali).toBe(1);
  });

  it('indice per gruppo: hfs non entra nei quadricipiti', () => {
    expect(groupIndex('quadricipiti', sessions, logs, [hfs, cr, gb])).toEqual([]);
    expect(groupIndex('polpacci', sessions, logs, [hfs, cr, gb])).toHaveLength(1);
  });

  it('il grafico dell\'esercizio di mobilità resta (secondi totali)', () => {
    const c = exerciseCharts(hfs, sessions, logs);
    expect(c.charts[0].series[0].values).toEqual([60, 40]);
  });

  it('mobilità: nessun suggerimento di progressione', () => {
    expect(progressionHint(hfs, [{ seconds: 40 }, { seconds: 40 }])).toBeNull();
    expect(progressionHint(cr, [{ reps: 20 }, { reps: 20 }])).not.toBeNull();
  });
});

// ---------- valore di partenza ----------

describe('valore di partenza (ProgramItem.startValue)', () => {
  const prev = (load: number, reps: number): SetLog => log('old', 'x', { load, reps, setIndex: 0 });

  it('significato secondo la metrica', () => {
    expect(startValues('kg', 6)).toEqual({ load: 6 });
    expect(startValues('kg', 0)).toEqual({ load: 0 });
    expect(startValues('band', 10)).toEqual({ load: 10 });
    expect(startValues('level', 1)).toEqual({ load: 1 });
    expect(startValues('time', 15)).toEqual({ seconds: 15 });
    expect(startValues('bodyweight', 5)).toBeUndefined();
    expect(startValues('kg', undefined)).toBeUndefined();
  });

  it('senza storico: valore di partenza su tutte le serie (ripetizioni vuote)', () => {
    expect(prefillWithStart([], 3, 'kg', 6)).toEqual([{ load: 6 }, { load: 6 }, { load: 6 }]);
    expect(prefillWithStart([], 2, 'kg', 0)).toEqual([{ load: 0 }, { load: 0 }]);
  });

  it('con storico: vince sempre l\'ultima volta', () => {
    expect(prefillWithStart([prev(8, 10)], 2, 'kg', 6)).toEqual([{ load: 8, reps: 10 }, { load: 8, reps: 10 }]);
  });

  it('senza storico e senza valore: niente', () => {
    expect(prefillWithStart([], 2, 'kg')).toEqual([undefined, undefined]);
  });
});

describe('nb(): spazi non separabili solo dove servono (D4)', () => {
  const N = ' ';
  it('numero + unità, «· 7 esercizi», «2 × 10», «RIR 3», «con ✓»', () => {
    expect(nb('cardio · 7 esercizi')).toBe(`cardio ·${N}7${N}esercizi`);
    expect(nb('Manubrio 14 kg · 2 × 8-12 per lato')).toBe(`Manubrio 14${N}kg ·${N}2${N}×${N}8-12 per lato`);
    expect(nb('confermato con ✓')).toBe(`confermato con${N}✓`);
    expect(nb('un solo ✓ per serie')).toBe(`un solo${N}✓${N}per serie`);
    expect(nb('massimo 2 serie, RIR 3')).toBe(`massimo 2${N}serie, RIR${N}3`);
    expect(nb('discesa in 4-5 s, 47 min')).toBe(`discesa in 4-5${N}s, 47${N}min`);
  });
  it('non tocca le parole che iniziano come un\'unità', () => {
    expect(nb('2 settimane, 3 serie, 5 secchi')).toBe(`2${N}settimane, 3${N}serie, 5 secchi`);
  });
});

// ---------- avviso del superset (correzione del 21/11/2026) ----------
describe('avviso dopo la ✓ in un superset: nome del prossimo esercizio e recupero che segue', () => {
  it('con recupero del blocco', () => {
    expect(supersetToast('Calf raise in piedi', 90)).toBe('Superset: ora Calf raise in piedi, poi recupero 90 s');
  });
  it('recupero "–" (null o 0): nessun recupero', () => {
    expect(supersetToast('Dead bug', null)).toBe('Superset: ora Dead bug, poi nessun recupero');
    expect(supersetToast('Dead bug', 0)).toBe('Superset: ora Dead bug, poi nessun recupero');
  });
});
