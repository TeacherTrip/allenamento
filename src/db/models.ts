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
export type DraftEntry = Partial<Record<DraftField, string>>;

/** Seduta in corso. Una serie presente qui è "confermata"; se manca è "precompilata". */
export interface Draft {
  day: Day;
  updatedAt: string;
  sets: Record<string, (DraftEntry | null)[]>;
  notes: string;
  circuit?: CircuitLog;
}

export interface Settings {
  phase1: boolean;
  cardioProtocol: number;
  lastBackupAt: string | null;
  sessionsSinceBackup: number;
}

export const DEFAULT_SETTINGS: Settings = {
  phase1: true,
  cardioProtocol: 0,
  lastBackupAt: null,
  sessionsSinceBackup: 0,
};
