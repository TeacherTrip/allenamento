import { useEffect } from 'react';

/** Wake Lock disponibile? (no su http in Wi-Fi senza flag di Chrome, no su browser vecchi) */
export function wakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator && !!navigator.wakeLock;
}

/**
 * Tiene lo schermo acceso finché `active` è vero.
 * Il browser rilascia il blocco quando la pagina va in background o lo schermo si spegne:
 * lo richiediamo di nuovo a ogni ritorno visibile (evento visibilitychange).
 * Se l'API non c'è: non fa nulla, nessun errore.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !wakeLockSupported()) return;
    let lock: WakeLockSentinel | null = null;
    let stopped = false;

    const request = async () => {
      if (stopped || document.visibilityState !== 'visible') return;
      if (lock && !lock.released) return; // già attivo
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        /* negato (es. risparmio energetico): nessun errore per l'utente */
      }
    };

    void request();
    document.addEventListener('visibilitychange', request);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', request);
      void lock?.release().catch(() => undefined);
    };
  }, [active]);
}
