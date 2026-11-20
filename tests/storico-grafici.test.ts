import { describe, expect, it } from 'vitest';
import type { Session, SetLog } from '../src/db/models';
import {
  exerciseCharts,
  exerciseMenu,
  groupHasZeroKg,
  groupIndex,
  trainedMuscles,
  weeklySets,
} from '../src/logic/charts';
import { historyGroups } from '../src/logic/history';
import { nb } from '../src/logic/format';
import { CATALOG } from '../src/catalog/exercises';
import { TEMPLATE_BY_ID } from '../src/catalog/templates';
import { CATALOG_EXERCISES, catalogExercise } from '../src/program/program';
import type { Program } from '../src/program/types';

// Fase 4-bis passo 8: storico e grafici con due modelli. Dati di prova inventati.

let n = 0;
/** Data locale (le etichette dello storico sono in ora locale). */
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 18, 0).toISOString();
const sess = (id: string, date: string, day = 'A', programName?: string): Session => ({
  id,
  date,
  day,
  ...(programName ? { programName } : {}),
  phase1: false,
  notes: '',
  programVersion: 1,
});
const log = (sessionId: string, exerciseId: string, v: Partial<SetLog>): SetLog => ({
  id: `l${n++}`,
  sessionId,
  exerciseId,
  setIndex: n,
  confirmed: true,
  ...v,
});
const prog = (id: string, name: string, order: number, exerciseIds: string[]): Program => ({
  id,
  name,
  order,
  warmup: false,
  circuit: 'no',
  items: exerciseIds.map((e, i) => ({ key: `${id}${i}`, exerciseId: e, sets: 2, repRange: [8, 12], restSec: 60 })),
});
const NBSP = ' ';

describe('Storico raggruppato per scheda', () => {
  it('prima le schede attuali (col nome di oggi), poi quelle che non ci sono più con «fino al»', () => {
    const programs = [prog('p2', 'B', 1, ['gsq']), prog('p1', 'A', 0, ['gsq'])];
    const sessions = [
      sess('s1', at(2026, 11, 2), 'A', 'A'), // migrata
      sess('s2', at(2026, 11, 5), 'A', 'A'),
      sess('s3', at(2026, 11, 10), 'p1', 'A'),
      sess('s4', at(2026, 11, 12), 'p2', 'B'),
      sess('s5', at(2026, 11, 3), 'x9', 'C'),
    ];
    const g = historyGroups(sessions, programs);
    expect(g.map((x) => x.label)).toEqual(['Scheda A', 'Scheda B', 'Scheda A — fino al 05/11/2026', 'Scheda C — fino al 03/11/2026']);
    expect(g.map((x) => x.old)).toEqual([false, false, true, true]);
    expect(g[2].sessions.map((s) => s.id)).toEqual(['s2', 's1']); // dalla più recente
  });

  it('nome e data uguali: «dal … al …» per entrambi i gruppi', () => {
    const sessions = [
      sess('a1', at(2026, 10, 20), 'old1', 'A'),
      sess('a2', at(2026, 11, 3), 'old1', 'A'),
      sess('b1', at(2026, 10, 27), 'old2', 'A'),
      sess('b2', at(2026, 11, 3), 'old2', 'A'),
      sess('c1', at(2026, 11, 3), 'old3', 'B'), // stessa data, nome diverso: resta «fino al»
    ];
    // a pari ultima data: prima il gruppo iniziato più tardi
    expect(historyGroups(sessions, []).map((x) => x.label)).toEqual([
      'Scheda B — fino al 03/11/2026',
      'Scheda A — dal 27/10/2026 al 03/11/2026',
      'Scheda A — dal 20/10/2026 al 03/11/2026',
    ]);
  });

  it('una seduta senza nome salvato usa l\'id (sedute migrate)', () => {
    expect(historyGroups([sess('s1', at(2026, 11, 2), 'C')], []).map((x) => x.label)).toEqual(['Scheda C — fino al 02/11/2026']);
  });

  it('nb() tiene insieme «fino al» e la data', () => {
    expect(nb('Scheda A — fino al 05/11/2026')).toBe(`Scheda A — fino${NBSP}al${NBSP}05/11/2026`);
    expect(nb('Scheda A — dal 27/10/2026 al 03/11/2026')).toBe(`Scheda A — dal${NBSP}27/10/2026 al${NBSP}03/11/2026`);
    expect(nb('· 3 sedute')).toBe(`·${NBSP}3${NBSP}sedute`);
  });
});

describe('menu «Per esercizio»', () => {
  it('Modello 2: una voce per scheda, ogni esercizio una volta, nella prima scheda in cui compare', () => {
    const m2 = TEMPLATE_BY_ID.m2.programs;
    const menu = exerciseMenu(m2, new Set());
    // la D ripete solo esercizi già presenti in A, B o C: nessuna voce vuota
    expect(menu.map((g) => g.label)).toEqual(['Seduta A', 'Seduta B', 'Seduta C']);
    const all = menu.flatMap((g) => g.ids);
    expect(new Set(all).size).toBe(all.length);
    for (const id of ['gb', 'ss', 'bdog', 'hfs', 'cr', 'cls']) expect(all).toContain(id);
    expect(new Set(all)).toEqual(new Set(m2.flatMap((p) => p.items.map((i) => i.exerciseId))));
  });

  it('«Altri esercizi con dati»: fuori dalle schede di oggi ma con serie salvate', () => {
    const programs = [prog('p1', 'A', 0, ['gb', 'cr'])];
    const menu = exerciseMenu(programs, new Set(['gb', 'gsq', 'pull', 'ignoto']));
    expect(menu).toEqual([
      { label: 'Seduta A', ids: ['gb', 'cr'] },
      { label: 'Altri esercizi con dati', ids: ['gsq', 'pull'] }, // ordine del catalogo, id sconosciuti esclusi
    ]);
  });

  it('nessun «Altri esercizi con dati» se non ce ne sono', () => {
    expect(exerciseMenu([prog('p1', 'A', 0, ['gb'])], new Set(['gb'])).map((g) => g.label)).toEqual(['Seduta A']);
  });
});

