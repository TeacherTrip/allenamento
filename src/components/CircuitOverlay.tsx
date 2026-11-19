import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CARDIO_EXERCISES, CARDIO_PROTOCOLS } from '../program/cardio';
import {
  circuitElapsed,
  circuitPosition,
  circuitTotalMs,
  phaseKey,
  shownExerciseIndex,
  type CircuitPos,
  type CircuitRun,
} from '../logic/circuit';
import { circuitDoneAlert, countdownTick, restStartAlert, unlockAudio, workStartAlert } from '../hooks/sound';
import { useWakeLock } from '../hooks/useWakeLock';
import { imageUrl } from '../logic/images';
import { fmtElapsed } from '../logic/format';
import { LATE_MS } from './RestBar';

const HISTORY_STATE = { overlay: 'circuito' } as const;
const isOverlayState = () => (history.state as { overlay?: string } | null)?.overlay === HISTORY_STATE.overlay;

interface Props {
  run: CircuitRun;
  onPause: () => void;
  onResume: () => void;
  /** Round completati: chiamata ogni volta che ne finisce uno (per registrarli subito nella bozza). */
  onProgress: (completedRounds: number) => void;
  /** Chiusura (a circuito finito o interrotto). */
  onClose: (completedRounds: number) => void;
}

/** Suoni da fare passando da `prev` a `pos` (nessuno se ce ne accorgiamo in ritardo, es. telefono bloccato). */
function playTransition(pos: CircuitPos, lateMs: number) {
  if (lateMs > LATE_MS) return;
  try {
    if (pos.phase === 'work') workStartAlert();
    else if (pos.phase === 'rest') restStartAlert();
    else if (pos.phase === 'done') circuitDoneAlert();
  } catch {
    /* un errore audio non deve fermare il timer */
  }
}

/**
 * Timer del circuito a tutto schermo: immagine grande dell'esercizio in corso (in pausa: il prossimo),
 * conto alla rovescia, round. Lo schermo resta acceso finché è aperto.
 */
export function CircuitOverlay({ run, onPause, onResume, onProgress, onClose }: Props) {
  const protocol = CARDIO_PROTOCOLS[run.protocol] ?? CARDIO_PROTOCOLS[0];
  const [now, setNow] = useState(Date.now());
  const lastKey = useRef<string | null>(null);
  const lastTick = useRef<string | null>(null);
  const lastCompleted = useRef<number | null>(null);
  const paused = run.pausedAt != null;

  useWakeLock(true);

  // il tick serve solo a ridisegnare: la posizione si calcola dagli orari
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const t = window.setInterval(tick, 200);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  const elapsed = circuitElapsed(run, now);
  const pos = circuitPosition(protocol, elapsed);
  const done = pos.phase === 'done';

  // suoni: cambio di fase e conto alla rovescia 3-2-1
  useEffect(() => {
    const key = phaseKey(pos);
    if (lastKey.current === null) {
      lastKey.current = key; // apertura o ricaricamento: nessun suono per la fase già in corso
    } else if (key !== lastKey.current) {
      lastKey.current = key;
      const late = pos.phase === 'done' ? elapsed - circuitTotalMs(protocol) : pos.intoPhaseMs;
      playTransition(pos, late);
    }
    if (paused || done) return;
    const sec = Math.ceil(pos.remainingMs / 1000);
    const tickKey = `${key}-${sec}`;
    if (sec >= 1 && sec <= 3 && tickKey !== lastTick.current && sec * 1000 - pos.remainingMs < 600) {
      lastTick.current = tickKey;
      try {
        countdownTick();
      } catch {
        /* ignora */
      }
    }
  });

  // round completati → bozza
  useEffect(() => {
    if (lastCompleted.current === pos.completedRounds) return;
    lastCompleted.current = pos.completedRounds;
    onProgress(pos.completedRounds);
  }, [pos.completedRounds, onProgress]);

  const requestClose = (): boolean => {
    if (!done) {
      const msg = `Interrompere il circuito?\n\nRound completati: ${pos.completedRounds}/${protocol.rounds}${
        pos.completedRounds > 0 ? ' (verranno registrati nella seduta).' : '.'
      }`;
      if (!confirm(msg)) return false;
    }
    onClose(pos.completedRounds);
    return true;
  };
  const closeRef = useRef(requestClose);
  const closedRef = useRef(false);
  closeRef.current = requestClose;

  // tasto Indietro del telefono: chiede se interrompere invece di uscire dall'app.
  // Il passo si aggiunge solo se manca (StrictMode monta due volte; dopo un ricaricamento c'è già).
  useEffect(() => {
    if (!isOverlayState()) history.pushState(HISTORY_STATE, '');
    const onPop = () => {
      if (closedRef.current) return; // passo tolto da noi dopo la chiusura
      if (!closeRef.current()) history.pushState(HISTORY_STATE, '');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  /** Tasti Interrompi / Chiudi: dopo la chiusura toglie il passo aggiunto alla cronologia. */
  const onCloseClick = () => {
    if (!requestClose()) return;
    closedRef.current = true;
    if (isOverlayState()) history.back();
  };

  const item = CARDIO_EXERCISES[shownExerciseIndex(pos, CARDIO_EXERCISES.length)];
  let label: string;
  if (pos.phase === 'prep') label = 'PREPARATI';
  else if (pos.phase === 'work') label = `LAVORO · round ${pos.round}/${protocol.rounds}`;
  else if (pos.phase === 'rest') label = `PAUSA · poi round ${pos.round + 1}/${protocol.rounds}`;
  else label = 'COMPLETATO';
  if (paused && !done) label += ' · IN PAUSA';

  return createPortal(
    <div className="circuit-overlay" data-phase={pos.phase} data-paused={paused || undefined} role="dialog" aria-modal="true" aria-label="Timer del circuito">
      <div className="co-phase" data-testid="circuit-phase">
        {label}
      </div>
      {done ? (
        <div className="co-done">
          <div className="co-check">✓</div>
          <div>
            {protocol.rounds} round fatti · {protocol.label}
          </div>
        </div>
      ) : (
        <>
          <div className="co-img">{item.image && <img src={imageUrl(item.image)} alt={item.name} />}</div>
          <div className="co-name" data-testid="circuit-exercise">
            {pos.phase === 'rest' ? 'Prossimo: ' : pos.phase === 'prep' ? 'Primo: ' : ''}
            {item.name}
          </div>
          <div className="co-time" role="timer" data-testid="circuit-time">
            {fmtElapsed(pos.remainingMs + 999)}
          </div>
        </>
      )}
      {!done && <div className="co-note">Non bloccare il telefono: a schermo spento suoni e vibrazioni non partono.</div>}
      <div className="co-buttons">
        {!done &&
          (paused ? (
            <button
              className="primary"
              onClick={() => {
                unlockAudio();
                onResume();
              }}
            >
              ▶ Riprendi
            </button>
          ) : (
            <button className="primary" onClick={onPause}>
              ❚❚ Pausa
            </button>
          ))}
        <button className={done ? 'primary' : 'ghost'} onClick={onCloseClick}>
          {done ? 'Chiudi' : 'Interrompi'}
        </button>
      </div>
    </div>,
    document.body,
  );
}
