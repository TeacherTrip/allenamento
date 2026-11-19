import { useState } from 'react';
import { deleteSession, updateSession } from '../db/db';
import type { Session, SetLog } from '../db/models';
import { EXERCISE_BY_ID, EXERCISES } from '../program/program';
import { fmtDate, fmtDuration, formatSet } from '../logic/format';
import { fmtNum, parseNum } from '../logic/values';

interface Props {
  sessions: Session[];
  logs: SetLog[];
  toast: (msg: string) => void;
}

const exOrder = (id: string) => {
  const ex = EXERCISE_BY_ID[id];
  return ex ? `${ex.day}${String(ex.order).padStart(2, '0')}` : `Z${id}`;
};

function groupByExercise(logs: SetLog[]): [string, SetLog[]][] {
  const m = new Map<string, SetLog[]>();
  for (const l of logs) m.set(l.exerciseId, [...(m.get(l.exerciseId) ?? []), l]);
  return [...m.entries()]
    .map(([id, arr]): [string, SetLog[]] => [id, arr.sort((a, b) => a.setIndex - b.setIndex)])
    .sort((a, b) => exOrder(a[0]).localeCompare(exOrder(b[0])));
}

export function HistoryScreen({ sessions, logs, toast }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <h2>Storico</h2>
      <p className="sub">{sessions.length} sedute salvate</p>
      {sorted.length === 0 && <div className="box">Nessuna seduta ancora. Salvane una da A, B o C.</div>}
      <div className="hist">
        {sorted.map((s) => {
          const sLogs = logs.filter((l) => l.sessionId === s.id);
          if (editing === s.id)
            return (
              <SessionEditor
                key={s.id}
                session={s}
                logs={sLogs}
                onDone={(saved) => {
                  setEditing(null);
                  if (saved) toast('Seduta aggiornata');
                }}
              />
            );
          return (
            <details key={s.id}>
              <summary>
                {fmtDate(s.date)} · Seduta {s.day}{' '}
                <span className="muted">
                  · {sLogs.length} serie{s.durationSec != null && ` · ${fmtDuration(s.durationSec)}`}
                </span>
              </summary>
              {s.durationSec != null && (
                <div className="it">
                  <b>Durata</b>: {fmtDuration(s.durationSec)}
                </div>
              )}
              {groupByExercise(sLogs).map(([id, arr]) => {
                const ex = EXERCISE_BY_ID[id];
                return (
                  <div className="it" key={id}>
                    <b>{ex?.name ?? id}</b>: {ex ? arr.map((l) => formatSet(ex, l)).join(' · ') : ''}
                  </div>
                );
              })}
              {s.circuit && (
                <div className="it">
                  <b>Circuito</b>: {s.circuit.label}, {s.circuit.completedRounds}/{s.circuit.rounds} round
                </div>
              )}
              {s.phase1 && <div className="it muted">Settimane 1-2</div>}
              {s.notes && (
                <div className="it pre">
                  <b>Note</b>: {s.notes}
                </div>
              )}
              <div className="row2">
                <button className="ghost" onClick={() => setEditing(s.id)}>
                  Modifica
                </button>
                <button
                  className="ghost danger"
                  onClick={async () => {
                    if (!confirm(`Eliminare definitivamente la seduta ${s.day} del ${fmtDate(s.date)}?`)) return;
                    await deleteSession(s.id);
                    toast('Seduta eliminata');
                  }}
                >
                  Elimina
                </button>
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}

// ---------- modifica di una seduta ----------

interface EditRow {
  id: string;
  exerciseId: string;
  setIndex: number;
  load: string;
  reps: string;
  seconds: string;
}

function toLocalDate(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function SessionEditor({ session, logs, onDone }: { session: Session; logs: SetLog[]; onDone: (saved: boolean) => void }) {
  const [date, setDate] = useState(toLocalDate(session.date));
  const [notes, setNotes] = useState(session.notes);
  const [minutes, setMinutes] = useState(session.durationSec != null ? String(Math.round(session.durationSec / 60)) : '');
  const [rows, setRows] = useState<EditRow[]>(() =>
    groupByExercise(logs).flatMap(([, arr]) =>
      arr.map((l) => ({
        id: l.id,
        exerciseId: l.exerciseId,
        setIndex: l.setIndex,
        load: fmtNum(l.load),
        reps: l.reps != null ? String(l.reps) : '',
        seconds: l.seconds != null ? String(l.seconds) : '',
      })),
    ),
  );

  const set = (id: string, field: 'load' | 'reps' | 'seconds', v: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: v } : r)));

  const save = async () => {
    const orig = new Date(session.date);
    const [y, m, d] = date.split('-').map(Number);
    const newDate = new Date(y, m - 1, d, orig.getHours(), orig.getMinutes()).toISOString();
    const newLogs: SetLog[] = rows.map((r) => {
      const l: SetLog = { id: r.id, sessionId: session.id, exerciseId: r.exerciseId, setIndex: r.setIndex, confirmed: true };
      const load = parseNum(r.load), reps = parseNum(r.reps), seconds = parseNum(r.seconds);
      if (load != null) l.load = load;
      if (reps != null) l.reps = Math.round(reps);
      if (seconds != null) l.seconds = Math.round(seconds);
      return l;
    });
    const updated: Session = { ...session, date: newDate, notes };
    const min = parseNum(minutes);
    if (min != null && min > 0) updated.durationSec = Math.round(min * 60);
    else delete updated.durationSec; // campo vuoto = nessuna durata
    await updateSession(updated, newLogs);
    onDone(true);
  };

  return (
    <div className="box editor">
      <b>Modifica seduta {session.day}</b>
      <label className="field">
        Data <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className="field">
        Durata (minuti, vuoto = nessuna)
        <input inputMode="numeric" className="duration" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
      </label>
      {rows.map((r) => {
        const ex = EXERCISE_BY_ID[r.exerciseId] ?? EXERCISES[0];
        return (
          <div className="editrow" key={r.id}>
            <span className="edname">
              {ex.name} S{r.setIndex + 1}
            </span>
            {(ex.metric === 'kg' || ex.metric === 'band' || ex.metric === 'level') && (
              <input
                inputMode="decimal"
                value={r.load}
                placeholder={ex.metric === 'kg' ? 'kg' : ex.metric === 'band' ? 'elastico' : 'livello'}
                onChange={(e) => set(r.id, 'load', e.target.value)}
              />
            )}
            {ex.metric === 'time' ? (
              <input inputMode="numeric" value={r.seconds} placeholder="sec" onChange={(e) => set(r.id, 'seconds', e.target.value)} />
            ) : (
              <input inputMode="numeric" value={r.reps} placeholder="reps" onChange={(e) => set(r.id, 'reps', e.target.value)} />
            )}
            <button className="x" aria-label="Elimina serie" onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>
              ✕
            </button>
          </div>
        );
      })}
      <textarea value={notes} placeholder="Note" onChange={(e) => setNotes(e.target.value)} />
      <div className="row2">
        <button className="ghost" onClick={() => onDone(false)}>
          Annulla
        </button>
        <button className="primary small" onClick={save}>
          Salva modifiche
        </button>
      </div>
    </div>
  );
}
