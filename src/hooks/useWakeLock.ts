import { useEffect } from 'react';

/**
 * Tiene lo schermo acceso finché `active` è vero (Wake Lock API, dove supportata).
 * Il browser rilascia il blocco quando l'app va in background: lo richiediamo al rientro.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        /* negato (es. batteria scarica): pazienza */
      }
    };
    void request();
    const onVisible = () => void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [active]);
}
