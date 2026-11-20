import type { Session, Settings } from './models';
import { DEFAULT_SETTINGS } from './models';
import { TEMPLATE_BY_ID } from '../catalog/templates';
import type { Program, ProgramItem } from '../program/types';

/**
 * Migrazione dei dati dalla versione 1 alla 2 del database (Fase 4-bis).
 * Funzioni PURE: non toccano il database, così si provano da sole (tests/migrazione.test.ts).
 * Regole:
 * - si AGGIUNGONO campi e righe, non si cancella né si modifica nulla di quello che c'era;
 * - IDEMPOTENTE: rieseguita su dati già migrati non cambia niente.
 */

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/**
 * Schede del Modello 1 con gli id 'A', 'B', 'C'. Li assegna SOLO la migrazione delle installazioni esistenti:
 * ogni scheda creata dopo riceve un id generato.
 */
export function model1Programs(): Program[] {
  return clone(TEMPLATE_BY_ID.m1.programs);
}

/** Voci previste di una scheda del Modello 1 (copia), per le sedute di prima della Fase 4-bis. */
export function model1Plan(day: string): ProgramItem[] | undefined {
  const p = TEMPLATE_BY_ID.m1.programs.find((x) => x.id === day);
  return p ? clone(p.items) : undefined;
}

/**
 * Seduta della versione 1 → versione 2: aggiunge `programName` e `plan` se mancano.
 * Tutte le sedute di prima sono della scheda versione 1 (Modello 1).
 * Restituisce la STESSA seduta se non c'è niente da aggiungere.
 */
export function upgradeSession(s: Session): Session {
  if (s.programName != null && s.plan != null) return s;
  const out: Session = { ...s };
  if (out.programName == null) out.programName = s.day;
  if (out.plan == null) {
    const plan = model1Plan(s.day);
    if (plan) out.plan = plan;
    else out.plan = []; // scheda sconosciuta: nessuna copia possibile, la seduta resta intatta
  }
  return out;
}

export interface SettingRow {
  key: keyof Settings;
  value: unknown;
}

/**
 * Impostazioni da AGGIUNGERE per un'installazione esistente (solo le chiavi che mancano):
 * primo avvio già fatto, Modello 1, lato sinistro (com'era prima), data di "Settimane 1-2".
 */
export function settingsToAdd(rows: SettingRow[], sessions: Pick<Session, 'date'>[]): SettingRow[] {
  const has = new Map(rows.map((r) => [r.key, r.value]));
  const out: SettingRow[] = [];
  const add = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (!has.has(key)) out.push({ key, value });
  };
  add('onboarded', true);
  add('templateId', 'm1');
  add('startSide', 'left');
  add('userName', '');
  const phase1 = (has.has('phase1') ? has.get('phase1') : DEFAULT_SETTINGS.phase1) as boolean;
  if (phase1) {
    // data sconosciuta: la prima seduta registrata; senza sedute resta vuota
    // (si scrive al salvataggio della prima seduta: niente avviso «Disattivarle?» senza sedute)
    const first = sessions.reduce<string | null>((m, s) => (m == null || s.date < m ? s.date : m), null);
    add('phase1Since', first);
  } else {
    add('phase1Since', null);
  }
  return out;
}
