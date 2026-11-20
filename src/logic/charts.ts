import type { Session, SetLog, SetValues } from '../db/models';
import { bandOptions } from '../program/bands';
import { CATALOG_EXERCISES } from '../program/program';
import type { Exercise, Muscle, Program } from '../program/types';
import { bestScore, difficultyStep, e1rm, setScore } from './difficulty';
import { fmtNum } from './values';

/** Gruppi muscolari, nell'ordine dei grafici. */
export const MUSCLES: Muscle[] = ['quadricipiti', 'femorali', 'glutei', 'petto', 'schiena', 'spalle', 'bicipiti', 'tricipiti', 'core', 'polpacci'];

/** Esercizi che contano per gruppi muscolari (serie settimanali, indici): la mobilità no. */
const countsForMuscles = (ex: Exercise) => ex.kind !== 'mobility';

/** Una seduta in cui l'esercizio è stato fatto, con le sue serie. */
export interface ExerciseSession {
  session: Session;
  sets: SetLog[];
}

/** Sedute (in ordine di data) in cui l'esercizio ha almeno una serie registrata. */
export function exerciseSessions(exerciseId: string, sessions: Session[], logs: SetLog[]): ExerciseSession[] {
  const byId = new Map<string, SetLog[]>();
  for (const l of logs) {
    if (l.exerciseId !== exerciseId) continue;
    const arr = byId.get(l.sessionId) ?? [];
    arr.push(l);
    byId.set(l.sessionId, arr);
  }
  return sessions
    .filter((s) => byId.has(s.id))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((session) => ({ session, sets: byId.get(session.id)!.sort((a, b) => a.setIndex - b.setIndex) }));
}

/**
 * Serie migliore (punteggio più alto: per `kg` l'e1RM).
 * A pari punteggio vince quella con più ripetizioni (serve per le serie a 0 kg, che hanno e1RM 0).
 */
export function bestSet(ex: Exercise, sets: SetValues[]): SetValues | undefined {
  let best: SetValues | undefined;
  let max = -1;
  for (const s of sets) {
    const sc = setScore(ex, s);
    if (sc > max || (sc === max && (s.reps ?? 0) > (best?.reps ?? 0))) {
      max = sc;
      best = s;
    }
  }
  return best;
}

// ---------- grafici per esercizio ----------

export interface Series {
  label: string;
  values: (number | null)[];
}

export interface ChartSpec {
  title: string;
  unit: string;
  series: Series[];
  /** Asse dei gradini (elastici, livelli): etichetta di ogni gradino, dal più facile al più difficile. */
  steps?: string[];
}

export interface SummaryRow {
  label: string;
  first: string;
  last: string;
  /** "+2,3 kg (+12%)", "=" oppure "più difficile". */
  delta: string;
  /** Segno della variazione (per il colore del testo): 1 meglio, -1 peggio, 0 uguale. */
  trend: -1 | 0 | 1;
}

/** Sedute a 0 kg di un esercizio `kg`: 'all' = tutte (niente carico), 'mixed' = alcune, 'none' = nessuna. */
export type ZeroKg = 'all' | 'mixed' | 'none';

export interface ExerciseCharts {
  dates: string[];
  zeroKg: ZeroKg;
  charts: ChartSpec[];
  summary: SummaryRow[];
}

