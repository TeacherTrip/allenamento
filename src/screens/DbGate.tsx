import { useEffect, useState, type ReactNode } from 'react';
import { checkStoredData, db } from '../db/db';
import { setStartupRepairs } from '../db/sanitize';
import { Loading } from '../components/Loading';
import { RawBackupButton } from '../components/RawBackupButton';
import { acquireAppLock, heldElsewhere, isStandalone } from '../db/appLock';

/**
 * Apertura, una sola volta per pagina (StrictMode esegue l'effetto due volte). Il controllo dei dati gira dopo,
 * in secondo piano: se una tabella è occupata non ferma l'avvio (le letture ignorano già le bozze non valide).
 */
let started: Promise<void> | null = null;
const openOnce = () =>
  (started ??= db.open().then(() => {
    checkStoredData().then(setStartupRepairs, (e: unknown) => console.error('TeacherGym: controllo dei dati non riuscito', e));
  }));

type State = { kind: 'opening' } | { kind: 'ok' } | { kind: 'error'; message: string };

/** Messaggio leggibile da un errore di Dexie (l'errore vero è spesso in `inner`). */
function errorText(e: unknown): string {
  const err = e as { name?: string; message?: string; inner?: { name?: string; message?: string } } | null;
  const inner = err?.inner?.message ? ` (${err.inner.name ?? 'Errore'}: ${err.inner.message})` : '';
  return `${err?.name ?? 'Errore'}: ${err?.message ?? String(e)}${inner}`;
}

/**
 * Prima di tutto il lucchetto della copia unica (src/db/appLock.ts): se un'altra copia dell'app è aperta,
 * avviso con i passaggi e niente accesso ai dati finché non si chiude.
 * Poi apre il database (e se serve fa la migrazione) PRIMA di mostrare l'app.
 * - Errore di apertura o di migrazione → schermata d'errore con "Scarica backup grezzo".
 * - `blocked`: un'altra scheda dell'app tiene aperto il database vecchio → avviso, l'app parte appena si libera.
 * - `versionchange`: un'altra scheda ha aggiornato il database → questa va ricaricata.
 */
export function DbGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ kind: 'opening' });
  const [blocked, setBlocked] = useState(false);
  const [stale, setStale] = useState(false);
  const [otherCopy, setOtherCopy] = useState(false);

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
    let locked = false;
    void heldElsewhere().then((h) => alive && !locked && h && setOtherCopy(true));
    void acquireAppLock()
      .then(() => {
        locked = true;
        if (!alive) return;
        setOtherCopy(false);
        return openOnce().then(() => alive && (setBlocked(false), setState({ kind: 'ok' })));
      })
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
  if (otherCopy) return <OtherCopy />;
  if (state.kind === 'opening') {
    return blocked ? (
      <div className="dbgate warnbox" role="alert" data-testid="db-blocked">
        <b>Chiudi le altre schede dell’app.</b> Un’altra scheda tiene aperti i dati nella versione vecchia: l’aggiornamento parte appena la chiudi.
      </div>
    ) : (
      <Loading />
    );
  }
  return <>{children}</>;
}

/** Un'altra copia dell'app (scheda di Chrome o app installata) ha il lucchetto: questa aspetta e spiega cosa fare. */
function OtherCopy() {
  return (
    <div className="dbgate" role="alert" data-testid="other-copy">
      <h2>App già aperta</h2>
      <p>
        <b>TeacherGym è aperta anche in un’altra scheda o finestra.</b> Due copie aperte insieme possono bloccarsi a vicenda.
      </p>
      {isStandalone() ? (
        // aperta dall'icona: l'altra copia è una scheda di Chrome
        <p>Apri Chrome → tocca il quadratino delle schede → chiudi la scheda di TeacherGym → poi tocca Riprova.</p>
      ) : (
        // aperta in una scheda di Chrome: l'altra copia è l'app installata o un'altra scheda
        <>
          <p>
            <b>Se hai installato TeacherGym: chiudi questa scheda e usa l’app dall’icona.</b>
          </p>
          <p>Altrimenti tocca il quadratino delle schede → chiudi l’altra scheda di TeacherGym → poi tocca Riprova.</p>
        </>
      )}
      <p className="muted small">Appena l’altra copia si chiude, questa parte da sola.</p>
      <button className="primary" onClick={() => location.reload()}>
        Riprova
      </button>
    </div>
  );
}

function DbError({ message }: { message: string }) {
  return (
    <div className="dbgate" role="alert" data-testid="db-error">
      <h2>I dati non si aprono</h2>
      <p>L’app non è riuscita ad aprire o aggiornare i dati salvati. I dati di prima non sono stati modificati.</p>
      <pre className="dberr">{message}</pre>
      <p>
        <b>Non disinstallare l’app.</b> Scarica il backup grezzo e conservalo.
      </p>
      <RawBackupButton label="Scarica backup grezzo" statusTestId="db-dump-status" />
    </div>
  );
}
