import type { CatalogExercise } from '../program/types';

/**
 * CATALOGO degli esercizi. Gli id sono stabili e non si cambiano mai (lo storico li usa).
 * Le note sono GENERALI: niente istruzioni personali né lato di partenza (si sceglie in Info).
 * Un esercizio da non proporre più si marca `retired: true`, non si cancella.
 * `defaults` = valori suggeriti quando lo si aggiunge a una scheda.
 */
export const CATALOG: CatalogExercise[] = [
  {
    id: 'gsq', image: 'gsq', name: 'Goblet squat', metric: 'kg', unilateral: false, equipment: 'Manubrio',
    muscles: { primary: ['quadricipiti', 'glutei'], secondary: ['core'] },
    notes: 'Discesa in 3 s. Talloni a terra, ginocchia in linea con le punte dei piedi.',
    defaults: { sets: 3, repRange: [8, 12], restSec: 90 },
  },
  {
    id: 'pu', image: 'pu', name: 'Push-up inclinati', metric: 'level', unilateral: false, equipment: 'Mani rialzate',
    muscles: { primary: ['petto'], secondary: ['tricipiti', 'spalle'] },
    notes: "Scala: piano cucina/tavolo → schienale o bracciolo divano → seduta divano → gradino → terra. Corpo rigido come una tavola.",
    defaults: { sets: 3, repRange: [8, 12], restSec: 75 },
  },
  {
    id: 'row', image: 'row', name: 'Rematore a un braccio', metric: 'kg', unilateral: true, confirmSides: true, equipment: 'Manubrio',
    muscles: { primary: ['schiena'], secondary: ['bicipiti'] },
    notes: 'Mano e ginocchio su sedia o divano.',
    defaults: { sets: 3, repRange: [8, 12], restSec: 75 },
  },
  {
    id: 'rdl', image: 'rdl', name: 'Romanian deadlift', metric: 'kg', unilateral: false, equipment: 'Manubri',
    muscles: { primary: ['femorali', 'glutei'], secondary: ['schiena'] },
    notes: 'Discesa in 3 s, bacino indietro, schiena neutra, manubri che sfiorano le gambe. Scendi finché senti tirare i femorali, non oltre.',
    defaults: { sets: 3, repRange: [10, 15], restSec: 75 },
  },
  {
    id: 'pull', image: 'pull', name: 'Trazioni assistite', metric: 'band', bandDirection: 'assistance', unilateral: false, equipment: 'Barra + elastico',
    muscles: { primary: ['schiena'], secondary: ['bicipiti'] },
    notes: "Sali su una sedia per infilare ginocchio o piede nell'elastico. Controlla la tenuta della barra prima di ogni seduta.",
    defaults: { sets: 3, repRange: [3, 6], restSec: 90 },
  },
  {
    id: 'db', image: 'db', name: 'Dead bug', metric: 'bodyweight', unilateral: true, equipment: 'Materassino',
    muscles: { primary: ['core'], secondary: [] },
    notes: 'Lombare schiacciata a terra per tutta la serie. Espira mentre estendi braccio e gamba opposti.',
    defaults: { sets: 3, repRange: [8, 8], restSec: 45 },
  },
  {
    id: 'bss', image: 'bss', name: 'Bulgarian split squat', metric: 'kg', unilateral: true, confirmSides: true, equipment: 'Manubri',
    muscles: { primary: ['quadricipiti', 'glutei'], secondary: [] },
    notes: 'Piede dietro sul divano. Busto leggermente inclinato in avanti, ginocchio anteriore stabile.',
    defaults: { sets: 3, repRange: [8, 12], restSec: 90 },
  },
  {
    id: 'ht', image: 'ht', name: 'Hip thrust', metric: 'kg', unilateral: false, equipment: 'Manubrio',
    muscles: { primary: ['glutei'], secondary: ['femorali'] },
    notes: 'Scapole sul bordo del divano, pausa 1 s in alto, mento verso il petto.',
    defaults: { sets: 3, repRange: [12, 15], restSec: 75 },
  },
  {
    id: 'fp', image: 'fp', name: 'Floor press', metric: 'kg', unilateral: false, equipment: 'Manubri',
    muscles: { primary: ['petto'], secondary: ['tricipiti'] },
    notes: 'Sul materassino (pavimento duro). Gomiti a ~45° dal busto, pausa breve con i tricipiti a terra.',
    defaults: { sets: 3, repRange: [10, 15], restSec: 75 },
  },
  {
    id: 'lpd', image: 'lpd', name: 'Lat pulldown con elastico', metric: 'band', bandDirection: 'resistance', unilateral: false, equipment: 'Elastico',
    muscles: { primary: ['schiena'], secondary: ['bicipiti'] },
    notes: 'Tira verso il petto portando i gomiti in basso e indietro.',
    defaults: { sets: 3, repRange: [12, 15], restSec: 75 },
  },
  {
    id: 'mp', image: 'mp', name: 'Military press a un braccio', metric: 'kg', unilateral: true, confirmSides: true, equipment: 'Manubrio',
    muscles: { primary: ['spalle'], secondary: ['tricipiti'] },
    notes: 'In ginocchio su una gamba, gluteo della gamba a terra contratto, non inarcare la schiena.',
    defaults: { sets: 3, repRange: [8, 12], restSec: 60 },
  },
  {
    id: 'pa', image: 'pa', name: 'Band pull-apart', metric: 'band', bandDirection: 'resistance', unilateral: false, equipment: 'Elastico',
    muscles: { primary: ['spalle'], secondary: ['schiena'] },
    notes: "Braccia tese all'altezza del petto, apri fino a toccare il petto con l'elastico, scapole che si avvicinano.",
    defaults: { sets: 3, repRange: [15, 20], restSec: 60 },
  },
  {
    id: 'sp', image: 'sp', name: 'Side plank', metric: 'time', unilateral: true, confirmSides: true, equipment: 'Materassino',
    muscles: { primary: ['core'], secondary: [] },
    notes: 'Gomito sotto la spalla, corpo in linea.',
    defaults: { sets: 2, repRange: [20, 40], restSec: 45 },
  },
  {
    id: 'slrdl', image: 'slrdl', name: 'Stacco rumeno a una gamba', metric: 'kg', unilateral: true, confirmSides: true, equipment: 'Manubrio',
    muscles: { primary: ['femorali', 'glutei'], secondary: [] },
    notes: "Manubrio nella mano opposta alla gamba d'appoggio. Puoi sfiorare il muro con l'altra mano per l'equilibrio.",
    defaults: { sets: 3, repRange: [8, 10], restSec: 75 },
  },
  {
    id: 'lc', image: 'lc', name: 'Leg curl con asciugamano', metric: 'bodyweight', unilateral: false, equipment: 'Pavimento liscio + materassino sotto le spalle',
    muscles: { primary: ['femorali'], secondary: [] },
    notes: 'Sdraiati sulla schiena, talloni su un asciugamano, bacino alto per tutta la serie. Se non completi il movimento: solo la fase di distensione lenta (4 s), poi risali in ponte.',
    defaults: { sets: 3, repRange: [8, 12], restSec: 75 },
  },
  {
    id: 'ap', image: 'ap', name: 'Arnold press (da seduti)', metric: 'kg', unilateral: false, equipment: 'Manubri',
    muscles: { primary: ['spalle'], secondary: ['tricipiti'] },
    notes: 'Parti con i palmi verso di te, ruotali mentre spingi sopra la testa.',
    defaults: { sets: 3, repRange: [8, 12], restSec: 75 },
  },
  {
    id: 'lr', image: 'lr', name: 'Alzate laterali', metric: 'kg', unilateral: false, equipment: 'Manubri',
    muscles: { primary: ['spalle'], secondary: [] },
    notes: "Gomiti leggermente piegati, sali fino all'altezza delle spalle, niente slancio.",
    defaults: { sets: 3, repRange: [12, 20], restSec: 60 },
  },
  {
    id: 'cu', image: 'cu', name: 'Curl alternato', metric: 'kg', unilateral: true, equipment: 'Manubri',
    muscles: { primary: ['bicipiti'], secondary: [] },
    notes: "Ruota il palmo verso l'alto mentre sali, gomiti fermi ai fianchi.",
    defaults: { sets: 3, repRange: [8, 12], restSec: 60 },
  },
  {
    id: 'fr', image: 'fr', name: 'French press sopra la testa', metric: 'kg', unilateral: false, equipment: 'Manubrio',
    muscles: { primary: ['tricipiti'], secondary: [] },
    notes: 'A due mani, gomiti che puntano in avanti, discesa controllata dietro la testa.',
    defaults: { sets: 3, repRange: [10, 15], restSec: 60 },
  },
  {
    id: 'rd', image: 'rd', name: 'Alzate posteriori', metric: 'kg', unilateral: false, equipment: 'Manubri',
    muscles: { primary: ['spalle'], secondary: ['schiena'] },
    notes: 'Busto piegato in avanti, apri le braccia lateralmente, scapole che si avvicinano.',
    defaults: { sets: 2, repRange: [15, 20], restSec: 45 },
  },

  // ---------- esercizi aggiunti con la Fase 4-bis ----------
  {
    id: 'gb', image: 'gb', name: 'Ponte glutei', metric: 'kg', unilateral: false, equipment: 'Manubrio + asciugamano',
    muscles: { primary: ['glutei'], secondary: ['femorali'] },
    notes: 'Sdraiati sulla schiena, piedi a terra vicini ai glutei. Manubrio appoggiato sul bacino con un asciugamano. Spingi con i talloni e contrai i glutei in alto. Si può fare anche a 0 kg.',
    defaults: { sets: 2, repRange: [12, 15], restSec: 75 },
  },
  {
    id: 'ss', image: 'ss', name: 'Split squat statico', metric: 'kg', unilateral: true, confirmSides: true, equipment: 'Manubri (facoltativi)',
    muscles: { primary: ['quadricipiti', 'glutei'], secondary: ['femorali'] },
    notes: 'Gambe divise, piedi fermi. Scendi in verticale finché il ginocchio dietro si avvicina a terra, busto dritto. Si può fare anche a 0 kg.',
    defaults: { sets: 3, repRange: [8, 10], restSec: 75 },
  },
  {
    id: 'bdog', image: 'bdog', name: 'Bird dog', metric: 'bodyweight', unilateral: true, equipment: 'Materassino',
    muscles: { primary: ['core'], secondary: ['glutei', 'schiena'] },
    notes: 'In quadrupedia, estendi insieme braccio e gamba opposti senza ruotare il bacino; torna e cambia lato.',
    defaults: { sets: 2, repRange: [6, 8], restSec: 60 },
  },
  {
    id: 'hfs', image: 'hfs', name: "Allungamento flessori dell'anca", metric: 'time', unilateral: true, confirmSides: true, kind: 'mobility', equipment: 'Materassino',
    muscles: { primary: ['quadricipiti'], secondary: [] },
    notes: 'In ginocchio su una gamba, piede avanti a terra. Porta il bacino in avanti con il busto dritto e tieni la posizione senza molleggiare.',
    defaults: { sets: 2, repRange: [30, 40], restSec: null },
  },
  {
    id: 'cr', image: 'cr', name: 'Calf raise in piedi', metric: 'bodyweight', unilateral: false, equipment: 'Gradino (facoltativo)',
    muscles: { primary: ['polpacci'], secondary: [] },
    notes: 'In piedi, sali sulle punte e scendi lentamente fino ad appoggiare i talloni.',
    defaults: { sets: 2, repRange: [15, 20], restSec: 90 },
  },
  {
    id: 'cls', image: 'cls', name: 'Clamshell con fascia', metric: 'bodyweight', unilateral: true, confirmSides: true, equipment: 'Fascia elastica in stoffa',
    muscles: { primary: ['glutei'], secondary: [] },
    notes: 'Sul fianco, ginocchia piegate e talloni uniti. Apri il ginocchio di sopra senza muovere il bacino.',
    defaults: { sets: 2, repRange: [12, 15], restSec: 75 },
  },
];

export const CATALOG_BY_ID: Record<string, CatalogExercise> = Object.fromEntries(CATALOG.map((e) => [e.id, e]));
