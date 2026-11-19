import { useEffect, useMemo, useState } from 'react';
import { db, saveDraft, saveSessionFromDraft, setSetting } from '../db/db';
import type { Draft, DraftEntry, Session, SetLog, SetValues, Settings } from '../db/models';
import { DAYS, WARMUP, exercisesForDay, supersetPartner } from '../program/program';
import type { Day, Exercise } from '../program/types';
import { buildPrefill, lastSessionSets } from '../logic/prefill';
import { progressionHint } from '../logic/progression';
import { durationSec, fmtDuration, formatSet } from '../logic/format';
import { entryToValues, hasValues, isComplete } from '../logic/values';
import { unlockAudio } from '../hooks/sound';
import { wakeLockSupported } from '../hooks/useWakeLock';
import { ExerciseCard } from '../components/ExerciseCard';
import { Thumb } from '../components/Thumb';
import { CARDIO_EXERCISES } from '../program/cardio';
import type { SimpleItem } from '../program/types';

interface Props {
  day: Day;
  sessions: Session[];
  logs: SetLog[];
  settings: Settings;
  /** Seduta con il cronometro in corso (al massimo una). */
  activeDay: Day | null;
  goToDay: (day: Day) => void;
  startRest: (sec: number, label: string) => void;
  toast: (msg: string, ms?: number) => void;
}

const emptyDraft = (day: Day): Draft => ({ day, updatedAt: '', sets: {}, notes: '' });

export const SCREEN_WARNING = 'Lo schermo può spegnersi: allunga il tempo di spegnimento del telefono';

/** Avviso "schermo può spegnersi": una sola volta su questo dispositivo. */
let screenWarned = false;
function shouldWarnScreen(): boolean {
  if (wakeLockSupported() || screenWarned) return false;
  screenWarned = true;
  try {
    if (localStorage.getItem('tg.screenWarned')) return false;
    localStorage.setItem('tg.screenWarned', '1');
  } catch {
    /* storage non disponibile: vale la variabile in memoria */
  }
  return true;
}

