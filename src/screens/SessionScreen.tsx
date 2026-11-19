import { useEffect, useMemo, useState } from 'react';
import { db, saveDraft, saveSessionFromDraft, setSetting } from '../db/db';
import type { Draft, DraftEntry, Session, SetLog, Settings } from '../db/models';
import { DAYS, WARMUP, exercisesForDay, supersetPartner } from '../program/program';
import type { Day, Exercise } from '../program/types';
import { buildPrefill, lastSessionSets } from '../logic/prefill';
import { progressionHint } from '../logic/progression';
import { durationSec, fmtDuration, formatSet } from '../logic/format';
import { entryToValues, hasValues, isComplete } from '../logic/values';
import { unlockAudio } from '../hooks/sound';
import { ExerciseCard } from '../components/ExerciseCard';

interface Props {
  day: Day;
  sessions: Session[];
  logs: SetLog[];
  settings: Settings;
  /** Seduta con il cronometro in corso (al massimo una). */
  activeDay: Day | null;
  goToDay: (day: Day) => void;
  startRest: (sec: number, label: string) => void;
  toast: (msg: string) => void;
}

const emptyDraft = (day: Day): Draft => ({ day, updatedAt: '', sets: {}, notes: '' });

export function SessionScreen({ day, sessions, logs, settings, activeDay, goToDay, startRest, toast }: Props) {
  const plan = DAYS.find((d) => d.day === day)!;
  const exercises = useMemo(() => exercisesForDay(day), [day]);
  const [draft, setDraft] = useState<Draft | null>(null);

  // interruttore aggiornato subito (senza aspettare il database): niente sfarfallio
  const [phase1, setPhase1] = useState(settings.phase1);
  useEffect(() => setPhase1(settings.phase1), [settings.phase1]);

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
        const count = phase1 ? Math.min(ex.sets, 2) : ex.sets;
        const last = lastSessionSets(ex.id, sessions, logs);
        const lastDate = last.length ? sessions.find((s) => s.id === last[0].sessionId)?.date : undefined;
        const lastText = last.length
          ? `${new Date(lastDate!).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} · ${last.map((l) => formatSet(ex, l)).join(' · ')}`
          : null;
        return { ex, count, prefill: buildPrefill(last, count), hint: progressionHint(ex, last), lastText };
      }),
    [exercises, sessions, logs, phase1],
  );

  if (!draft) return <p className="sub">Caricamento…</p>;

  const started = draft.startedAt;
  const otherActive = activeDay && activeDay !== day ? activeDay : null;

  const setEntry = (exId: string, i: number, entry: DraftEntry | null) =>
    update((d) => {
      const arr = [...(d.sets[exId] ?? [])];
      while (arr.length <= i) arr.push(null);
      arr[i] = entry;
      return { ...d, sets: { ...d.sets, [exId]: arr } };
    });

  /** ✓ toccato: recupero automatico, avviso superset, niente timer sull'ultima serie della seduta. */
  const onCheck = (ex: Exercise, i: number, count: number) => {
    unlockAudio();
    const partner = supersetPartner(ex);
    if (partner) {
      toast(`→ Passa a ${partner.superset}`);
      return;
    }
    const isLastEx = exercises[exercises.length - 1]?.id === ex.id;
    if (isLastEx && i === count - 1) return;
    if (settings.autoRest && ex.restSec > 0) startRest(ex.restSec, ex.name);
  };

  // conteggi per il salvataggio
  let complete = 0;
  let incomplete = 0;
  let pending = 0;
  for (const r of rows) {
    for (let i = 0; i < r.count; i++) {
      const entry = draft.sets[r.ex.id]?.[i];
      if (entry && !entry.pending) {
        const v = entryToValues(entry);
        if (isComplete(r.ex.metric, v)) complete++;
        else if (hasValues(v)) incomplete++;
      } else {
        const v = entry ? entryToValues(entry) : r.prefill[i];
        if (v && hasValues(v)) pending++;
      }
    }
  }
  const hasCircuit = !!draft.circuit && draft.circuit.completedRounds > 0;

  const onStart = () => {
    if (otherActive) {
      toast(`Hai già un allenamento in corso sulla seduta ${otherActive}`);
      return;
    }
    unlockAudio();
    update((d) => ({ ...d, startedAt: new Date().toISOString() }));
  };

  const onCancelTimer = () => {
    if (!confirm('Annullare il cronometro? I valori inseriti restano.')) return;
    update((d) => {
      const next = { ...d };
      delete next.startedAt;
      return next;
    });
  };

  /** Unica azione per "Termina allenamento" e "Salva seduta". */
  const onFinish = async () => {
    if (complete === 0 && !hasCircuit) {
      toast(
        incomplete > 0
          ? 'Serie incomplete: mancano le ripetizioni (o i secondi). Completale per salvarle.'
          : 'Nessuna serie confermata: tocca ✓ sulle serie fatte',
      );
      return;
    }
    const dur = started ? durationSec(started) : undefined;
    const lines: string[] = [];
    if (pending) lines.push(`${pending} serie precompilate non confermate NON verranno salvate.`);
    if (incomplete) lines.push(`${incomplete} serie senza ripetizioni (o secondi) NON verranno salvate.`);
    if (dur != null || lines.length) {
      const head = dur != null ? `Terminare l'allenamento? Durata: ${fmtDuration(dur)}` : 'Salvo la seduta?';
      if (!confirm([head, ...lines].join('\n\n'))) return;
    }
    const maxSets = Object.fromEntries(rows.map((r) => [r.ex.id, r.count]));
    const n = await saveSessionFromDraft(draft, phase1, maxSets, dur);
    if (n > 0) {
      setDraft(emptyDraft(day));
      window.scrollTo(0, 0);
      toast(dur != null ? `Seduta salvata · ${fmtDuration(dur)}` : 'Seduta salvata');
    }
  };

  const onClear = () => {
    if (!confirm('Svuotare tutti i campi di questa seduta?')) return;
    update((d) => ({ ...d, sets: {}, notes: '' }));
  };

  return (
    <>
      <h2>{plan.title}</h2>
      <p className="sub">{plan.subtitle}</p>

      {started ? (
        <>
          <button className="primary big finish" onClick={onFinish}>
            ■ Termina allenamento
          </button>
          <button className="link" onClick={onCancelTimer}>
            Annulla cronometro
          </button>
        </>
      ) : otherActive ? (
        <div className="warnbox">
          Hai un allenamento in corso sulla <b>seduta {otherActive}</b>. Terminalo prima di iniziarne un altro.
          <button className="ghost" onClick={() => goToDay(otherActive)}>
            Vai alla seduta {otherActive}
          </button>
        </div>
      ) : (
        <button className="primary big start" onClick={onStart}>
          ▶ Inizia allenamento
        </button>
      )}

      {settings.sessionsSinceBackup >= 6 && (
        <div className="warnbox">
          {settings.sessionsSinceBackup} sedute dall'ultimo backup. Vai in <b>Info</b> → Esporta backup.
        </div>
      )}
      <label className="toggle">
        <input
          type="checkbox"
          checked={phase1}
          onChange={(e) => {
            setPhase1(e.target.checked);
            void setSetting('phase1', e.target.checked);
          }}
        />
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
          onSetCheck={(i) => onCheck(r.ex, i, r.count)}
          onSetLeft={() => {
            unlockAudio();
            toast('→ Lato destro, senza pausa');
          }}
          onRest={(sec) => {
            unlockAudio();
            startRest(sec, r.ex.name);
          }}
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
      <p className="legend">{complete} serie complete pronte da salvare</p>
      <button className="primary save" onClick={onFinish}>
        {started ? '■ Termina e salva' : 'Salva seduta'}
      </button>
      <button className="ghost" onClick={onClear}>
        Svuota i campi
      </button>
    </>
  );
}
