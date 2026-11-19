import { useMemo, useState } from 'react';
import type { Session, SetLog } from '../db/models';
import { DAYS, EXERCISES } from '../program/program';
import type { Exercise, Muscle } from '../program/types';
import { Chart, type ChartDataset } from '../components/Chart';
import {
  MUSCLES,
  exerciseCharts,
  exerciseSessions,
  fmtDelta,
  groupIndex,
  lastWeeks,
  shortDate,
  weeklySets,
  type SummaryRow,
} from '../logic/charts';
import { fmtNum } from '../logic/values';

interface Props {
  sessions: Session[];
  logs: SetLog[];
}

type View = 'ex' | 'mg';

// scelte ricordate solo per comodità: se il browser non le ricorda si riparte dai valori predefiniti
const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignora */
  }
};

const WEEKS = 8;

export function ChartsScreen({ sessions, logs }: Props) {
  const [view, setView] = useState<View>(() => (read('tg.chartView') === 'mg' ? 'mg' : 'ex'));
  const choose = (v: View) => {
    setView(v);
    write('tg.chartView', v);
  };

  if (!logs.length)
    return (
      <>
        <h2>Grafici</h2>
        <div className="box" data-testid="charts-empty">
          Ancora nessuna serie salvata. I grafici compaiono dopo la prima seduta.
        </div>
      </>
    );

  return (
    <>
      <h2>Grafici</h2>
      <div className="seg" role="tablist">
        <button role="tab" aria-selected={view === 'ex'} className={view === 'ex' ? 'on' : ''} onClick={() => choose('ex')}>
          Per esercizio
        </button>
        <button role="tab" aria-selected={view === 'mg'} className={view === 'mg' ? 'on' : ''} onClick={() => choose('mg')}>
          Per gruppo muscolare
        </button>
      </div>
      {view === 'ex' ? <ExerciseView sessions={sessions} logs={logs} /> : <MuscleView sessions={sessions} logs={logs} />}
    </>
  );
}

// ---------- per esercizio ----------

function ExerciseView({ sessions, logs }: Props) {
  const withData = useMemo(() => new Set(logs.map((l) => l.exerciseId)), [logs]);
  const [exId, setExId] = useState(() => {
    const saved = read('tg.chartEx');
    if (saved && withData.has(saved)) return saved;
    return EXERCISES.find((e) => withData.has(e.id))?.id ?? EXERCISES[0].id;
  });
  const ex = EXERCISES.find((e) => e.id === exId) ?? EXERCISES[0];
  const data = useMemo(() => exerciseCharts(ex, sessions, logs), [ex, sessions, logs]);
  const labels = useMemo(() => data.dates.map(shortDate), [data]);
  const count = exerciseSessions(ex.id, sessions, logs).length;

  const option = (e: Exercise) => (
    <option key={e.id} value={e.id} disabled={!withData.has(e.id)}>
      {e.name}
      {withData.has(e.id) ? '' : ' (nessun dato)'}
    </option>
  );
  const retired = EXERCISES.filter((e) => e.retired && withData.has(e.id));

  return (
    <>
      <select
        className="select"
        aria-label="Esercizio"
        value={exId}
        onChange={(e) => {
          setExId(e.target.value);
          write('tg.chartEx', e.target.value);
        }}
      >
        {DAYS.map((d) => (
          <optgroup key={d.day} label={`Seduta ${d.day}`}>
            {EXERCISES.filter((e) => e.day === d.day && !e.retired).map(option)}
          </optgroup>
        ))}
        {retired.length > 0 && <optgroup label="Tolti dalla scheda">{retired.map(option)}</optgroup>}
      </select>

      {count === 0 ? (
        <div className="box">Nessuna seduta con questo esercizio.</div>
      ) : (
        <>
          <Summary rows={data.summary} sessions={count} />
          {data.charts.map((c) => (
            <ChartBox key={c.title} title={c.title}>
              <Chart
                type="line"
                labels={labels}
                datasets={c.series as ChartDataset[]}
                unit={c.unit === 'reps' ? '' : c.unit}
                steps={c.steps}
                integer={c.unit === 'reps' || c.unit === 's'}
                height={c.steps ? 180 : 220}
                ariaLabel={`${ex.name}: ${c.title}`}
              />
              <DataTable
                labels={labels}
                columns={c.series.map((s) => ({
                  label: s.label,
                  values: s.values.map((v) => (v == null ? '–' : c.steps ? (c.steps[v] ?? String(v)) : fmtNum(v))),
                }))}
              />
            </ChartBox>
          ))}
          {ex.metric === 'kg' && (
            <p className="legend">
              e1RM = massimale stimato su una ripetizione (Epley: kg × (1 + reps/30)). Sale anche quando aumenti solo le
              ripetizioni.
            </p>
          )}
        </>
      )}
    </>
  );
}

