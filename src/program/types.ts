export type Day = 'A' | 'B' | 'C';

/** Come si registra una serie. */
export type Metric = 'kg' | 'band' | 'level' | 'bodyweight' | 'time';

/**
 * Direzione dell'elastico:
 * - assistance: l'elastico aiuta (trazioni) → più leggero = più difficile
 * - resistance: l'elastico fa resistenza → più pesante = più difficile
 */
export type BandDirection = 'assistance' | 'resistance';

export type Muscle =
  | 'quadricipiti'
  | 'femorali'
  | 'glutei'
  | 'petto'
  | 'schiena'
  | 'spalle'
  | 'bicipiti'
  | 'tricipiti'
  | 'core'
  | 'polpacci';

/** Esercizio del CATALOGO (nel codice): cosa è, non come si fa in una scheda. */
export interface CatalogExercise {
  id: string;
  name: string;
  /** Come Exercise.image. */
  image?: string;
  /** Attrezzo generico (i kg, se servono, stanno nella voce della scheda). */
  equipment: string;
  /** Note GENERALI di esecuzione: niente istruzioni personali. */
  notes: string;
  metric: Metric;
  bandDirection?: BandDirection;
  unilateral: boolean;
  confirmSides?: boolean;
  /** 'mobility' = mobilità/allungamento: escluso da serie settimanali e indici per gruppo. */
  kind?: 'mobility';
  muscles: { primary: Muscle[]; secondary: Muscle[] };
  /** Valori suggeriti quando l'esercizio si aggiunge a una scheda. restSec null = nessun timer ("–"). */
  defaults: { sets: number; repRange: [number, number]; restSec: number | null };
  /** Non più proponibile nelle schede; lo storico resta. */
  retired?: boolean;
}

/** Voce di una scheda: un esercizio del catalogo con i valori di quella scheda. */
export interface ProgramItem {
  /** Id univoco della voce (stabile anche se si sposta). */
  key: string;
  exerciseId: string;
  sets: number;
  repRange: [number, number];
  /** Recupero dopo la voce; null = nessun timer ("–"). */
  restSec: number | null;
  /** Superset con la voce successiva. */
  supersetNext?: boolean;
  /** Valore di partenza se l'esercizio non ha storico (kg, elastico, livello o secondi, secondo la metrica). */
  startValue?: number;
  /** Attrezzo di questa scheda (es. "Manubrio 14 kg"); se manca vale quello del catalogo. */
  equipment?: string;
  /** Note di questa scheda, mostrate dopo quelle del catalogo. */
  notes?: string;
}

export interface Program {
  id: string;
  order: number;
  /** Nome breve (max 6 caratteri), mostrato nella barra in basso. */
  name: string;
  /** Descrizione dopo il nome nel titolo: "Seduta A — Full body". */
  description?: string;
  subtitle?: string;
  /** Note della scheda, mostrate in cima o in fondo alla seduta. */
  notes?: string;
  notesPosition?: 'top' | 'bottom';
  warmup: boolean;
  circuit: 'no' | 'yes' | 'optional';
  items: ProgramItem[];
}

export type TemplateId = 'm1' | 'm2' | 'empty';

export interface Template {
  id: TemplateId;
  label: string;
  programs: Program[];
}

/** Esercizio "risolto": catalogo + voce della scheda + posizione. È quello che usano le schermate. */
export interface Exercise {
  id: string;
  name: string;
  day: Day;
  order: number;
  /** Badge del superset, es. "2a" / "2b". */
  superset?: string;
  sets: number;
  /** Range di ripetizioni (o di secondi per metric 'time'). */
  repRange: [number, number];
  /** Recupero dopo l'esercizio; 0 = passa subito al successivo del superset. */
  restSec: number;
  metric: Metric;
  /** Obbligatorio per metric 'band'. */
  bandDirection?: BandDirection;
  /** Ripetizioni/secondi "per lato". */
  unilateral: boolean;
  /**
   * Lati fatti uno dopo l'altro (sinistro → destro senza pausa): due tasti [Sx] [Dx].
   * Assente per gli esercizi a lati alternati (es. dead bug, curl alternato): un solo ✓.
   */
  confirmSides?: boolean;
  /** Come CatalogExercise.kind. */
  kind?: 'mobility';
  muscles: { primary: Muscle[]; secondary: Muscle[] };
  equipment: string;
  notes: string;
  /**
   * Immagine di riferimento: nome del file in public/esercizi/ senza estensione (es. 'gsq').
   * Il percorso completo si ottiene con imageUrl().
   */
  image?: string;
  /** Esercizio tolto dalla scheda: non compare nelle sedute, lo storico resta. */
  retired?: boolean;
}

export interface DayPlan {
  day: Day;
  title: string;
  subtitle: string;
}

/** Voce del riscaldamento o del circuito cardio. */
export interface SimpleItem {
  id: string;
  name: string;
  /** Come Exercise.image. */
  image?: string;
}
