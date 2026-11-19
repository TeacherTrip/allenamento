import { useEffect, useRef, useState } from 'react';
import { restEndAlert } from '../hooks/sound';
import { fmtElapsed } from '../logic/format';

export interface RestState {
  end: number; // timestamp di fine: il conteggio resta giusto anche se il telefono rallenta l'app
  label: string;
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

  // (ri)parte a ogni nuovo orario di fine (nuovo recupero o +15)
  useEffect(() => {
    fired.current = false;
    setDone(false);
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [rest.end]);

  const remaining = rest.end - now;

  // fine recupero: suono + vibrazione una sola volta
  useEffect(() => {
    if (remaining > 0 || fired.current) return;
    fired.current = true;
    restEndAlert();
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
