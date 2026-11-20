import type { Day, DayPlan, Exercise, Program, SimpleItem } from './types';
import { CATALOG_BY_ID } from '../catalog/exercises';
import { TEMPLATE_BY_ID, supersetBadges } from '../catalog/templates';

/**
 * Esercizi in catalogo: src/catalog/exercises.ts. Modelli di schede: src/catalog/templates.ts.
 * Qui: riscaldamento, livelli dei push-up e la scheda "risolta" (catalogo + Modello 1) usata dalle schermate.
 */
export const PROGRAM_VERSION = 1;

/** Riscaldamento (5-6 min), in ordine. */
export const WARMUP: SimpleItem[] = [
  { id: 'wu-squat', image: 'wu-squat', name: '10 squat a corpo libero' },
  { id: 'wu-bridge', image: 'wu-bridge', name: '10 ponti glutei' },
  { id: 'wu-monster', image: 'wu-monster', name: '10 monster walk per lato (fascia)' },
  { id: 'wu-pa', image: 'pa', name: '10 band pull-apart' },
  { id: 'wu-hang', image: 'wu-hang', name: '2 hang alla barra da 15-20 s' },
];

export const PUSHUP_LEVELS: Record<number, string> = {
  1: 'Piano cucina',
  2: 'Schienale divano',
  3: 'Seduta divano',
  4: 'Gradino',
  5: 'Terra',
};

/** Esercizi di una scheda "risolti": catalogo + valori della voce + posizione e badge del superset. */
export function resolveProgram(program: Program): Exercise[] {
  const badges = supersetBadges(program.items);
  return program.items.map((it, i) => {
    const c = CATALOG_BY_ID[it.exerciseId];
    if (!c) throw new Error(`Esercizio non in catalogo: ${it.exerciseId}`);
    const ex: Exercise = {
      id: c.id,
      name: c.name,
      day: program.id as Day,
      order: i + 1,
      sets: it.sets,
      repRange: it.repRange,
      restSec: it.restSec ?? 0,
      metric: c.metric,
      unilateral: c.unilateral,
      muscles: c.muscles,
      equipment: it.equipment ?? c.equipment,
      notes: c.notes,
    };
    if (badges[i]) ex.superset = badges[i];
    if (c.bandDirection) ex.bandDirection = c.bandDirection;
    if (c.confirmSides) ex.confirmSides = c.confirmSides;
    if (c.image) ex.image = c.image;
    return ex;
  });
}

const MODEL_1 = TEMPLATE_BY_ID.m1.programs;

export const DAYS: DayPlan[] = MODEL_1.map((p) => ({
  day: p.id as Day,
  title: `Seduta ${p.name} — ${p.description}`,
  subtitle: p.subtitle ?? '',
}));

export const EXERCISES: Exercise[] = MODEL_1.flatMap(resolveProgram);

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

/** Esercizi attivi di una seduta, in ordine. */
export function exercisesForDay(day: string): Exercise[] {
  return EXERCISES.filter((e) => e.day === day && !e.retired).sort((a, b) => a.order - b.order);
}

/** Nome dell'esercizio successivo nel superset (per "passa subito a 2b"). */
export function supersetPartner(ex: Exercise): Exercise | undefined {
  if (!ex.superset?.endsWith('a')) return undefined;
  const target = ex.superset.slice(0, -1) + 'b';
  return EXERCISES.find((e) => e.day === ex.day && e.superset === target && !e.retired);
}