/** Etichette dei gradini di difficoltà (indice = gradino). */
export function stepLabels(ex: Exercise): string[] {
  if (ex.metric === 'level') return ['L1', 'L2', 'L3', 'L4', 'L5'];
  if (ex.metric === 'band') {
    return bandOptions(ex.bandDirection ?? 'resistance').map((o) => (o.value === 0 ? 'nessuno' : o.label.split(' ')[0]));
  }
  return [];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const sum = (arr: (number | undefined)[]) => arr.reduce<number>((a, b) => a + (b ?? 0), 0);

/** "+2,3 kg (+12%)" · "−1 (−5%)" · "=". */
export function fmtDelta(first: number, last: number, unit: string): { text: string; trend: -1 | 0 | 1 } {
  const d = round1(last - first);
  if (d === 0) return { text: '=', trend: 0 };
  const sign = d > 0 ? '+' : '−';
  const u = unit ? ` ${unit}` : '';
  // percentuale sulla differenza vera, non su quella arrotondata (6,5 → 10,67: +64%, non +65%)
  const pct = first > 0 ? ` (${sign}${fmtNum(Math.round(Math.abs((last - first) / first) * 100))}%)` : '';
  return { text: `${sign}${fmtNum(Math.abs(d))}${u}${pct}`, trend: d > 0 ? 1 : -1 };
}

function numericRow(label: string, values: (number | null)[], unit: string): SummaryRow | null {
  const known = values.filter((v): v is number => v != null);
  if (!known.length) return null;
  const first = known[0];
  const last = known[known.length - 1];
  const u = unit ? ` ${unit}` : '';
  const { text, trend } = fmtDelta(first, last, unit);
  return { label, first: `${fmtNum(round1(first))}${u}`, last: `${fmtNum(round1(last))}${u}`, delta: text, trend };
}

/** Dati dei grafici di un esercizio: serie per seduta + riepilogo "Partenza → Attuale". */
export function exerciseCharts(ex: Exercise, sessions: Session[], logs: SetLog[]): ExerciseCharts {
  const rows = exerciseSessions(ex.id, sessions, logs);
  const dates = rows.map((r) => r.session.date);
  const side = ex.unilateral ? ' per lato' : '';
  const charts: ChartSpec[] = [];
  const summary: (SummaryRow | null)[] = [];

  let zeroKg: ZeroKg = 'none';
  if (ex.metric === 'kg') {
    const all = rows.flatMap((r) => r.sets);
    if (!all.some((s) => (s.load ?? 0) > 0)) zeroKg = 'all';
    else if (all.some((s) => s.load === 0)) zeroKg = 'mixed';
  }

  if (zeroKg === 'all') {
    // sempre a 0 kg (corpo libero): niente e1RM né carico, solo le ripetizioni
    const reps = rows.map((r) => sum(r.sets.map((s) => s.reps)));
    charts.push({ title: `Ripetizioni totali${side}`, unit: 'reps', series: [{ label: 'Ripetizioni totali', values: reps }] });
    summary.push(numericRow('Ripetizioni totali', reps, ''));
  } else if (ex.metric === 'kg') {
    const best = rows.map((r) => bestSet(ex, r.sets));
    // e1RM solo con carico > 0: a 0 kg (corpo libero) non ha senso → buco nel grafico
    const est = best.map((b) => (b?.load != null && b.load > 0 && b.reps != null ? round1(e1rm(b.load, b.reps)) : null));
    const load = best.map((b) => b?.load ?? null);
    charts.push({
      title: 'Serie migliore',
      unit: 'kg',
      series: [
        { label: 'e1RM (massimale stimato)', values: est },
        { label: 'Carico', values: load },
      ],
    });
    summary.push(numericRow('e1RM', est, 'kg'), numericRow('Carico', load, 'kg'));
    // con sedute a 0 kg conta anche quante ripetizioni si fanno
    if (rows.some((r) => r.sets.some((s) => s.load === 0))) {
      const reps = rows.map((r) => sum(r.sets.map((s) => s.reps)));
      charts.push({ title: `Ripetizioni totali${side}`, unit: 'reps', series: [{ label: 'Ripetizioni totali', values: reps }] });
      summary.push(numericRow('Ripetizioni totali', reps, ''));
    }
  } else if (ex.metric === 'band' || ex.metric === 'level') {
    const steps = stepLabels(ex);
    // gradino più difficile usato nella seduta
    const step = rows.map((r) => Math.max(...r.sets.map((s) => difficultyStep(ex, s.load))));
    const reps = rows.map((r) => sum(r.sets.map((s) => s.reps)));
    const name = ex.metric === 'band' ? 'Elastico' : 'Livello';
    charts.push({
      title: ex.metric === 'band' ? (ex.bandDirection === 'assistance' ? 'Elastico (più in alto = meno aiuto)' : 'Elastico (più in alto = più pesante)') : 'Livello di appoggio',
      unit: '',
      series: [{ label: name, values: step }],
      steps,
    });
    charts.push({ title: `Ripetizioni totali${side}`, unit: 'reps', series: [{ label: 'Ripetizioni totali', values: reps }] });
    if (step.length) {
      const a = step[0];
      const b = step[step.length - 1];
      const lab = (s: number) => steps[s] ?? String(s);
      summary.push({
        label: name,
        first: lab(a),
        last: lab(b),
        delta: a === b ? '=' : b > a ? 'più difficile' : 'più facile',
        trend: a === b ? 0 : b > a ? 1 : -1,
      });
    }
    summary.push(numericRow('Ripetizioni totali', reps, ''));
  } else if (ex.metric === 'bodyweight') {
    const reps = rows.map((r) => sum(r.sets.map((s) => s.reps)));
    charts.push({ title: `Ripetizioni totali${side}`, unit: 'reps', series: [{ label: 'Ripetizioni totali', values: reps }] });
    summary.push(numericRow('Ripetizioni totali', reps, ''));
  } else {
    const secs = rows.map((r) => sum(r.sets.map((s) => s.seconds)));
    charts.push({ title: `Secondi totali${side}`, unit: 's', series: [{ label: 'Secondi totali', values: secs }] });
    summary.push(numericRow('Secondi totali', secs, 's'));
  }

  return { dates, zeroKg, charts, summary: summary.filter((s): s is SummaryRow => s != null) };
}

// ---------- indice di progressione ----------

export interface IndexPoint {
  date: string;
  sessionId: string;
  value: number;
}

/** Indice dell'esercizio per seduta: punteggio della serie migliore / punteggio della prima seduta × 100. */
export function exerciseIndex(ex: Exercise, sessions: Session[], logs: SetLog[]): IndexPoint[] {
  const out: IndexPoint[] = [];
  let base = 0;
  for (const r of exerciseSessions(ex.id, sessions, logs)) {
    const score = bestScore(ex, r.sets);
    if (score <= 0) continue;
    if (!base) base = score;
    out.push({ date: r.session.date, sessionId: r.session.id, value: (score / base) * 100 });
  }
  return out;
}

/**
 * Indice di un gruppo muscolare nel tempo: media degli indici degli esercizi in cui il gruppo è
 * PRIMARIO, usando per ciascuno l'ultimo valore noto. Mai somme di kg di esercizi diversi.
 * Comprende anche gli esercizi tolti dalla scheda (lo storico resta).
 */
export function groupIndex(group: Muscle, sessions: Session[], logs: SetLog[], exercises: Exercise[] = CATALOG_EXERCISES): IndexPoint[] {
  const events: (IndexPoint & { ex: string })[] = [];
  for (const ex of exercises) {
    if (!countsForMuscles(ex) || !ex.muscles.primary.includes(group)) continue;
    for (const p of exerciseIndex(ex, sessions, logs)) events.push({ ...p, ex: ex.id });
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  const last = new Map<string, number>();
  const out: IndexPoint[] = [];
  for (const e of events) {
    last.set(e.ex, e.value);
    const avg = round1(sum([...last.values()]) / last.size);
    const prev = out[out.length - 1];
    // più esercizi nella stessa seduta: un solo punto, con la media aggiornata
    if (prev && prev.sessionId === e.sessionId) prev.value = avg;
    else out.push({ date: e.date, sessionId: e.sessionId, value: avg });
  }
  return out;
}

/** Il gruppo ha sedute a 0 kg in esercizi `kg` dove è primario? (quelle sedute non entrano nell'indice) */
export function groupHasZeroKg(group: Muscle, logs: SetLog[], exercises: Exercise[] = CATALOG_EXERCISES): boolean {
  const ids = new Set(
    exercises.filter((e) => e.metric === 'kg' && countsForMuscles(e) && e.muscles.primary.includes(group)).map((e) => e.id),
  );
  return logs.some((l) => ids.has(l.exerciseId) && l.load === 0);
}

// ---------- serie settimanali ----------

/** Lunedì della settimana (ora locale), come "AAAA-MM-GG". */
export function weekStart(iso: string): string {
  const d = new Date(iso);
  const dow = (d.getDay() + 6) % 7; // lunedì = 0
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${m.getFullYear()}-${p(m.getMonth() + 1)}-${p(m.getDate())}`;
}

export type MuscleCount = Record<Muscle, number>;
const zero = (): MuscleCount => Object.fromEntries(MUSCLES.map((m) => [m, 0])) as MuscleCount;

/** Serie per gruppo muscolare in ogni settimana: primario = 1, secondario = 0,5. */
export function weeklySets(sessions: Session[], logs: SetLog[], exercises: Exercise[] = CATALOG_EXERCISES): Map<string, MuscleCount> {
  const exById = new Map(exercises.map((e) => [e.id, e]));
  const week = new Map(sessions.map((s) => [s.id, weekStart(s.date)]));
  const out = new Map<string, MuscleCount>();
  for (const l of logs) {
    const ex = exById.get(l.exerciseId);
    const w = week.get(l.sessionId);
    if (!ex || !w || !countsForMuscles(ex)) continue;
    const c = out.get(w) ?? zero();
    for (const m of ex.muscles.primary) c[m] += 1;
    for (const m of ex.muscles.secondary) c[m] += 0.5;
    out.set(w, c);
  }
  return out;
}

/** Gruppi muscolari con almeno una serie (primaria o secondaria) nelle sedute salvate, nell'ordine dei grafici. */
export function trainedMuscles(weekly: Map<string, MuscleCount>): Muscle[] {
  return MUSCLES.filter((m) => [...weekly.values()].some((c) => c[m] > 0));
}

// ---------- menu degli esercizi ----------

export interface MenuGroup {
  label: string;
  ids: string[];
}

/**
 * Menu «Per esercizio»: una voce per scheda attuale (ogni esercizio una volta sola, nella prima scheda
 * in cui compare), poi «Altri esercizi con dati» (fuori dalle schede di oggi ma con serie salvate).
 */
export function exerciseMenu(programs: Program[], withData: Set<string>, exercises: Exercise[] = CATALOG_EXERCISES): MenuGroup[] {
  const known = new Set(exercises.map((e) => e.id));
  const seen = new Set<string>();
  const out: MenuGroup[] = [];
  for (const p of [...programs].sort((a, b) => a.order - b.order)) {
    const ids: string[] = [];
    for (const it of p.items) {
      if (seen.has(it.exerciseId) || !known.has(it.exerciseId)) continue;
      seen.add(it.exerciseId);
      ids.push(it.exerciseId);
    }
    if (ids.length) out.push({ label: `Seduta ${p.name}`, ids });
  }
  const others = exercises.filter((e) => !seen.has(e.id) && withData.has(e.id)).map((e) => e.id);
  if (others.length) out.push({ label: 'Altri esercizi con dati', ids: others });
  return out;
}

/** Le ultime `n` settimane fino a quella di `now` compresa (anche vuote), dalla più vecchia. */
export function lastWeeks(n: number, now = new Date()): string[] {
  const out: string[] = [];
  const cur = new Date(weekStart(now.toISOString()) + 'T12:00:00');
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() - 7 * i, 12);
    out.push(weekStart(d.toISOString()));
  }
  return out;
}

/** "05/11" */
export function shortDate(isoOrDay: string): string {
  const d = isoOrDay.length === 10 ? new Date(isoOrDay + 'T12:00:00') : new Date(isoOrDay);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
}
