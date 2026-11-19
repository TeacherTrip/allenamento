import type { Session, SetLog, Settings } from '../db/models';
import { DEFAULT_SETTINGS } from '../db/models';
import { PROGRAM_VERSION } from '../program/program';

export const BACKUP_FORMAT_VERSION = 1;

export interface BackupFile {
  app: 'TeacherGym';
  formatVersion: number;
  exportedAt: string;
  programVersion: number;
  sessions: Session[];
  setLogs: SetLog[];
  settings: Settings;
}

export interface BackupData {
  sessions: Session[];
  setLogs: SetLog[];
  settings?: Settings;
}

export function buildBackup(sessions: Session[], setLogs: SetLog[], settings: Settings, now = new Date()): BackupFile {
  return {
    app: 'TeacherGym',
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    programVersion: PROGRAM_VERSION,
    sessions,
    setLogs,
    settings,
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

  const sessions: Session[] = o.sessions.filter(
    (s): s is Session =>
      !!s && isStr(s.id) && isStr(s.date) && !Number.isNaN(Date.parse(s.date)) && ['A', 'B', 'C'].includes(s.day),
  ).map((s) => ({
    id: s.id,
    date: s.date,
    day: s.day,
    phase1: !!s.phase1,
    notes: isStr(s.notes) ? s.notes : '',
    programVersion: isNum(s.programVersion) ? s.programVersion : 1,
    ...(s.circuit ? { circuit: s.circuit } : {}),
  }));
  if (sessions.length !== o.sessions.length) throw new Error('Il backup contiene sedute non valide.');

  const ids = new Set(sessions.map((s) => s.id));
  const setLogs: SetLog[] = o.setLogs.filter(
    (l): l is SetLog =>
      !!l && isStr(l.id) && isStr(l.sessionId) && isStr(l.exerciseId) && isNum(l.setIndex) &&
      optNum(l.load) && optNum(l.reps) && optNum(l.seconds),
  );
  if (setLogs.length !== o.setLogs.length) throw new Error('Il backup contiene serie non valide.');
  if (setLogs.some((l) => !ids.has(l.sessionId))) throw new Error('Il backup contiene serie senza seduta.');

  const settings = o.settings ? { ...DEFAULT_SETTINGS, ...o.settings } : undefined;
  return { sessions, setLogs: setLogs.map((l) => ({ ...l, confirmed: true })), settings };
}
