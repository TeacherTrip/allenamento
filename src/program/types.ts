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
  | 'core';

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
  muscles: { primary: Muscle[]; secondary: Muscle[] };
  equipment: string;
  notes: string;
  /** Immagine di riferimento (futura). */
  image?: string;
  /** Esercizio tolto dalla scheda: non compare nelle sedute, lo storico resta. */
  retired?: boolean;
}

export interface DayPlan {
  day: Day;
  title: string;
  subtitle: string;
}
