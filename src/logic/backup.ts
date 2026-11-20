import type { Session, SetLog, Settings } from '../db/models';
import { DEFAULT_SETTINGS, SETTINGS_KEYS_V1 } from '../db/models';
import { upgradeSession } from '../db/migrate';
import { PROGRAM_VERSION } from '../program/program';
import type { Program } from '../program/types';

/** 1 = fino alla Fase 7; 2 = Fase 4-bis (schede nel backup, sedute con programName e plan). */
export const BACKUP_FORMAT_VERSION = 2;

export interface BackupFile {
  app: 'TeacherGym';
  formatVersion: number;
  exportedAt: string;
  programVersion: number;
  sessions: Session[];
  setLogs: SetLog[];
  settings: Settings;
  /** Dalla versione 2. */
  programs?: Program[];
}

export interface BackupData {
  sessions: Session[];
  setLogs: SetLog[];
  /** Solo le impostazioni presenti nel file (un backup v1 non contiene nome, lato, primo avvio…). */
  settings?: Partial<Settings>;
  /** Solo nei backup v2: sostituiscono le schede attuali. */
  programs?: Program[];
}

export function buildBackup(sessions: Session[], setLogs: SetLog[], settings: Settings, programs: Program[], now = new Date()): BackupFile {
  return {
    app: 'TeacherGym',
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    programVersion: PROGRAM_VERSION,
    sessions,
    setLogs,
    settings,
    programs,
  };
}

export function backupFileName(now = new Date()): string {
  return `teachergym-backup-${now.toISOString().slice(0, 10)}.json`;
}

export type DetectedFormat = 'teachergym' | 'prototype' | 'unknown';

export function detectFormat(obj: unknown): DetectedFormat {
  if (!obj || typeof obj !== 'object') return 'unknown';
  const o = obj as Record<string, unknown>;
  if (o.app === 'TeacherGym') return 'teachergym';
  if (Array.isArray(o.sessions) && o.sessions.every((s) => s && typeof s === 'object' && 'entries' in s)) return 'prototype';
  return 'unknown';
}

const isStr = (x: unknown): x is string => typeof x === 'string';
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const optNum = (x: unknown) => x === undefined || isNum(x);

/** Valida un backup TeacherGym. Lancia un Error con messaggio in italiano se non valido. */
export function parseBackup(obj: unknown): BackupData {
  if (detectFormat(obj) !== 'teachergym') throw new Error('Il file non è un backup di TeacherGym.');
  const o = obj as Partial<BackupFile>;
  if (!isNum(o.formatVersion) || o.formatVersion > BACKUP_FORMAT_VERSION)
    throw new Error('Versione del backup non supportata: aggiorna l’app.');
  if (!Array.isArray(o.sessions) || !Array.isArray(o.setLogs)) throw new Error('Backup incompleto.');

  const v1 = o.formatVersion < 2;
  // v1: solo le schede A/B/C; v2: qualsiasi id di scheda
  const validDay = (d: unknown) => (v1 ? ['A', 'B', 'C'].includes(d as string) : isStr(d) && d !== '');
  const sessions: Session[] = o.sessions.filter(
    (s): s is Session =>
      !!s && isStr(s.id) && isStr(s.date) && !Number.isNaN(Date.parse(s.date)) && validDay(s.day) &&
      (s.programName === undefined || isStr(s.programName)) && (s.plan === undefined || Array.isArray(s.plan)),
  ).map((s) =>
    upgradeSession({
      id: s.id,
      date: s.date,
      day: s.day,
      ...(s.programName !== undefined ? { programName: s.programName } : {}),
      ...(s.plan !== undefined ? { plan: s.plan } : {}),
      phase1: !!s.phase1,
      notes: isStr(s.notes) ? s.notes : '',
      programVersion: isNum(s.programVersion) ? s.programVersion : 1,
      ...(s.circuit ? { circuit: s.circuit } : {}),
      ...(isNum(s.durationSec) ? { durationSec: s.durationSec } : {}),
    }),
  );
  if (sessions.length !== o.sessions.length) throw new Error('Il backup contiene sedute non valide.');

  const ids = new Set(sessions.map((s) => s.id));
  const setLogs: SetLog[] = o.setLogs.filter(
    (l): l is SetLog =>
      !!l && isStr(l.id) && isStr(l.sessionId) && isStr(l.exerciseId) && isNum(l.setIndex) &&
      optNum(l.load) && optNum(l.reps) && optNum(l.seconds),
  );
  if (setLogs.length !== o.setLogs.length) throw new Error('Il backup contiene serie non valide.');
  if (setLogs.some((l) => !ids.has(l.sessionId))) throw new Error('Il backup contiene serie senza seduta.');

  // impostazioni: solo chiavi conosciute e presenti nel file (v1: solo quelle della versione 1)
  let settings: Partial<Settings> | undefined;
  if (o.settings && typeof o.settings === 'object') {
    const keys: readonly string[] = v1 ? SETTINGS_KEYS_V1 : Object.keys(DEFAULT_SETTINGS);
    const src = o.settings as unknown as Record<string, unknown>;
    settings = Object.fromEntries(keys.filter((k) => k in src).map((k) => [k, src[k]])) as Partial<Settings>;
  }

  let programs: Program[] | undefined;
  if (!v1) {
    if (!Array.isArray(o.programs) || !o.programs.every(isValidProgram)) throw new Error('Il backup contiene schede non valide.');
    programs = o.programs;
  }
  return { sessions, setLogs: setLogs.map((l) => ({ ...l, confirmed: true })), settings, programs };
}

function isValidProgram(p: unknown): p is Program {
  const x = p as Program | null;
  return (
    !!x && isStr(x.id) && x.id !== '' && isStr(x.name) && isNum(x.order) && Array.isArray(x.items) &&
    x.items.every(
      (i) => !!i && isStr(i.key) && isStr(i.exerciseId) && isNum(i.sets) && Array.isArray(i.repRange) &&
        i.repRange.length === 2 && i.repRange.every(isNum) && (i.restSec === null || isNum(i.restSec)),
    )
  );
}
