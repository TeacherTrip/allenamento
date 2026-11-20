import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { db, saveDraft, saveSessionFromDraft, setPhase1, setSetting, snoozePhase1 } from '../db/db';
import { shouldAskPhase1Off } from '../logic/phase1';
import type { Draft, DraftEntry, Session, SetLog, SetValues, Settings } from '../db/models';
import { WARMUP, resolveProgram } from '../program/program';
import type { Day, Exercise, Program } from '../program/types';
import { lastSessionSets, prefillWithStart } from '../logic/prefill';
import { afterCheck, blockOf, manualRest, type FlowItem } from '../logic/superset';
import { progressionHint } from '../logic/progression';
import { durationSec, fmtDuration, formatSet, nb, NBSP } from '../logic/format';
import { entryToValues, hasValues, isComplete } from '../logic/values';
import { unlockAudio } from '../hooks/sound';
import { wakeLockSupported } from '../hooks/useWakeLock';
import { ExerciseCard } from '../components/ExerciseCard';
import { Thumb } from '../components/Thumb';
import { CARDIO_EXERCISES, CARDIO_INTENSITY, CARDIO_PROTOCOLS } from '../program/cardio';
import { CircuitOverlay } from '../components/CircuitOverlay';
import { pauseRun, resumeRun } from '../logic/circuit';
import type { SimpleItem } from '../program/types';

const ddmm = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });

