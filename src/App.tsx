import { useCallback, useEffect, useRef, useState } from 'react';
import { requestPersistence, type PersistState } from './db/db';
import { useHistory, useSettings } from './hooks/useData';
import { SessionScreen } from './screens/SessionScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { InfoScreen } from './screens/InfoScreen';
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

export function App() {
  const [tab, setTab] = useState<Tab>(readTab);
  const [persist, setPersist] = useState<PersistState | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef<number>(undefined);
  const history = useHistory();
  const settings = useSettings();

  useEffect(() => {
    void requestPersistence().then(setPersist);
  }, []);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(''), 2200);
  }, []);

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
  else body = <SessionScreen day={tab} sessions={history.sessions} logs={history.logs} settings={settings} toast={toast} />;

  return (
    <>
      <header className="top">
        <h1>TeacherGym</h1>
      </header>
      <main>{body}</main>
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
