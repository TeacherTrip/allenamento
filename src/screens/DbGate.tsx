import { useEffect, useState, type ReactNode } from 'react';
import { db, DB_NAME, ensurePrograms } from '../db/db';
import { downloadJson, rawDumpFileName, readRawDump } from '../db/rawDump';

type State = { kind: 'opening' } | { kind: 'ok' } | { kind: 'error'; message: string };

/** Messaggio leggibile da un errore di Dexie (l'errore vero è spesso in `inner`). */
function errorText(e: unknown): string {
  const err = e as { name?: string; message?: string; inner?: { name?: string; message?: string } } | null;
  const inner = err?.inner?.message ? ` (${err.inner.name ?? 'Errore'}: ${err.inner.message})` : '';
  return `${err?.name ?? 'Errore'}: ${err?.message ?? String(e)}${inner}`;
}

/**
 * Apre il database (e se serve fa la migrazione) PRIMA di mostrare l'app.
 * - Errore di apertura o di migrazione → schermata d'errore con "Scarica backup grezzo".
 * - `blocked`: un'altra scheda dell'app tiene aperto il database vecchio → avviso, l'app parte appena si libera.
 * - `versionchange`: un'altra scheda ha aggiornato il database → questa va ricaricata.
 */
export function DbGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ kind: 'opening' });
  const [blocked, setBlocked] = useState(false);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const onBlocked = () => setBlocked(true);
    const onVersionChange = () => {
      setStale(true);
      db.close(); // libera il database per l'altra scheda
      return false;
    };
    db.on('blocked', onBlocked);
    db.on('versionchange', onVersionChange);
    let alive = true;
    db.open()
      .then(() => ensurePrograms())
      .then(() => alive && (setBlocked(false), setState({ kind: 'ok' })))
      .catch((e) => alive && setState({ kind: 'error', message: errorText(e) }));
    return () => {
      alive = false;
      db.on('blocked').unsubscribe(onBlocked);
      db.on('versionchange').unsubscribe(onVersionChange);
    };
  }, []);

  if (stale) {
    return (
      <div className="dbgate" role="alert" data-testid="db-stale">
        <h2>Ricarica l’app</h2>
        <p>Un’altra scheda ha aggiornato i dati dell’app. Questa scheda va ricaricata (o chiusa).</p>
        <button className="primary" onClick={() => location.reload()}>
          Ricarica
        </button>
      </div>
    );
  }
  if (state.kind === 'error') return <DbError message={state.message} />;
  if (state.kind === 'opening') {
    return blocked ? (
      <div className="dbgate warnbox" role="alert" data-testid="db-blocked">
        <b>Chiudi le altre schede dell’app.</b> Un’altra scheda tiene aperti i dati nella versione vecchia: l’aggiornamento parte appena la chiudi.
      </div>
    ) : (
      <p className="sub">Caricamento…</p>
    );
  }
  return <>{children}</>;
}

function DbError({ message }: { message: string }) {
  const [status, setStatus] = useState('');
  const onDump = async () => {
    try {
      const dump = await readRawDump(DB_NAME);
      downloadJson(dump, rawDumpFileName());
      const n = Object.values(dump.stores).reduce((a, s) => a + s.length, 0);
      setStatus(`Backup grezzo scaricato (${n} righe lette). Conservalo: serve per recuperare i dati.`);
    } catch (e) {
      setStatus(`Backup grezzo non riuscito: ${errorText(e)}`);
    }
  };
  return (
    <div className="dbgate" role="alert" data-testid="db-error">
      <h2>I dati non si aprono</h2>
      <p>L’app non è riuscita ad aprire o aggiornare i dati salvati. I dati di prima non sono stati modificati.</p>
      <pre className="dberr">{message}</pre>
      <p>
        <b>Non disinstallare l’app.</b> Scarica il backup grezzo e conservalo.
      </p>
      <button className="primary" onClick={onDump}>
        Scarica backup grezzo
      </button>
      {status && <p data-testid="db-dump-status">{status}</p>}
    </div>
  );
}
