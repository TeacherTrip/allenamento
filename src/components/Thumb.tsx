import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { imageUrl } from '../logic/images';

const OVERLAY_STATE = { overlay: 'immagine' } as const;

function isOverlayState(state: unknown): boolean {
  return (state as { overlay?: string } | null)?.overlay === OVERLAY_STATE.overlay;
}

interface Props {
  /** Nome del file in public/esercizi/ (senza estensione). Se assente non mostra nulla. */
  image?: string;
  /** Testo alternativo: il nome dell'esercizio. */
  alt: string;
  /** 'md' = scheda dell'esercizio (64 px), 'sm' = voci di riscaldamento e circuito. */
  size?: 'md' | 'sm';
}

/**
 * Miniatura dell'esercizio; un tap la apre a tutto schermo.
 *
 * Cronologia: all'apertura si aggiunge un passo { overlay: 'immagine' }, così il tasto
 * Indietro del telefono chiude l'immagine invece di uscire dall'app. Anche il tap chiude
 * con history.back(): la chiusura vera avviene sempre nel gestore di popstate, quindi le
 * due strade usano lo stesso codice e non restano passi "vuoti" nella cronologia.
 * Timer e cronometro non vengono toccati (sono calcolati dall'ora di partenza).
 */
export function Thumb({ image, alt, size = 'md' }: Props) {
  const [broken, setBroken] = useState(false);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const closingRef = useRef(false);
  openRef.current = open;

  useEffect(() => {
    if (!open) return;
    const onPop = () => {
      closingRef.current = false;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Se il componente sparisce con l'immagine aperta, toglie il passo aggiunto alla cronologia.
  useEffect(
    () => () => {
      if (openRef.current && isOverlayState(history.state)) history.back();
    },
    [],
  );

  function requestOpen() {
    if (open) return;
    history.pushState(OVERLAY_STATE, '');
    setOpen(true);
  }

  function requestClose() {
    if (closingRef.current) return; // doppio tap: un solo passo indietro
    if (isOverlayState(history.state)) {
      closingRef.current = true;
      history.back(); // → popstate → onPop chiude
    } else {
      setOpen(false);
    }
  }

  if (!image || broken) return null;
  const src = imageUrl(image);

  return (
    <>
      <button type="button" className={`thumb thumb-${size}`} onClick={requestOpen} aria-label={`Ingrandisci: ${alt}`}>
        <img src={src} alt={alt} loading="lazy" width={86} height={64} onError={() => setBroken(true)} />
      </button>
      {open &&
        createPortal(
          <div className="viewer" role="dialog" aria-modal="true" aria-label={alt} onClick={requestClose}>
            <img src={src} alt={alt} />
            <div className="viewer-hint">{alt} · tocca per chiudere</div>
          </div>,
          document.body,
        )}
    </>
  );
}
