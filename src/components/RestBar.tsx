import { useEffect, useRef, useState } from 'react';
import { restEndAlert } from '../hooks/sound';
import { fmtElapsed } from '../logic/format';

export interface RestState {
  /** Ora di partenza (Date.now()). Il tempo si calcola sempre come Date.now() - startedAt,
   *  mai contando i tick: resta giusto anche dopo telefono bloccato / app in background. */
  startedAt: number;
  durationMs: number;
  label: string;
}

/** Se il recupero è finito da più di così quando ce ne accorgiamo (telefono bloccato), niente suono. */
export const LATE_MS = 3000;

export function restRemaining(rest: RestState, now = Date.now()): number {
  return rest.durationMs - (now - rest.startedAt);
}

interface Props {
  rest: RestState;
  onPlus: () => void;
  onStop: () => void;
}

/** Barra del timer di recupero, sopra la navigazione. */
export function RestBar({ rest, onPlus, onStop }: Props) {
  const [now, setNow] = useState(Date.now());
  const [done, setDone] = useState(false);
  const fired = useRef(false);

  // (ri)parte a ogni nuovo recupero o +15; il tick serve solo a ridisegnare
  useEffect(() => {
    fired.current = false;
    setDone(false);
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 250);
    const onVisible = () => setNow(Date.now()); // al rientro aggiorna subito
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [rest.startedAt, rest.durationMs]);

  const remaining = restRemaining(rest, now);

  // fine recupero: suono + vibrazione UNA volta; se ce ne accorgiamo in ritardo, solo "Via!"
  useEffect(() => {
    if (remaining > 0 || fired.current) return;
    fired.current = true;
    if (-remaining <= LATE_MS) restEndAlert();
    setDone(true);
  }, [remaining]);

  // dopo "Via!" la barra si chiude da sola
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(onStop, 2500);
    return () => window.clearTimeout(t);
  }, [done, onStop]);

  return (
    <div className="restbar" role="timer">
      <div className="t">{remaining > 0 ? fmtElapsed(remaining + 999) : 'Via!'}</div>
      <div className="l">Recupero · {rest.label}</div>
      <button onClick={onPlus}>+15</button>
      <button onClick={onStop}>Stop</button>
    </div>
  );
}