interface Props {
  /** Scheda di questa seduta (dal database). */
  program: Program;
  /** Nome della scheda con l'allenamento in corso, se è un'altra. */
  activeName?: string;
  sessions: Session[];
  logs: SetLog[];
  settings: Settings;
  /** Seduta con il cronometro in corso (al massimo una). */
  activeDay: Day | null;
  goToDay: (day: Day) => void;
  startRest: (sec: number, label: string) => void;
  stopRest: () => void;
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

export function SessionScreen({ program, activeName, sessions, logs, settings, activeDay, goToDay, startRest, stopRest, toast }: Props) {
  const day = program.id;
  const exercises = useMemo(() => resolveProgram(program), [program]);
  const title = nb(`Seduta ${program.name}${program.description ? ` — ${program.description}` : ''}`);
  const startSide = settings.startSide;
  const [draft, setDraft] = useState<Draft | null>(null);

  // "Settimane 1-2": l'interruttore è in Info; qui la riga e l'avviso «Disattivarle?».
  // Valore locale aggiornato subito al «Sì» (senza aspettare il database): niente sfarfallio
  const [phase1, setPhase1Local] = useState(settings.phase1);
  useEffect(() => setPhase1Local(settings.phase1), [settings.phase1]);
  const askPhase1Off = phase1 && shouldAskPhase1Off(settings);

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
          ? nb(`${new Date(lastDate!).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} · ${last
              .map((l) => formatSet(ex, l) + (l.extra ? ' (extra)' : ''))
              .join(' · ')}`)
          : null;
        // senza storico: valore di partenza della voce (in grigio, da confermare)
        const prefill = prefillWithStart(planned, count, ex.metric, ex.startValue);
        return { ex, count, prefill, hint: progressionHint(ex, planned), lastText };
      }),
    [exercises, sessions, logs, phase1],
  );

  // ---------- circuito (seduta C) ----------
  const [protocol, setProtocol] = useState(settings.cardioProtocol);
  useEffect(() => setProtocol(settings.cardioProtocol), [settings.cardioProtocol]);

  const circuitLog = (p: number, completedRounds: number) => {
    const cp = CARDIO_PROTOCOLS[p];
    return { protocol: p, label: cp.label, rounds: cp.rounds, completedRounds };
  };

  /** Ogni round finito si registra subito nella bozza (sopravvive a chiusure improvvise). */
  const onCircuitProgress = useCallback(
    (completedRounds: number) =>
      update((d) => {
        if (!d.circuitRun || completedRounds === 0) return d;
        return { ...d, circuit: circuitLog(d.circuitRun.protocol, completedRounds) };
      }),
    [day],
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

  // righe di ogni voce (previste + extra) per le regole di superset e recupero (logic/superset.ts)
  const flow: FlowItem[] = rows.map((r) => ({
    id: r.ex.id,
    count: r.count + extraOf(r.ex.id).length,
    restSec: r.ex.restSec,
    supersetNext: r.ex.supersetNext,
  }));

  /** Tasto di conferma: passa alla voce successiva del superset, oppure recupero del blocco (mai dopo l'ultima serie). */
  const onCheck = (index: number, rowIndex: number) => {
    unlockAudio();
    const action = afterCheck(flow, index, rowIndex);
    if (action.kind === 'next') {
      const to = exercises.find((e) => e.id === action.to);
      toast(`→ Passa a ${to?.superset ?? to?.name ?? ''}`);
    } else if (action.kind === 'rest' && settings.autoRest) {
      startRest(action.sec, exercises[index].name);
    }
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
    if (exercises.length === 0) return;
    if (otherActive) {
      toast(`Hai già un allenamento in corso sulla seduta ${activeName ?? ''}`.trim());
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
    if (pending) lines.push(`${pending} serie non confermate (senza ✓) NON verranno salvate.`);
    if (incomplete) lines.push(`${incomplete} serie senza ripetizioni (o secondi) NON verranno salvate.`);
    if (dur != null || lines.length) {
      const head = dur != null ? `Terminare l'allenamento? Durata: ${fmtDuration(dur)}` : 'Salvo la seduta?';
      if (!confirm([head, ...lines].join('\n\n'))) return;
    }
    const maxSets = Object.fromEntries(rows.map((r) => [r.ex.id, r.count]));
    const n = await saveSessionFromDraft(draft, phase1, maxSets, dur, program);
    if (n > 0) {
      stopRest(); // seduta finita: il recupero partito dall'ultima ✓ non serve più
      setDraft(emptyDraft(day));
      window.scrollTo(0, 0);
      toast(dur != null ? `Seduta salvata · ${fmtDuration(dur)}` : 'Seduta salvata');
    }
  };

  const onCircuitStart = () => {
    if (draft.circuit && !confirm(`Circuito già registrato (${draft.circuit.completedRounds}/${draft.circuit.rounds} round). Rifarlo da capo?`))
      return;
    unlockAudio();
    stopRest();
    update((d) => {
      const next: Draft = { ...d, circuitRun: { protocol, startedAt: Date.now(), pausedMs: 0 } };
      delete next.circuit;
      return next;
    });
  };

  const onCircuitClose = (completedRounds: number) =>
    update((d) => {
      const next: Draft = { ...d };
      if (d.circuitRun && completedRounds > 0) next.circuit = circuitLog(d.circuitRun.protocol, completedRounds);
      delete next.circuitRun;
      return next;
    });

  const onCircuitRemove = () => {
    if (!confirm('Togliere il circuito registrato da questa seduta?')) return;
    update((d) => {
      const next = { ...d };
      delete next.circuit;
      return next;
    });
  };

  const onClear = () => {
    if (!confirm('Svuotare tutti i campi di questa seduta?')) return;
    update((d) => ({ ...d, sets: {}, extra: {}, notes: '' }));
  };

  return (
    <>
      <h2>{title}</h2>
      {program.subtitle && <p className="sub" data-testid="program-subtitle">{nb(program.subtitle)}</p>}

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
          Hai un allenamento in corso sulla <b>seduta {activeName}</b>. Terminalo prima di iniziarne un altro.
          <button className="ghost" onClick={() => goToDay(otherActive)}>
            Vai alla seduta {activeName}
          </button>
        </div>
      ) : (
        <button className="primary big start" onClick={onStart} disabled={exercises.length === 0}>
          ▶ Inizia allenamento
        </button>
      )}
      {exercises.length === 0 && (
        <div className="box" data-testid="empty-program">
          Questa scheda non ha esercizi.
        </div>
      )}
      {program.notes && program.notesPosition !== 'bottom' && <ProgramNotes text={program.notes} />}

      {settings.sessionsSinceBackup >= 6 && (
        <div className="warnbox">
          {settings.sessionsSinceBackup} sedute dall'ultimo backup. Vai in <b>Info</b> → Esporta backup.
        </div>
      )}
      {askPhase1Off ? (
        <div className="warnbox" role="alert" data-testid="phase1-ask">
          Settimane 1-2 attive da 2 settimane. Disattivarle?
          <div className="row2">
            <button
              className="ghost"
              onClick={() => {
                setPhase1Local(false);
                void setPhase1(false);
              }}
            >
              Sì
            </button>
            <button className="ghost" onClick={() => void snoozePhase1()}>
              Non ancora
            </button>
          </div>
        </div>
      ) : (
        phase1 && (
          <p className="sub" data-testid="phase1-line">
            {nb(`Settimane 1-2 attive${settings.phase1Since ? ` dal ${ddmm(settings.phase1Since)}` : ''}: massimo 2 serie, RIR 3`)}
          </p>
        )
      )}
      {program.warmup && (
        <div className="box">
          <b>Riscaldamento (5-6 min)</b>
          <ItemList items={WARMUP} testId="warmup" />
        </div>
      )}
      <p className="legend">
        <span className="dot prefilled" /> da confermare (precompilato o scritto) · <span className="dot confirmed" /> {`confermato con${NBSP}✓`}
      </p>

      {rows.map((r, idx) => {
        const extras = extraOf(r.ex.id);
        const [bs, be] = blockOf(flow, idx);
        const supersetPos = bs === be ? null : idx === bs ? 'first' : 'next';
        const nextBadge = idx < be ? exercises[idx + 1].superset : undefined;
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
            supersetPos={supersetPos}
            nextBadge={nextBadge}
            manualRestSec={manualRest(flow, idx)}
            startSide={startSide}
            separateSides={settings.separateSides}
            onSetChange={(i, e) => setEntry(r.ex.id, i, e)}
            onExtraChange={(k, e) => setExtra(r.ex.id, (arr) => ((arr[k] = e), arr))}
            onExtraRemove={(k) => setExtra(r.ex.id, (arr) => (arr.splice(k, 1), arr))}
            onAddSet={() => setExtra(r.ex.id, (arr) => [...arr, null])}
            onSetCheck={(i) => onCheck(idx, i)}
            onSetLeft={() => {
              unlockAudio();
              toast(`→ Lato ${startSide === 'left' ? 'destro' : 'sinistro'}, senza pausa`);
            }}
            onRest={(sec) => {
              unlockAudio();
              startRest(sec, r.ex.name);
            }}
          />
        );
      })}

      {program.circuit !== 'no' && (
        <CircuitBox optional={program.circuit === 'optional'}>
          <ItemList items={CARDIO_EXERCISES} testId="circuit" />
          <div className="sub">Rotazione dei 4 esercizi, uno per round. Intensità: {CARDIO_INTENSITY.toLowerCase()}</div>
          <div className="seg" role="radiogroup" aria-label="Protocollo del circuito">
            {CARDIO_PROTOCOLS.map((p, i) => (
              <button
                key={p.label}
                role="radio"
                aria-checked={protocol === i}
                className={protocol === i ? 'on' : ''}
                onClick={() => {
                  setProtocol(i);
                  void setSetting('cardioProtocol', i);
                }}
              >
                {p.label}
                <br />
                {nb(`${p.rounds}× ${p.workSec}/${p.restSec} s`)}
              </button>
            ))}
          </div>
          {draft.circuit && (
            <p className="circuit-done" data-testid="circuit-recorded">
              ✓ Registrato: {draft.circuit.label}, {draft.circuit.completedRounds}/{draft.circuit.rounds} round{' '}
              <button className="link" onClick={onCircuitRemove}>
                Togli
              </button>
            </p>
          )}
          <button className="primary" onClick={onCircuitStart}>
            ▶ Avvia circuito
          </button>
        </CircuitBox>
      )}
      {program.circuit !== 'no' && draft.circuitRun && (
        <CircuitOverlay
          run={draft.circuitRun}
          onPause={() => update((d) => (d.circuitRun ? { ...d, circuitRun: pauseRun(d.circuitRun) } : d))}
          onResume={() => update((d) => (d.circuitRun ? { ...d, circuitRun: resumeRun(d.circuitRun) } : d))}
          onProgress={onCircuitProgress}
          onClose={onCircuitClose}
        />
      )}

      {program.notes && program.notesPosition === 'bottom' && <ProgramNotes text={program.notes} />}
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

/** Circuito cardio: riquadro aperto, oppure chiuso da aprire con un tocco se è facoltativo. */
function CircuitBox({ optional, children }: { optional: boolean; children: ReactNode }) {
  if (!optional)
    return (
      <div className="box circuit" data-testid="circuit-box">
        <b>Circuito cardio senza salti</b>
        {children}
      </div>
    );
  return (
    <details className="box circuit optional" data-testid="circuit-box">
      <summary>
        <b>Circuito cardio senza salti (facoltativo)</b>
      </summary>
      {children}
    </details>
  );
}

/** Note della scheda (in cima o in fondo alla seduta). */
function ProgramNotes({ text }: { text: string }) {
  return (
    <div className="box prog-notes" data-testid="program-notes">
      <b>Note della scheda</b>
      {text}
    </div>
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
