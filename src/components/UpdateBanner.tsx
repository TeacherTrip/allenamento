import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Avviso "Nuova versione disponibile". L'app NON si ricarica mai da sola:
 * aggiorna solo quando l'utente tocca il pulsante, e mai durante un allenamento
 * (la bozza è salvata, ma ricaricare fermerebbe recupero e circuito).
 */
export function UpdateBanner({ busy, toast }: { busy: boolean; toast: (msg: string, ms?: number) => void }) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (!offlineReady) return;
    toast('App pronta: funziona anche senza rete', 3500);
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady, toast]);

  if (!needRefresh) return null;
  return (
    <div className="update" role="status">
      <b>Nuova versione disponibile.</b>
      {busy ? (
        <span className="muted"> Si aggiorna dopo aver terminato l’allenamento.</span>
      ) : (
        <div className="row2">
          <button className="primary small" onClick={() => void updateServiceWorker(true)}>
            Aggiorna
          </button>
          <button className="ghost" onClick={() => setNeedRefresh(false)}>
            Dopo
          </button>
        </div>
      )}
    </div>
  );
}
