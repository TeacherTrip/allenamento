import type { DayPlan, Exercise, SimpleItem } from './types';

/**
 * LA SCHEDA. Per cambiarla si modifica questo file e si incrementa PROGRAM_VERSION.
 * Regola: un esercizio tolto NON si cancella, si marca `retired: true`
 * (così storico e grafici restano).
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

export const DAYS: DayPlan[] = [
  { day: 'A', title: 'Seduta A — Full body', subtitle: 'Lunedì · ~45 min' },
  { day: 'B', title: 'Seduta B — Full body', subtitle: 'Venerdì · ~45 min' },
  { day: 'C', title: 'Seduta C — Braccia, spalle, femorali + cardio', subtitle: 'Mercoledì · ~45 min' },
];

/** Livelli di appoggio dei push-up inclinati (metric 'level'). */
export const PUSHUP_LEVELS: Record<number, string> = {
  1: 'Piano cucina',
  2: 'Schienale divano',
  3: 'Seduta divano',
  4: 'Gradino',
  5: 'Terra',
};

export const EXERCISES: Exercise[] = [
  // ---------- Seduta A ----------
  {
    id: 'gsq', image: 'gsq', name: 'Goblet squat', day: 'A', order: 1, sets: 3, repRange: [8, 12], restSec: 90,
    metric: 'kg', unilateral: false, equipment: 'Manubrio 14 kg',
    muscles: { primary: ['quadricipiti', 'glutei'], secondary: ['core'] },
    notes: 'Discesa in 3 s. Talloni a terra, ginocchia in linea con le punte dei piedi.',
  },
  {
    id: 'pu', image: 'pu', name: 'Push-up inclinati', day: 'A', order: 2, superset: '2a', sets: 3, repRange: [8, 12], restSec: 0,
    metric: 'level', unilateral: false, equipment: 'Mani rialzate',
    muscles: { primary: ['petto'], secondary: ['tricipiti', 'spalle'] },
    notes: "Scegli l'appoggio che ti tiene in 8-12 reps a RIR 2. Scala: piano cucina/tavolo → schienale o bracciolo divano → seduta divano → gradino → terra. Corpo rigido come una tavola.",
  },
  {
    id: 'row', image: 'row', name: 'Rematore a un braccio', day: 'A', order: 3, superset: '2b', sets: 3, repRange: [8, 12], restSec: 75,
    metric: 'kg', unilateral: true, confirmSides: true, equipment: 'Manubrio 14 kg',
    muscles: { primary: ['schiena'], secondary: ['bicipiti'] },
    notes: 'Mano e ginocchio su sedia o divano. Parti dal sinistro, stesse reps col destro.',
  },
  {
    id: 'rdl', image: 'rdl', name: 'Romanian deadlift', day: 'A', order: 4, sets: 3, repRange: [10, 15], restSec: 75,
    metric: 'kg', unilateral: false, equipment: '2 × 10 kg',
    muscles: { primary: ['femorali', 'glutei'], secondary: ['schiena'] },
    notes: 'Discesa in 3 s, bacino indietro, schiena neutra, manubri che sfiorano le gambe. Scendi finché senti tirare i femorali, non oltre.',
  },
  {
    id: 'pull', image: 'pull', name: 'Trazioni assistite', day: 'A', order: 5, sets: 3, repRange: [3, 6], restSec: 90,
    metric: 'band', bandDirection: 'assistance', unilateral: false, equipment: 'Barra + elastico 30 kg',
    muscles: { primary: ['schiena'], secondary: ['bicipiti'] },
    notes: "Rigorose, zero slancio (corridoio stretto). Sali su una sedia per infilare ginocchio o piede nell'elastico. Se non ne completi 3: negative, discesa in 5 s. Controlla la tenuta della barra prima di ogni seduta.",
  },
  {
    id: 'db', image: 'db', name: 'Dead bug', day: 'A', order: 6, sets: 3, repRange: [8, 8], restSec: 45,
    metric: 'bodyweight', unilateral: true, equipment: 'Materassino',
    muscles: { primary: ['core'], secondary: [] },
    notes: 'Lombare schiacciata a terra per tutta la serie. Espira mentre estendi braccio e gamba opposti.',
  },

  // ---------- Seduta B ----------
  {
    id: 'bss', image: 'bss', name: 'Bulgarian split squat', day: 'B', order: 1, sets: 3, repRange: [8, 12], restSec: 90,
    metric: 'kg', unilateral: true, confirmSides: true, equipment: '2 × 10 kg oppure 14 kg al petto',
    muscles: { primary: ['quadricipiti', 'glutei'], secondary: [] },
    notes: 'Piede dietro sul divano. Parti dal sinistro. Busto leggermente inclinato in avanti, ginocchio anteriore stabile.',
  },
  {
    id: 'ht', image: 'ht', name: 'Hip thrust', day: 'B', order: 2, sets: 3, repRange: [12, 15], restSec: 75,
    metric: 'kg', unilateral: false, equipment: '14 kg + fascia sopra le ginocchia',
    muscles: { primary: ['glutei'], secondary: ['femorali'] },
    notes: 'Scapole sul bordo del divano, pausa 1 s in alto, mento verso il petto, spingi le ginocchia contro la fascia.',
  },
  {
    id: 'fp', image: 'fp', name: 'Floor press', day: 'B', order: 3, superset: '3a', sets: 3, repRange: [10, 15], restSec: 0,
    metric: 'kg', unilateral: false, equipment: '2 × 10 kg',
    muscles: { primary: ['petto'], secondary: ['tricipiti'] },
    notes: 'Sul materassino (pavimento duro). Gomiti a ~45° dal busto, pausa breve con i tricipiti a terra.',
  },
  {
    id: 'lpd', image: 'lpd', name: 'Lat pulldown con elastico', day: 'B', order: 4, superset: '3b', sets: 3, repRange: [12, 15], restSec: 75,
    metric: 'band', bandDirection: 'resistance', unilateral: false, equipment: 'Elastico 20 o 30 kg',
    muscles: { primary: ['schiena'], secondary: ['bicipiti'] },
    notes: 'In ginocchio sotto la barra, tira verso il petto portando i gomiti in basso e indietro.',
  },
  {
    id: 'mp', image: 'mp', name: 'Military press a un braccio', day: 'B', order: 5, superset: '4a', sets: 3, repRange: [8, 12], restSec: 0,
    metric: 'kg', unilateral: true, confirmSides: true, equipment: '10 kg',
    muscles: { primary: ['spalle'], secondary: ['tricipiti'] },
    notes: 'In ginocchio su una gamba, gluteo della gamba a terra contratto, non inarcare la schiena. Parti dal sinistro.',
  },
  {
    id: 'pa', image: 'pa', name: 'Band pull-apart', day: 'B', order: 6, superset: '4b', sets: 3, repRange: [15, 20], restSec: 60,
    metric: 'band', bandDirection: 'resistance', unilateral: false, equipment: 'Elastico 10 kg',
    muscles: { primary: ['spalle'], secondary: ['schiena'] },
    notes: "Braccia tese all'altezza del petto, apri fino a toccare il petto con l'elastico, scapole che si avvicinano.",
  },
  {
    id: 'sp', image: 'sp', name: 'Side plank', day: 'B', order: 7, sets: 2, repRange: [20, 40], restSec: 45,
    metric: 'time', unilateral: true, confirmSides: true, equipment: 'Materassino',
    muscles: { primary: ['core'], secondary: [] },
    notes: 'Gomito sotto la spalla, corpo in linea. Inizia dal lato sinistro.',
  },

  // ---------- Seduta C ----------
  {
    id: 'slrdl', image: 'slrdl', name: 'Stacco rumeno a una gamba', day: 'C', order: 1, sets: 3, repRange: [8, 10], restSec: 75,
    metric: 'kg', unilateral: true, confirmSides: true, equipment: '10 kg',
    muscles: { primary: ['femorali', 'glutei'], secondary: [] },
    notes: "Manubrio nella mano opposta alla gamba d'appoggio. Puoi sfiorare il muro con l'altra mano per l'equilibrio. Parti dal sinistro.",
  },
  {
    id: 'lc', image: 'lc', name: 'Leg curl con asciugamano', day: 'C', order: 2, sets: 3, repRange: [8, 12], restSec: 75,
    metric: 'bodyweight', unilateral: false, equipment: 'Pavimento liscio + materassino sotto le spalle',
    muscles: { primary: ['femorali'], secondary: [] },
    notes: 'Supino, talloni su un asciugamano, bacino alto per tutta la serie. Se non completi il movimento: solo la fase di distensione lenta (4 s), poi risali in ponte.',
  },
  {
    id: 'ap', image: 'ap', name: 'Arnold press (seduto)', day: 'C', order: 3, sets: 3, repRange: [8, 12], restSec: 75,
    metric: 'kg', unilateral: false, equipment: '2 × 6-8 kg',
    muscles: { primary: ['spalle'], secondary: ['tricipiti'] },
    notes: 'Parti con i palmi verso di te, ruotali mentre spingi sopra la testa.',
  },
  {
    id: 'lr', image: 'lr', name: 'Alzate laterali', day: 'C', order: 4, sets: 3, repRange: [12, 20], restSec: 60,
    metric: 'kg', unilateral: false, equipment: '2 × 4-6 kg',
    muscles: { primary: ['spalle'], secondary: [] },
    notes: 'Gomiti leggermente piegati, sali fino all\'altezza delle spalle, niente slancio.',
  },
  {
    id: 'cu', image: 'cu', name: 'Curl alternato', day: 'C', order: 5, superset: '5a', sets: 3, repRange: [8, 12], restSec: 0,
    metric: 'kg', unilateral: true, equipment: '2 × 8-10 kg',
    muscles: { primary: ['bicipiti'], secondary: [] },
    notes: 'Ruota il palmo verso l\'alto mentre sali, gomiti fermi ai fianchi.',
  },
  {
    id: 'fr', image: 'fr', name: 'French press sopra la testa', day: 'C', order: 6, superset: '5b', sets: 3, repRange: [10, 15], restSec: 60,
    metric: 'kg', unilateral: false, equipment: 'Manubrio singolo 10-14 kg',
    muscles: { primary: ['tricipiti'], secondary: [] },
    notes: 'A due mani, gomiti che puntano in avanti, discesa controllata dietro la testa.',
  },
  {
    id: 'rd', image: 'rd', name: 'Alzate posteriori', day: 'C', order: 7, sets: 2, repRange: [15, 20], restSec: 45,
    metric: 'kg', unilateral: false, equipment: '2 × 4 kg',
    muscles: { primary: ['spalle'], secondary: ['schiena'] },
    notes: 'Busto piegato in avanti, apri le braccia lateralmente, scapole che si avvicinano.',
  },
];

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