/** Valori mostrati in una riga: quelli scritti/confermati o, se manca la bozza, la precompilazione. */
const shownValues = (entry: DraftEntry | null | undefined, prefill: SetValues | undefined): SetValues | undefined =>
  entry ? entryToValues(entry) : prefill;

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
        // precompilazione e suggerimento usano solo le serie PREVISTE dell'ultima volta (non le extra)
        const planned = last.filter((l) => !l.extra);
        const lastDate = last.length ? sessions.find((s) => s.id === last[0].sessionId)?.date : undefined;
        const lastText = last.length
          ? `${new Date(lastDate!).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} · ${last
              .map((l) => formatSet(ex, l) + (l.extra ? ' (extra)' : ''))
              .join(' · ')}`
          : null;
        return { ex, count, prefill: buildPrefill(planned, count), hint: progressionHint(ex, planned), lastText };
      }),
    [exercises, sessions, logs, phase1],
  );

  // draft.day !== day: appena cambiata scheda, la bozza è ancora quella del giorno prima → aspetta
  if (!draft || draft.day !== day) return <p className="sub">Caricamento…</p>;

  const started = draft.startedAt;
  const otherActive = activeDay && activeDay !== day ? activeDay : null;

  // serie extra: precompilate con i valori della riga sopra
  const extraOf = (exId: string) => draft.extra?.[exId] ?? [];
  const extraPrefillOf = (r: (typeof rows)[number]): (SetValues | undefined)[] => {
    const out: (SetValues | undefined)[] = [];
    let prev = shownValues(draft.sets[r.ex.id]?.[r.count - 1], r.prefill[r.count - 1]);
    for (const entry of extraOf(r.ex.id)) {
      out.push(prev);
      prev = shownValues(entry, prev);
    }
    return out;
  };

  const setEntry = (exId: string, i: number, entry: DraftEntry | null) =>
    update((d) => {
      const arr = [...(d.sets[exId] ?? [])];
      while (arr.length <= i) arr.push(null);
      arr[i] = entry;
      return { ...d, sets: { ...d.sets, [exId]: arr } };
    });

  const setExtra = (exId: string, fn: (arr: (DraftEntry | null)[]) => (DraftEntry | null)[]) =>
    update((d) => ({ ...d, extra: { ...(d.extra ?? {}), [exId]: fn([...(d.extra?.[exId] ?? [])]) } }));

  /** Tasto di conferma: avviso superset, recupero automatico, niente timer sull'ultima serie della seduta (extra comprese). */
  const onCheck = (ex: Exercise, rowIndex: number, totalRows: number) => {
    unlockAudio();
    const partner = supersetPartner(ex);
    if (partner) {
      toast(`→ Passa a ${partner.superset}`);
      return;
    }
    const isLastEx = exercises[exercises.length - 1]?.id === ex.id;
    if (isLastEx && rowIndex === totalRows - 1) return;
    if (settings.autoRest && ex.restSec > 0) startRest(ex.restSec, ex.name);
  };

  // conteggi per il salvataggio (serie previste + extra)
  let complete = 0;
  let incomplete = 0;
  let pending = 0;
  const countRow = (ex: Exercise, entry: DraftEntry | null | undefined, prefill: SetValues | undefined) => {
    if (entry && !entry.pending) {
      const v = entryToValues(entry);
      if (isComplete(ex.metric, v)) complete++;
      else if (hasValues(v)) incomplete++;
    } else {
      const v = shownValues(entry, prefill);
      if (v && hasValues(v)) pending++;
    }
  };
  for (const r of rows) {
    for (let i = 0; i < r.count; i++) countRow(r.ex, draft.sets[r.ex.id]?.[i], r.prefill[i]);
    const xp = extraPrefillOf(r);
    extraOf(r.ex.id).forEach((e, k) => countRow(r.ex, e, xp[k]));
  }
  const hasCircuit = !!draft.circuit && draft.circuit.completedRounds > 0;

  const onStart = () => {
    if (otherActive) {
      toast(`Hai già un allenamento in corso sulla seduta ${otherActive}`);
      return;
    }
    unlockAudio();
    update((d) => ({ ...d, startedAt: new Date().toISOString() }));
    if (shouldWarnScreen()) toast(SCREEN_WARNING, 6000);
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
    update((d) => ({ ...d, sets: {}, extra: {}, notes: '' }));
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
        <ItemList items={WARMUP} testId="warmup" />
      </div>
      <p className="legend">
        <span className="dot prefilled" /> precompilato dall'ultima volta · <span className="dot confirmed" /> confermato
      </p>

      {rows.map((r) => {
        const extras = extraOf(r.ex.id);
        const totalRows = r.count + extras.length;
        return (
          <ExerciseCard
            key={r.ex.id}
            ex={r.ex}
            count={r.count}
            prefill={r.prefill}
            entries={draft.sets[r.ex.id] ?? []}
            extraEntries={extras}
            extraPrefill={extraPrefillOf(r)}
            hint={r.hint}
            lastText={r.lastText}
            onSetChange={(i, e) => setEntry(r.ex.id, i, e)}
            onExtraChange={(k, e) => setExtra(r.ex.id, (arr) => ((arr[k] = e), arr))}
            onExtraRemove={(k) => setExtra(r.ex.id, (arr) => (arr.splice(k, 1), arr))}
            onAddSet={() => setExtra(r.ex.id, (arr) => [...arr, null])}
            onSetCheck={(i) => onCheck(r.ex, i, totalRows)}
            onSetLeft={() => {
              unlockAudio();
              toast('→ Lato destro, senza pausa');
            }}
            onRest={(sec) => {
              unlockAudio();
              startRest(sec, r.ex.name);
            }}
          />
        );
      })}

      {day === 'C' && (
        <div className="box">
          <b>Circuito cardio</b>
          <ItemList items={CARDIO_EXERCISES} testId="circuit" />
          <div className="sub">Il timer del circuito arriva nella Fase 5.</div>
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

/** Elenco di riscaldamento o circuito, con la miniatura accanto a ogni voce. */
function ItemList({ items, testId }: { items: SimpleItem[]; testId: string }) {
  return (
    <ul className="items" data-testid={testId}>
      {items.map((it) => (
        <li key={it.id} data-item={it.id}>
          <Thumb image={it.image} alt={it.name} size="sm" />
          <span>{it.name}</span>
        </li>
      ))}
    </ul>
  );
}
