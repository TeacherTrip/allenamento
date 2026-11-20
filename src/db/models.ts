import type { Day, ProgramItem, TemplateId } from '../program/types';
import type { CircuitRun } from '../logic/circuit';

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
  /** Id della scheda (Modello 1 dalla migrazione: 'A' / 'B' / 'C'; schede nuove: id generato). */
  day: Day;
  /** Nome della scheda quando la seduta è stata salvata (lo storico raggruppa per id e mostra questo). */
  programName?: string;
  /** Copia delle voci previste dalla scheda al salvataggio: modificare la scheda dopo non cambia lo storico. */
  plan?: ProgramItem[];
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
  /** Serie aggiunta con "+ Serie" oltre a quelle previste: conta nel volume, non nel suggerimento di progressione. */
  extra?: boolean;
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
  /** Serie extra ("+ Serie"), separate da quelle previste: null = precompilata dalla riga sopra. */
  extra?: Record<string, (DraftEntry | null)[]>;
  notes: string;
  circuit?: CircuitLog;
  /** Timer del circuito in corso (seduta C). */
  circuitRun?: CircuitRun;
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
  /** Nome di chi usa l'app: resta solo su questo dispositivo (e nei suoi backup). */
  userName: string;
  /** Lato da cui partono gli esercizi unilaterali. */
  startSide: 'left' | 'right';
  /** Modello da cui sono nate le schede (null = nessuno: primo avvio da fare). */
  templateId: TemplateId | null;
  /** Primo avvio già fatto (o installazione esistente migrata). */
  onboarded: boolean;
  /** Quando è stato attivato "Settimane 1-2" (ISO), per la riga "attive dal gg/mm". */
  phase1Since: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  phase1: true,
  cardioProtocol: 0,
  lastBackupAt: null,
  sessionsSinceBackup: 0,
  autoRest: true,
  userName: '',
  startSide: 'left',
  templateId: null,
  onboarded: false,
  phase1Since: null,
};

/** Chiavi delle impostazioni della versione 1 del database (prima della Fase 4-bis). */
export const SETTINGS_KEYS_V1 = ['phase1', 'cardioProtocol', 'lastBackupAt', 'sessionsSinceBackup', 'autoRest'] as const;
