import { describe, expect, it } from 'vitest';
import type { Draft, Session, SetLog } from '../src/db/models';
import { logsFromDraft } from '../src/logic/draftLogs';
import { exerciseCharts, weeklySets } from '../src/logic/charts';
import { lastSessionSets } from '../src/logic/prefill';
import { formatSet } from '../src/logic/format';
import { EXERCISE_BY_ID } from '../src/program/program';
import { DEFAULT_SETTINGS } from '../src/db/models';
import { settingsToAdd } from '../src/db/migrate';

// «Separa i lati»: stesso formato dei dati nei due modi (valori per lato, una riga per serie). Dati inventati.
const row = EXERCISE_BY_ID.row; // rematore a un braccio: kg, a un arto, confirmSides

const counter = () => {
  let i = 0;
  return () => `id${i++}`;
};

/** Bozza con lati UNITI: un solo ✓ per serie. */
const joined: Pick<Draft, 'sets' | 'extra'> = {
  sets: { row: [{ load: '14', reps: '10' }, { load: '14', reps: '9' }] },
};
/** Bozza con lati SEPARATI: [Sx] poi [Dx] → la serie è confermata (resta il segno del primo lato). */
const separated: Pick<Draft, 'sets' | 'extra'> = {
  sets: { row: [{ load: '14', reps: '10', leftDone: true }, { load: '14', reps: '9', leftDone: true }] },
};

describe('Separa i lati: bozza → serie salvate', () => {
  it('lati uniti e lati separati danno le STESSE serie (una riga per serie, valori per lato)', () => {
    const a = logsFromDraft(joined, { row: 2 }, 's1', counter());
    const b = logsFromDraft(separated, { row: 2 }, 's1', counter());
    expect(a).toEqual(b);
    expect(a.map((l) => [l.setIndex, l.load, l.reps])).toEqual([
      [0, 14, 10],
      [1, 14, 9],
    ]);
  });

  it('solo il primo lato fatto (o una serie da confermare): non si salva', () => {
    const half: Pick<Draft, 'sets'> = { sets: { row: [{ load: '14', reps: '10', pending: true, leftDone: true }, { load: '14', reps: '9', pending: true }] } };
    expect(logsFromDraft(half, { row: 2 }, 's1', counter())).toEqual([]);
  });
});

describe('sedute miste (lati uniti e separati) sullo stesso esercizio', () => {
  const sessions: Session[] = [
    { id: 's1', date: '2026-11-02T09:00:00.000Z', day: 'A', phase1: false, notes: '', programVersion: 1 },
    { id: 's2', date: '2026-11-05T09:00:00.000Z', day: 'A', phase1: false, notes: '', programVersion: 1 },
  ];
  // s1 salvata con i lati separati, s2 con un solo ✓
  const logs: SetLog[] = [
    ...logsFromDraft(separated, { row: 2 }, 's1', counter()),
    ...logsFromDraft({ sets: { row: [{ load: '16', reps: '8' }, { load: '16', reps: '8' }] } }, { row: 2 }, 's2', () => `x${Math.random()}`),
  ];

  it('storico: valori per lato in entrambe le sedute', () => {
    const text = (sid: string) => logs.filter((l) => l.sessionId === sid).map((l) => formatSet(row, l));
    expect(text('s1')).toEqual(['14 kg × 10 per lato', '14 kg × 9 per lato']);
    expect(text('s2')).toEqual(['16 kg × 8 per lato', '16 kg × 8 per lato']);
    expect(lastSessionSets('row', sessions, logs).map((l) => [l.load, l.reps])).toEqual([
      [16, 8],
      [16, 8],
    ]);
  });

  it('grafici: e1RM (Epley) e carico della serie migliore per ogni seduta, in ordine', () => {
    const c = exerciseCharts(row, sessions, logs);
    const best = c.charts.find((x) => x.title === 'Serie migliore')!;
    // 14 × (1 + 10/30) = 18,7 ; 16 × (1 + 8/30) = 20,3
    expect(best.series.map((s) => s.values)).toEqual([
      [18.7, 20.3],
      [14, 16],
    ]);
  });

  it('serie settimanali: ogni serie conta 1 (primari) / 0,5 (secondari) in tutti e due i modi', () => {
    const week = [...weeklySets(sessions, logs).values()];
    expect(week).toHaveLength(1);
    for (const m of row.muscles.primary) expect(week[0][m]).toBe(4);
    for (const m of row.muscles.secondary) expect(week[0][m]).toBe(2);
  });
});

describe('Separa i lati: valori di partenza', () => {
  it('installazione nuova: spento di serie', () => {
    expect(DEFAULT_SETTINGS.separateSides).toBe(false);
  });

  it('installazione esistente migrata: acceso, lato di partenza sinistro come prima (mai sovrascritto)', () => {
    const added = settingsToAdd([], []);
    expect(added.find((r) => r.key === 'separateSides')?.value).toBe(true);
    expect(added.find((r) => r.key === 'startSide')?.value).toBe('left');
    const kept = settingsToAdd([{ key: 'separateSides', value: false }], []);
    expect(kept.find((r) => r.key === 'separateSides')).toBeUndefined();
  });
});
