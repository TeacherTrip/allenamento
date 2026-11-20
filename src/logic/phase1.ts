import type { Settings } from '../db/models';

/**
 * Regole di "Settimane 1-2" (Fase 4-bis, passo 5). Funzioni PURE: provate in tests/phase1.test.ts.
 * - `phase1Since` = data della prima seduta salvata con Settimane 1-2 attive (mai la data del primo avvio).
 * - Dopo 14 giorni da `phase1Since`, se sono ancora attive, la seduta chiede «Disattivarle?».
 *   «Sì» le spegne; «Non ancora» rimanda di 7 giorni. Mai spegnimento automatico.
 * - `phase1Since` vuoto → l'avviso non compare mai.
 * - Riattivate da Info → `phase1Since` e rinvio azzerati: la data diventa quella della prima seduta salvata dopo.
 */

export const PHASE1_DAYS = 14;
export const PHASE1_SNOOZE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

type Phase1Settings = Pick<Settings, 'phase1' | 'phase1Since' | 'phase1SnoozedUntil'>;

/** L'avviso «Settimane 1-2 attive da 2 settimane. Disattivarle?» va mostrato adesso? */
export function shouldAskPhase1Off(s: Phase1Settings, now = new Date()): boolean {
  if (!s.phase1 || !s.phase1Since) return false;
  const since = Date.parse(s.phase1Since);
  if (Number.isNaN(since) || now.getTime() < since + PHASE1_DAYS * DAY_MS) return false;
  if (s.phase1SnoozedUntil) {
    const until = Date.parse(s.phase1SnoozedUntil);
    if (!Number.isNaN(until) && now.getTime() < until) return false;
  }
  return true;
}

/**
 * Al salvataggio di una seduta: nuova data di `phase1Since`, oppure null se non va scritta.
 * Si scrive SOLO se Settimane 1-2 sono attive e `phase1Since` è vuoto.
 */
export function phase1SinceOnSave(s: Pick<Settings, 'phase1' | 'phase1Since'>, sessionDate: string): string | null {
  return s.phase1 && !s.phase1Since ? sessionDate : null;
}

/** Impostazioni da scrivere quando si tocca l'interruttore in Info. */
export function phase1Toggle(on: boolean): Partial<Phase1Settings> {
  return on ? { phase1: true, phase1Since: null, phase1SnoozedUntil: null } : { phase1: false };
}

/** «Non ancora»: l'avviso riappare dopo 7 giorni. */
export function phase1Snooze(now = new Date()): Partial<Phase1Settings> {
  return { phase1SnoozedUntil: new Date(now.getTime() + PHASE1_SNOOZE_DAYS * DAY_MS).toISOString() };
}
