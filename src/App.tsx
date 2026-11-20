import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, requestPersistence, type PersistState } from './db/db';
import { useHistory, useSettings } from './hooks/useData';
import { useWakeLock } from './hooks/useWakeLock';
import { SessionScreen } from './screens/SessionScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { InfoScreen } from './screens/InfoScreen';
import { RestBar, restRemaining, type RestState } from './components/RestBar';
import { UpdateBanner } from './components/UpdateBanner';
import { fmtElapsed } from './logic/format';
import type { Program } from './program/types';

// Grafici (Chart.js) caricati solo quando si apre la schermata: avvio più leggero
const ChartsScreen = lazy(() => import('./screens/ChartsScreen').then((m) => ({ default: m.ChartsScreen })));

/** Pulsanti fissi della barra in basso, dopo le schede (che sono dinamiche: id della scheda). */
type Fixed = 'H' | 'G' | 'I';
type Tab = string;
const FIXED_TABS: [Fixed, string][] = [
  ['H', 'Storico'],
  ['G', 'Grafici'],
  ['I', 'Info'],
];
const isFixed = (t: Tab): t is Fixed => FIXED_TABS.some(([k]) => k === t);

// la scheda aperta è solo una comodità: se il browser non la ricorda (o non esiste più), si riparte dalla prima
function readTab(): Tab | null {
  try {
    return localStorage.getItem('tg.tab');
  } catch { /* storage non disponibile */ }
  return null;
}

function readRest(): RestState | null {
  try {
    const r = JSON.parse(sessionStorage.getItem('tg.rest') ?? 'null');
    if (r && typeof r.startedAt === 'number' && typeof r.durationMs === 'number') return r;
  } catch { /* ignora */ }
  return null;
}

/** Cronometro della seduta, sempre visibile in alto: Date.now() - orario di inizio salvato. */
function Stopwatch({ since }: { since: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const t = window.setInterval(tick, 1000); // serve solo a ridisegnare
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return <>{fmtElapsed(now - Date.parse(since))}</>;
}

export function App() {
  const [savedTab, setTab] = useState<Tab | null>(readTab);
  const programs = useLiveQuery(() => db.programs.orderBy('order').toArray(), []);
  const [persist, setPersist] = useState<PersistState | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [rest, setRest] = useState<RestState | null>(readRest);
  const toastTimer = useRef<number>(undefined);
  const history = useHistory();
  const settings = useSettings();
  // allenamento in corso = bozza con orario di inizio
  const active = useLiveQuery(() => db.drafts.filter((d) => !!d.startedAt).first(), []);

  const circuitRunning = useLiveQuery(() => db.drafts.filter((d) => !!d.circuitRun).count(), []);

  useWakeLock(!!active);

  useEffect(() => {
    void requestPersistence().then(setPersist);
  }, []);

  const toast = useCallback((msg: string, ms = 2200) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(''), ms);
  }, []);

  const startRest = useCallback(
    (sec: number, label: string) => setRest({ startedAt: Date.now(), durationMs: sec * 1000, label }),
    [],
  );
  const stopRest = useCallback(() => setRest(null), []);
  // +15: se già scaduto riparte da 15 s, altrimenti allunga
  const plusRest = useCallback(
    () =>
      setRest((r) =>
        !r ? r : restRemaining(r) <= 0 ? { ...r, startedAt: Date.now(), durationMs: 15000 } : { ...r, durationMs: r.durationMs + 15000 },
      ),
    [],
  );

  // il recupero sopravvive anche a un ricaricamento della pagina (Chrome può scaricarla col telefono bloccato)
  useEffect(() => {
    try {
      if (rest) sessionStorage.setItem('tg.rest', JSON.stringify(rest));
      else sessionStorage.removeItem('tg.rest');
    } catch { /* ignora */ }
  }, [rest]);

  const programById = new Map((programs ?? []).map((p): [string, Program] => [p.id, p]));
  const tab: Tab | null =
    savedTab && (isFixed(savedTab) || programById.has(savedTab)) ? savedTab : programs?.[0]?.id ?? (programs ? 'I' : null);
  const tabs: [Tab, string][] = [...(programs ?? []).map((p): [Tab, string] => [p.id, p.name]), ...FIXED_TABS];
  const activeProgram = active ? programById.get(active.day) : undefined;
  const activeName = activeProgram?.name ?? active?.day;

  const go = (t: Tab) => {
    setTab(t);
    try { localStorage.setItem('tg.tab', t); } catch { /* ignora */ }
    window.scrollTo(0, 0);
  };

  let body;
  if (!history || !settings || !programs || tab == null) body = <p className="sub">Caricamento…</p>;
  else if (tab === 'H') body = <HistoryScreen sessions={history.sessions} logs={history.logs} toast={toast} />;
  else if (tab === 'G')
    body = (
      <Suspense fallback={<p className="sub">Caricamento…</p>}>
        <ChartsScreen sessions={history.sessions} logs={history.logs} />
      </Suspense>
    );
  else if (tab === 'I')
    body = <InfoScreen sessions={history.sessions} logs={history.logs} settings={settings} persist={persist} toast={toast} />;
  else
    body = (
      <SessionScreen
        program={programById.get(tab)!}
        activeName={activeName}
        sessions={history.sessions}
        logs={history.logs}
        settings={settings}
        activeDay={active?.day ?? null}
        goToDay={go}
        startRest={startRest}
        stopRest={stopRest}
        toast={toast}
      />
    );

  return (
    <>
      <header className="top">
        <h1>TeacherGym</h1>
        {active?.startedAt && (
          <button className="stopwatch" onClick={() => go(active.day)} aria-label="Allenamento in corso">
            ⏱ {activeName} · <Stopwatch since={active.startedAt} />
          </button>
        )}
      </header>
      <main className={rest ? 'with-rest' : ''}>
        <UpdateBanner busy={!!active || !!rest || !!circuitRunning} toast={toast} />
        {body}
      </main>
      {rest && <RestBar rest={rest} onPlus={plusRest} onStop={stopRest} />}
      <nav className={`tabbar${tabs.length > 6 ? ' many' : ''}`}>
        {tabs.map(([k, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => go(k)}>
            {label}
          </button>
        ))}
      </nav>
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </>
  );
}