function Summary({ rows, sessions }: { rows: SummaryRow[]; sessions: number }) {
  return (
    <div className="box summary" data-testid="chart-summary">
      <div className="sub">
        Partenza → Attuale · {sessions} {sessions === 1 ? 'seduta' : 'sedute'}
      </div>
      {rows.map((r) => (
        <div key={r.label} className="sum-row">
          <span className="sum-label">{r.label}</span>
          <span className="sum-values">
            {r.first} → <b>{r.last}</b>
          </span>
          <span className={`sum-delta t${r.trend}`}>
            {r.trend > 0 ? '▲ ' : r.trend < 0 ? '▼ ' : ''}
            {r.delta}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------- per gruppo muscolare ----------

function MuscleView({ sessions, logs }: Props) {
  const [group, setGroup] = useState<Muscle>(() => {
    const saved = read('tg.chartGroup') as Muscle | null;
    return saved && MUSCLES.includes(saved) ? saved : 'quadricipiti';
  });

  const weekly = useMemo(() => weeklySets(sessions, logs), [sessions, logs]);
  const weeks = useMemo(() => lastWeeks(WEEKS), []);
  const thisWeek = weeks[weeks.length - 1];

  const current = useMemo<ChartDataset[]>(
    () => [{ label: 'Serie questa settimana', values: MUSCLES.map((m) => weekly.get(thisWeek)?.[m] ?? 0) }],
    [weekly, thisWeek],
  );

  const index = useMemo(() => groupIndex(group, sessions, logs), [group, sessions, logs]);
  const indexLabels = useMemo(() => index.map((p) => shortDate(p.date)), [index]);
  const indexData = useMemo<ChartDataset[]>(() => [{ label: 'Indice', values: index.map((p) => p.value) }], [index]);

  const weekLabels = useMemo(() => weeks.map(shortDate), [weeks]);
  const groupWeeks = useMemo<ChartDataset[]>(
    () => [{ label: 'Serie', values: weeks.map((w) => weekly.get(w)?.[group] ?? 0), color: '--c2' }],
    [weeks, weekly, group],
  );

  const last = index[index.length - 1];

  return (
    <>
      <ChartBox title="Serie di questa settimana per gruppo" note="Muscolo primario = 1 serie, secondario = ½.">
        <Chart
          type="bar"
          horizontal
          labels={MUSCLES.map(cap)}
          datasets={current}
          height={280}
          ariaLabel="Serie di questa settimana per gruppo muscolare"
        />
        <DataTable labels={MUSCLES.map(cap)} columns={[{ label: 'Serie', values: current[0].values.map((v) => fmtNum(v ?? 0)) }]} />
      </ChartBox>

      <div className="chips" role="radiogroup" aria-label="Gruppo muscolare">
        {MUSCLES.map((m) => (
          <button
            key={m}
            role="radio"
            aria-checked={group === m}
            className={group === m ? 'on' : ''}
            onClick={() => {
              setGroup(m);
              write('tg.chartGroup', m);
            }}
          >
            {cap(m)}
          </button>
        ))}
      </div>

      <ChartBox
        title={`Indice di progressione · ${cap(group)}`}
        note="100 = prima seduta. Media degli esercizi in cui il gruppo è primario (serie migliore di ogni seduta)."
      >
        {index.length === 0 ? (
          <p className="sub" data-testid="index-empty">
            Nessun esercizio con questo gruppo come primario nelle sedute salvate.
          </p>
        ) : (
          <>
            <div className="sum-row" data-testid="index-summary">
              <span className="sum-label">Indice</span>
              <span className="sum-values">
                100 → <b>{fmtNum(last.value)}</b>
              </span>
              <span className={`sum-delta t${Math.sign(Math.round((last.value - 100) * 10))}`}>{fmtDelta(100, last.value, '').text}</span>
            </div>
            <Chart type="line" labels={indexLabels} datasets={indexData} baseline={100} ariaLabel={`Indice di progressione: ${group}`} />
            <DataTable labels={indexLabels} columns={[{ label: 'Indice', values: index.map((p) => fmtNum(p.value)) }]} />
          </>
        )}
      </ChartBox>

      <ChartBox title={`Serie settimanali · ${cap(group)}`} note={`Ultime ${WEEKS} settimane (data = lunedì).`}>
        <Chart type="bar" labels={weekLabels} datasets={groupWeeks} height={200} ariaLabel={`Serie settimanali: ${group}`} />
        <DataTable labels={weekLabels} columns={[{ label: 'Serie', values: groupWeeks[0].values.map((v) => fmtNum(v ?? 0)) }]} />
      </ChartBox>
    </>
  );
}

// ---------- pezzi comuni ----------

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function ChartBox({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="box chartbox">
      <b>{title}</b>
      {note && <div className="sub">{note}</div>}
      {children}
    </section>
  );
}

/** Gli stessi valori in tabella (per leggerli con precisione o con un lettore di schermo). */
function DataTable({ labels, columns }: { labels: string[]; columns: { label: string; values: string[] }[] }) {
  return (
    <details className="datatable">
      <summary>Tabella dei valori</summary>
      <table>
        <thead>
          <tr>
            <th />
            {columns.map((c) => (
              <th key={c.label}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((l, i) => (
            <tr key={i}>
              <td>{l}</td>
              {columns.map((c) => (
                <td key={c.label}>{c.values[i]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
