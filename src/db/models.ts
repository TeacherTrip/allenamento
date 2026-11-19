import type { Day } from '../program/types';

/** Valori di una serie. Il significato di `load` dipende dalla metrica:
 *  kg → kg; band → kg dell'elastico (0 = nessuno); level → livello 1-5. */
export interface SetValues {
  load?: number;
  reps?: number;
  seconds?: number;
}

export interface CircuitLog {
  protocol: number; // indice in CARDIO_PROTOCOLS
  label: string;
  rounds: number; // round previsti
  completedRounds: number;
}

export interface Session {
  id: string;
  date: string; // ISO
  day: Day;
  phase1: boolean;
  notes: string;
  programVersion: number;
  circuit?: CircuitLog;
  /** Durata dell'allenamento in secondi (solo se è stato premuto "Inizia allenamento"). */
  durationSec?: number;
}

export interface SetLog extends SetValues {
  id: string;
  sessionId: string;
  exerciseId: string;
  setIndex: number;
  confirmed: boolean; // nel database sono sempre true: le serie non confermate non si salvano
}

/** Valore di un campo nella bozza: testo grezzo, così "12," durante la digitazione non si perde. */
export type DraftField = 'load' | 'reps' | 'seconds';
export type DraftEntry = Partial<Record<DraftField, string>> & {
  /** true = valori tenuti ma NON confermati (conferma tolta con ✓): grigi, non salvati. */
  pending?: boolean;
  /** Esercizi per lato: lato sinistro fatto, manca il destro (la serie non è ancora confermata). */
  leftDone?: boolean;
};

/** Seduta in corso. Una serie presente qui (senza `pending`) è "confermata"; se manca è "precompilata". */
export interface Draft {
  day: Day;
  updatedAt: string;
  sets: Record<string, (DraftEntry | null)[]>;
  notes: string;
  circuit?: CircuitLog;
  /** Orario di inizio (ISO) se il cronometro è partito: sopravvive a chiusura e ricaricamento. */
  startedAt?: string;
}

export interface Settings {
  phase1: boolean;
  cardioProtocol: number;
  lastBackupAt: string | null;
  sessionsSinceBackup: number;
  /** Il recupero parte da solo quando si conferma una serie con ✓. */
  autoRest: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  phase1: true,
  cardioProtocol: 0,
  lastBackupAt: null,
  sessionsSinceBackup: 0,
  autoRest: true,
};