describe('esercizi kg a 0 kg', () => {
  const gb = catalogExercise('gb');
  const sessions = [sess('s1', at(2026, 11, 2)), sess('s2', at(2026, 11, 5))];

  it('sempre a 0 kg: solo «Ripetizioni totali», niente e1RM né carico', () => {
    const logs = [log('s1', 'gb', { load: 0, reps: 12 }), log('s1', 'gb', { load: 0, reps: 12 }), log('s2', 'gb', { load: 0, reps: 15 })];
    const c = exerciseCharts(gb, sessions, logs);
    expect(c.zeroKg).toBe('all');
    expect(c.charts.map((x) => x.title)).toEqual(['Ripetizioni totali']);
    expect(c.summary.map((r) => [r.label, r.first, r.last])).toEqual([['Ripetizioni totali', '24', '15']]);
  });

  it('sedute miste: e1RM, carico e ripetizioni', () => {
    const logs = [log('s1', 'gb', { load: 0, reps: 12 }), log('s2', 'gb', { load: 6, reps: 12 })];
    const c = exerciseCharts(gb, sessions, logs);
    expect(c.zeroKg).toBe('mixed');
    expect(c.charts.map((x) => x.title)).toEqual(['Serie migliore', 'Ripetizioni totali']);
    expect(c.charts[0].series[0].values).toEqual([null, 8.4]); // buco nell'e1RM a 0 kg
  });

  it('nessuna seduta a 0 kg: come prima', () => {
    const c = exerciseCharts(gb, sessions, [log('s1', 'gb', { load: 6, reps: 12 })]);
    expect(c.zeroKg).toBe('none');
    expect(c.charts.map((x) => x.title)).toEqual(['Serie migliore']);
  });

  it('frase sotto l\'indice: solo se il gruppo (primario) ha serie kg a 0 kg', () => {
    const logs = [log('s1', 'gb', { load: 0, reps: 12 })];
    expect(groupHasZeroKg('glutei', logs)).toBe(true);
    expect(groupHasZeroKg('femorali', logs)).toBe(false); // secondario nel ponte glutei
    expect(groupHasZeroKg('glutei', [log('s1', 'gb', { load: 6, reps: 12 })])).toBe(false);
    expect(groupIndex('glutei', sessions, logs)).toEqual([]); // a 0 kg non entra nell'indice
  });
});

describe('gruppi muscolari con tutto il catalogo', () => {
  const sessions = [sess('s1', '2026-11-16T10:00:00'), sess('s2', '2026-11-22T21:00:00'), sess('s3', '2026-11-23T08:00:00')];

  it('il catalogo intero conta: gli esercizi del Modello 2 entrano nelle serie settimanali', () => {
    expect(CATALOG_EXERCISES.map((e) => e.id)).toEqual(CATALOG.map((c) => c.id));
    const logs = [
      log('s1', 'gb', { load: 0, reps: 12 }), // glutei 1, femorali 0,5
      log('s1', 'ss', { load: 4, reps: 8 }), // un arto: 1 serie = 1 → quadricipiti 1, glutei 1, femorali 0,5
      log('s2', 'bdog', { reps: 6 }), // core 1, glutei 0,5, schiena 0,5
      log('s2', 'cr', { reps: 15, extra: true }), // extra comprese: polpacci 1
      log('s2', 'cls', { reps: 12 }), // glutei 1
      log('s2', 'hfs', { seconds: 30 }), // mobilità: esclusa
      log('s3', 'cr', { reps: 15 }), // lunedì dopo: settimana nuova
    ];
    const w = weeklySets(sessions, logs);
    expect(w.get('2026-11-16')).toEqual({
      quadricipiti: 1,
      femorali: 1,
      glutei: 3.5,
      petto: 0,
      schiena: 0.5,
      spalle: 0,
      bicipiti: 0,
      tricipiti: 0,
      core: 1,
      polpacci: 1,
    });
    expect(w.get('2026-11-23')).toMatchObject({ polpacci: 1, glutei: 0 });
  });

  it('gruppi visibili solo se allenati (anche solo come secondari)', () => {
    const logs = [log('s1', 'gb', { load: 0, reps: 12 }), log('s1', 'hfs', { seconds: 30 })];
    expect(trainedMuscles(weeklySets(sessions, logs))).toEqual(['femorali', 'glutei']);
    expect(trainedMuscles(weeklySets(sessions, [log('s1', 'hfs', { seconds: 30 })]))).toEqual([]); // solo mobilità
  });

  it('indice di gruppo con esercizi del Modello 2 (ponte glutei con carico)', () => {
    const logs = [log('s1', 'gb', { load: 6, reps: 12 }), log('s3', 'gb', { load: 8, reps: 12 })];
    expect(groupIndex('glutei', sessions, logs).map((p) => Math.round(p.value))).toEqual([100, 133]);
  });
});
