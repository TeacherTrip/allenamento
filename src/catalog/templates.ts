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

/*
 * MODELLO 2: testi approvati il 20/11/2026 (docs/piano-4bis.md, «Modello 2 — contenuto»).
 * Superset A1/A2/…: la prima voce ha supersetNext e recupero "–" (null); il recupero del blocco è sull'ultima.
 * Le note ripetute («come scheda A») sono scritte per esteso.
 */
const N_GSQ = 'Costole giù, schiena non inarcata; scendere fino a toccare il divano.';
const N_CR =
  "Mano a un mobile per l'equilibrio; salita e discesa lente, 1 s di tenuta in alto. Progressione: a 2 × 20 pulite su un gradino (talloni sotto il livello del gradino), poi un manubrio in mano.";
const N_ROW = 'Mano libera sul divano, schiena piatta.';
const N_PU = 'Corpo dritto, glutei contratti. A 3 × 12 pulite si scende di un livello.';
const N_DB = 'Lombare appoggiata al materassino; se si stacca, accorciare il movimento.';
const N_HFS = 'In ginocchio su una gamba; gluteo contratto e bacino in retroversione, senza inarcarsi.';
const N_SP = 'Partenza: sulle ginocchia, nessuna gamba sollevata. +5 s quando tutte le serie sono pulite; versione sui piedi a 30 s pulite.';

const MODEL_2: Program[] = [
  {
    id: 'A', order: 1, name: 'A', warmup: true, circuit: 'optional',
    items: [
      item('gsq', 3, [10, 12], null, { supersetNext: true, startValue: 6, equipment: 'Kettlebell', notes: N_GSQ }),
      item('cr', 2, [15, 20], 90, { notes: N_CR }),
      item('row', 3, [10, 12], null, { supersetNext: true, startValue: 6, equipment: 'Manubrio', notes: N_ROW }),
      item('pu', 3, [8, 12], 75, { startValue: 1, notes: N_PU }),
      item('gb', 2, [12, 15], 75, {
        startValue: 6,
        equipment: 'Manubrio',
        notes: 'Manubrio sul bacino con un asciugamano; prima retroversione del bacino, poi salire; si devono sentire i glutei, non la schiena.',
      }),
      item('db', 3, [6, 8], null, { supersetNext: true, notes: N_DB }),
      item('pa', 3, [12, 15], 60, { startValue: 10, notes: 'Spalle basse, collo rilassato.' }),
      item('hfs', 2, [30, 40], null, { notes: N_HFS }),
    ],
  },
  {
    id: 'B', order: 2, name: 'B', warmup: true, circuit: 'optional',
    items: [
      item('rdl', 3, [10, 12], 90, {
        startValue: 6,
        equipment: 'Manubri',
        notes:
          'Schiena neutra, manubri vicini alle gambe; scendere finché il bacino va indietro. Se compare dolore, fermarsi e ripetere solo il gesto senza carico. Evitare nella prima ora dopo il risveglio.',
      }),
      item('lpd', 3, [12, 15], null, {
        supersetNext: true,
        startValue: 10,
        notes: 'Da seduti o in ginocchio; gomiti verso i fianchi, spalle lontane dalle orecchie. Elastico 20 se facile.',
      }),
      item('fp', 3, [10, 12], 75, { startValue: 6, equipment: 'Manubri', notes: 'Ginocchia piegate, piedi a terra.' }),
      item('ss', 3, [8, 10], null, {
        supersetNext: true,
        startValue: 0,
        notes: 'Discesa verticale, appoggio a un mobile se serve. Progressione: 2 × 2 kg in mano dopo 3 × 10 per lato.',
      }),
      item('cls', 2, [12, 15], 75, {
        notes:
          'Fascia sopra le ginocchia; sdraiati sul fianco, ginocchia piegate, talloni uniti; bacino fermo, non ruotare indietro. Progressione: a 2 × 15 pulite fascia più in alto sulle cosce, poi 2 s di tenuta in apertura.',
      }),
      item('sp', 2, [15, 20], null, { supersetNext: true, notes: N_SP }),
      item('bdog', 2, [6, 8], 60, { notes: 'Lento, 2 s di tenuta; bacino fermo, schiena non inarcata.' }),
      item('hfs', 2, [30, 40], null, { notes: N_HFS }),
    ],
  },
  {
    id: 'C', order: 3, name: 'C', warmup: true, circuit: 'optional',
    items: [
      item('ht', 3, [10, 12], null, {
        supersetNext: true,
        startValue: 8,
        equipment: 'Manubrio',
        notes:
          'Scapole sulla seduta del divano, mento verso il petto, bacino in retroversione in alto. Se compare dolore, passare al ponte glutei (gb).',
      }),
      item('cr', 2, [15, 20], 90, { notes: N_CR }),
      item('row', 3, [10, 12], null, { supersetNext: true, startValue: 6, equipment: 'Manubrio', notes: N_ROW }),
      item('pu', 3, [8, 12], 75, { startValue: 1, notes: N_PU }),
      item('lc', 2, [6, 8], 75, {
        notes:
          "Ponte sui talloni, piedi sull'asciugamano. Settimane 1-2: solo fase eccentrica (piedi che si allontanano), ritorno con il bacino a terra.",
      }),
      item('db', 3, [6, 8], null, { supersetNext: true, notes: N_DB }),
      item('sp', 2, [15, 20], 60, { notes: N_SP }),
      item('hfs', 2, [30, 40], null, { notes: N_HFS }),
    ],
  },
  {
    id: 'D', order: 4, name: 'D', description: 'leggera (~25 min)', warmup: true, circuit: 'no',
    notes: 'Più 10-15 min di camminata o circuito leggero. Alla fine 5 min di defaticamento sdraiati, gambe appoggiate al muro.',
    notesPosition: 'bottom',
    items: [
      item('gb', 2, [12, 12], 45, { startValue: 0, equipment: '0 o 6 kg' }),
      item('cls', 2, [12, 12], 45),
      item('db', 2, [6, 6], 45),
      item('pa', 2, [15, 15], 45, { startValue: 10 }),
      item('bdog', 2, [6, 6], 45),
      item('hfs', 2, [40, 40], null),
    ],
  },
];

/** «Schede vuote»: una scheda "A" senza voci (gli esercizi si aggiungono dall'editor). */
const EMPTY: Program[] = [{ id: 'A', order: 1, name: 'A', warmup: true, circuit: 'no', items: [] }];

/**
 * Modelli proposti al primo avvio e in Info → «Ricarica un modello».
 * Gli id 'A'/'B'/… qui sono solo segnaposto: le schede create da un modello ricevono sempre un id generato.
 * Titoli e testi neutri.
 */
export const TEMPLATES: Template[] = [
  { id: 'm1', label: 'Modello 1', image: 'modelli/modello-1.webp', programs: MODEL_1 },
  { id: 'm2', label: 'Modello 2', image: 'modelli/modello-2.webp', programs: MODEL_2 },
  { id: 'empty', label: 'Schede vuote', programs: EMPTY },
];

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
