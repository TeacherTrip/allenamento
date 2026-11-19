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
/** Quanto resta visibile "Via!" una volta che lo schermo è davvero visibile. */
export const VIA_MS = 4000;

export function restRemaining(rest: RestState, now = Date.now()): number {
  return rest.durationMs - (now - rest.startedAt);
}

const isVisible = () => {
  try {
    return document.visibilityState !== 'hidden';
  } catch {
    return true;
  }
};

interface Props {
  rest: RestState;
  onPlus: () => void;
  onStop: () => void;
}

/** Barra del timer di recupero (sopra la navigazione) e, a fine recupero, "Via!" grande al centro. */
export function RestBar({ rest, onPlus, onStop }: Props) {
  const [now, setNow] = useState(Date.now());
  const [done, setDone] = useState(false);
  const [visible, setVisible] = useState(isVisible);
  const fired = useRef(false);

  // visibilità della pagina: i 4 s di "Via!" contano solo a schermo visibile
  useEffect(() => {
    const onVis = () => {
      setVisible(isVisible());
      setNow(Date.now()); // al rientro aggiorna subito il tempo
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // (ri)parte a ogni nuovo recupero o +15; il tick serve solo a ridisegnare
  useEffect(() => {
    fired.current = false;
    setDone(false);
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [rest.startedAt, rest.durationMs]);

  const remaining = restRemaining(rest, now);

  // fine recupero: PRIMA "Via!", POI suono e vibrazione (una sola volta; niente suono se ce ne accorgiamo in ritardo)
  useEffect(() => {
    if (remaining > 0 || fired.current) return;
    fired.current = true;
    setDone(true);
    const late = -remaining > LATE_MS;
    if (!late) {
      // dopo il disegno di "Via!": un errore qui non può impedire che compaia
      window.setTimeout(() => {
        try {
          restEndAlert();
        } catch {
          /* nessun errore deve fermare la fine del recupero */
        }
      }, 0);
    }
  }, [remaining]);

  // "Via!" resta finché la pagina non è visibile e non sono passati 4 s (oppure fino a un tocco)
  useEffect(() => {
    if (!done || !visible) return;
    const t = window.setTimeout(onStop, VIA_MS);
    return () => window.clearTimeout(t);
  }, [done, visible, onStop]);

  if (done)
    return (
      <div className="via-overlay" role="alert" onClick={onStop}>
        <div className="via-circle">
          <span className="via-text">Via!</span>
          <span className="via-label">{rest.label}</span>
        </div>
      </div>
    );

  return (
    <div className="restbar" role="timer">
      <div className="t">{fmtElapsed(Math.max(0, remaining) + 999)}</div>
      <div className="l">Recupero · {rest.label}</div>
      <button onClick={onPlus}>+15</button>
      <button onClick={onStop}>Stop</button>
    </div>
  );
}
