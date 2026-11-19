import { useEffect, useMemo, useState } from 'react';
import { db, deleteDraft, saveDraft, saveSessionFromDraft, setSetting } from '../db/db';
import type { Draft, DraftEntry, Session, SetLog, Settings } from '../db/models';
import { DAYS, WARMUP, exercisesForDay } from '../program/program';
import type { Day } from '../program/types';
import { buildPrefill, lastSessionSets } from '../logic/prefill';
import { progressionHint } from '../logic/progression';
import { formatSet } from '../logic/format';
import { hasValues } from '../logic/values';
import { ExerciseCard } from '../components/ExerciseCard';

interface Props {
  day: Day;
  sessions: Session[];
  logs: SetLog[];
  settings: Settings;
  toast: (msg: string) => void;
}

const emptyDraft = (day: Day): Draft => ({ day, updatedAt: '', sets: {}, notes: '' });

export function SessionScreen({ day, sessions, logs, settings, toast }: Props) {
  const plan = DAYS.find((d) => d.day === day)!;
  const exercises = useMemo(() => exercisesForDay(day), [day]);
  const [draft, setDraft] = useState<Draft | null>(null);

  // carica la bozza salvata (la seduta in corso sopravvive alla chiusura dell'app)
  useEffect(() => {
    let alive = true;
    setDraft(null);
    db.drafts.get(day).then((d) => alive && setDraft(d ?? emptyDraft(day)));
    return () => {
      alive = false;
    };
  }, [day]);

  const update = (fn: (d: Draft) => Draft) =>
    setDraft((prev) => {
      const next = fn(prev ?? emptyDraft(day));
      void saveDraft(next);
      return next;
    });

  const rows = useMemo(
    () =>
      exercises.map((ex) => {
        const count = settings.phase1 ? Math.min(ex.sets, 2) : ex.sets;
        const last = lastSessionSets(ex.id, sessions, logs);
        const lastDate = last.length ? sessions.find((s) => s.id === last[0].sessionId)?.date : undefined;
        const lastText = last.length
          ? `${new Date(lastDate!).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} · ${last.map((l) => formatSet(ex, l)).join(' · ')}`
          : null;
        return { ex, count, prefill: buildPrefill(last, count), hint: progressionHint(ex, last), lastText };
      }),
    [exercises, sessions, logs, settings.phase1],
  );

  if (!draft) return <p className="sub">Caricamento…</p>;

  const setEntry = (exId: string, i: number, entry: DraftEntry | null) =>
    update((d) => {
      const arr = [...(d.sets[exId] ?? [])];
      while (arr.length <= i) arr.push(null);
      arr[i] = entry;
      return { ...d, sets: { ...d.sets, [exId]: arr } };
    });

  // conteggi per il salvataggio
  let confirmedCount = 0;
  let pendingCount = 0;
  for (const r of rows) {
    for (let i = 0; i < r.count; i++) {
      if (draft.sets[r.ex.id]?.[i]) confirmedCount++;
      else if (r.prefill[i] && hasValues(r.prefill[i]!)) pendingCount++;
    }
  }

  const onSave = async () => {
    if (confirmedCount === 0 && !(draft.circuit && draft.circuit.completedRounds > 0)) {
      toast('Nessuna serie confermata: tocca ✓ sulle serie fatte');
      return;
    }
    if (pendingCount > 0 && !confirm(`${pendingCount} serie precompilate non confermate NON verranno salvate. Salvo la seduta?`)) return;
    const maxSets = Object.fromEntries(rows.map((r) => [r.ex.id, r.count]));
    const n = await saveSessionFromDraft(draft, settings.phase1, maxSets);
    if (n > 0) {
      setDraft(emptyDraft(day));
      window.scrollTo(0, 0);
      toast('Seduta salvata');
    }
  };

  const onClear = async () => {
    if (!confirm('Svuotare tutti i campi di questa seduta?')) return;
    await deleteDraft(day);
    setDraft(emptyDraft(day));
  };

  return (
    <>
      <h2>{plan.title}</h2>
      <p className="sub">{plan.subtitle}</p>
      {settings.sessionsSinceBackup >= 6 && (
        <div className="warnbox">
          {settings.sessionsSinceBackup} sedute dall'ultimo backup. Vai in <b>Info</b> → Esporta backup.
        </div>
      )}
      <label className="toggle">
        <input type="checkbox" checked={settings.phase1} onChange={(e) => void setSetting('phase1', e.target.checked)} />
        Settimane 1-2: massimo 2 serie, RIR 3
      </label>
      <div className="box">
        <b>Riscaldamento (5-6 min)</b>
        {WARMUP}
      </div>
      <p className="legend">
        <span className="dot prefilled" /> precompilato dall'ultima volta · <span className="dot confirmed" /> confermato
      </p>

      {rows.map((r) => (
        <ExerciseCard
          key={r.ex.id}
          ex={r.ex}
          count={r.count}
          prefill={r.prefill}
          entries={draft.sets[r.ex.id] ?? []}
          hint={r.hint}
          lastText={r.lastText}
          onSetChange={(i, e) => setEntry(r.ex.id, i, e)}
        />
      ))}

      {day === 'C' && (
        <div className="box">
          <b>Circuito cardio</b>Il timer del circuito arriva nella Fase 5.
        </div>
      )}

      <textarea
        placeholder="Note della seduta (sensazioni, dolori, ...)"
        value={draft.notes}
        onChange={(e) => {
          const notes = e.target.value;
          update((d) => ({ ...d, notes }));
        }}
      />
      <button className="primary" onClick={onSave}>
        Salva seduta ({confirmedCount} serie confermate)
      </button>
      <button className="ghost" onClick={onClear}>
        Svuota i campi
      </button>
    </>
  );
}
