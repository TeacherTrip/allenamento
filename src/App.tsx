import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, requestPersistence, type PersistState } from './db/db';
import { useHistory, useSettings } from './hooks/useData';
import { useWakeLock } from './hooks/useWakeLock';
import { SessionScreen } from './screens/SessionScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { InfoScreen } from './screens/InfoScreen';
import { RestBar, restRemaining, type RestState } from './components/RestBar';
import { fmtElapsed } from './logic/format';
import type { Day } from './program/types';

type Tab = Day | 'H' | 'G' | 'I';
const TABS: [Tab, string][] = [
  ['A', 'A'],
  ['B', 'B'],
  ['C', 'C'],
  ['H', 'Storico'],
  ['G', 'Grafici'],
  ['I', 'Info'],
];

// la scheda aperta è solo una comodità: se il browser non la ricorda, si riparte da A
function readTab(): Tab {
  try {
    const t = localStorage.getItem('tg.tab');
    if (t && TABS.some(([k]) => k === t)) return t as Tab;
  } catch { /* storage non disponibile */ }
  return 'A';
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
  const [tab, setTab] = useState<Tab>(readTab);
  const [persist, setPersist] = useState<PersistState | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [rest, setRest] = useState<RestState | null>(readRest);
  const toastTimer = useRef<number>(undefined);
  const history = useHistory();
  const settings = useSettings();
  // allenamento in corso = bozza con orario di inizio
  const active = useLiveQuery(() => db.drafts.filter((d) => !!d.startedAt).first(), []);

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

  const go = (t: Tab) => {
    setTab(t);
    try { localStorage.setItem('tg.tab', t); } catch { /* ignora */ }
    window.scrollTo(0, 0);
  };

  let body;
  if (!history || !settings) body = <p className="sub">Caricamento…</p>;
  else if (tab === 'H') body = <HistoryScreen sessions={history.sessions} logs={history.logs} toast={toast} />;
  else if (tab === 'G') body = <div className="box"><b>Grafici</b>In arrivo nella Fase 5.</div>;
  else if (tab === 'I')
    body = <InfoScreen sessions={history.sessions} logs={history.logs} settings={settings} persist={persist} toast={toast} />;
  else
    body = (
      <SessionScreen
        day={tab}
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
            ⏱ {active.day} · <Stopwatch since={active.startedAt} />
          </button>
        )}
      </header>
      <main className={rest ? 'with-rest' : ''}>{body}</main>
      {rest && <RestBar rest={rest} onPlus={plusRest} onStop={stopRest} />}
      <nav className="tabbar">
        {TABS.map(([k, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => go(k)}>
            {label}
          </button>
        ))}
      </nav>
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </>
  );
}
