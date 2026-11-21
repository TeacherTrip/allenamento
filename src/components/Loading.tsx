import { useEffect, useState } from 'react';
import { RawBackupButton } from './RawBackupButton';

declare global {
  /** Solo per le prove automatiche: attesa prima del messaggio (mai impostato nell'app). */
  // eslint-disable-next-line no-var
  var __TG_TEST_SLOW_MS__: number | undefined;
}

/** Dopo quanto «Caricamento…» diventa un messaggio con le possibili cause. */
export const SLOW_MS = 8000;

/**
 * «Caricamento…» con un tempo massimo: dopo SLOW_MS compare un messaggio (causa probabile e tre pulsanti),
 * ma l'attesa NON si interrompe: se i dati arrivano, chi chiama smette di mostrare questo componente.
 * «Continua ad aspettare» nasconde il messaggio; se l'attesa dura ancora, ricompare dopo altri SLOW_MS.
 */
export function Loading() {
  const [slow, setSlow] = useState(false);
  const [round, setRound] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), globalThis.__TG_TEST_SLOW_MS__ ?? SLOW_MS);
    return () => window.clearTimeout(t);
  }, [round]);
  return (
    <>
      <p className="sub">Caricamento…</p>
      {slow && (
        <div className="warnbox" role="alert" data-testid="slow">
          <b>Il caricamento sta durando più del solito.</b> Di solito succede quando TeacherGym è aperta anche in un’altra scheda o
          finestra: chiudila. Se il telefono è solo lento, aspetta: l’app si apre appena i dati sono pronti.
          <div className="slow-actions">
            <button
              className="ghost"
              onClick={() => {
                setSlow(false);
                setRound((r) => r + 1);
              }}
            >
              Continua ad aspettare
            </button>
            <RawBackupButton className="ghost" />
            <button className="ghost" onClick={() => location.reload()}>
              Ricarica
            </button>
          </div>
        </div>
      )}
    </>
  );
}
