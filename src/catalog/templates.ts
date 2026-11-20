import type { Program, ProgramItem, Template } from '../program/types';

/** Voce di un modello: la chiave è l'id dell'esercizio (in un modello ogni esercizio compare una volta per scheda). */
const item = (exerciseId: string, sets: number, repRange: [number, number], restSec: number | null, extra: Partial<ProgramItem> = {}): ProgramItem => ({
  key: exerciseId,
  exerciseId,
  sets,
  repRange,
  restSec,
  ...extra,
});

/** MODELLO 1 = le schede A/B/C usate fino alla Fase 4-bis. Gli id delle schede (A, B, C) non si cambiano: lo storico li usa. */
const MODEL_1: Program[] = [
  {
    id: 'A', order: 1, name: 'A', description: 'Full body', subtitle: 'Lunedì · ~45 min', warmup: true, circuit: 'no',
    items: [
      item('gsq', 3, [8, 12], 90, { equipment: 'Manubrio 14 kg' }),
      item('pu', 3, [8, 12], null, { supersetNext: true }),
      item('row', 3, [8, 12], 75, { equipment: 'Manubrio 14 kg' }),
      item('rdl', 3, [10, 15], 75, { equipment: '2 × 10 kg' }),
      item('pull', 3, [3, 6], 90, { equipment: 'Barra + elastico 30 kg' }),
      item('db', 3, [8, 8], 45),
    ],
  },
  {
    id: 'B', order: 2, name: 'B', description: 'Full body', subtitle: 'Venerdì · ~45 min', warmup: true, circuit: 'no',
    items: [
      item('bss', 3, [8, 12], 90, { equipment: '2 × 10 kg oppure 14 kg al petto' }),
      item('ht', 3, [12, 15], 75, { equipment: '14 kg + fascia sopra le ginocchia' }),
      item('fp', 3, [10, 15], null, { supersetNext: true, equipment: '2 × 10 kg' }),
      item('lpd', 3, [12, 15], 75, { equipment: 'Elastico 20 o 30 kg' }),
      item('mp', 3, [8, 12], null, { supersetNext: true, equipment: '10 kg' }),
      item('pa', 3, [15, 20], 60, { equipment: 'Elastico 10 kg' }),
      item('sp', 2, [20, 40], 45),
    ],
  },
  {
    id: 'C', order: 3, name: 'C', description: 'Braccia, spalle, femorali + cardio', subtitle: 'Mercoledì · ~45 min', warmup: true, circuit: 'yes',
    items: [
      item('slrdl', 3, [8, 10], 75, { equipment: '10 kg' }),
      item('lc', 3, [8, 12], 75),
      item('ap', 3, [8, 12], 75, { equipment: '2 × 6-8 kg' }),
      item('lr', 3, [12, 20], 60, { equipment: '2 × 4-6 kg' }),
      item('cu', 3, [8, 12], null, { supersetNext: true, equipment: '2 × 8-10 kg' }),
      item('fr', 3, [10, 15], 60, { equipment: 'Manubrio singolo 10-14 kg' }),
      item('rd', 2, [15, 20], 45, { equipment: '2 × 4 kg' }),
    ],
  },
];

export const TEMPLATES: Template[] = [{ id: 'm1', label: 'Modello 1', programs: MODEL_1 }];

export const TEMPLATE_BY_ID = Object.fromEntries(TEMPLATES.map((t) => [t.id, t])) as Record<string, Template>;

/**
 * Badge dei superset numerati per BLOCCHI: ogni esercizio singolo o superset è un blocco;
 * le voci di un superset prendono "1a", "1b"…; le voci singole nessun badge.
 * Es. Modello 1, scheda A: gsq (blocco 1), pu+row (2a, 2b), rdl (3)…
 */
export function supersetBadges(items: Pick<ProgramItem, 'supersetNext'>[]): (string | undefined)[] {
  const out: (string | undefined)[] = [];
  let block = 0;
  let i = 0;
  while (i < items.length) {
    block++;
    let j = i;
    while (j < items.length - 1 && items[j].supersetNext) j++;
    for (let k = i; k <= j; k++) out.push(j > i ? `${block}${String.fromCharCode(97 + k - i)}` : undefined);
    i = j + 1;
  }
  return out;
}
