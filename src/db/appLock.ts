/**
 * Una sola copia dell'app per volta sullo stesso telefono (Web Locks: un «lucchetto» condiviso da tutte le schede
 * e finestre dello stesso sito). La copia che lo prende lo tiene finché resta aperta; il browser lo libera da solo
 * quando la scheda o l'app si chiude. Una seconda copia aspetta e intanto mostra un avviso; appena il lucchetto
 * si libera parte da sola. Senza Web Locks (browser vecchi) l'app parte come prima.
 */
export const APP_LOCK = 'teachergym-app';

let acquired: Promise<void> | null = null;

/** Promessa che si risolve quando questa copia ha il lucchetto (una sola richiesta per pagina, anche con StrictMode). */
export function acquireAppLock(): Promise<void> {
  if (acquired) return acquired;
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (!locks?.request) return (acquired = Promise.resolve());
  acquired = new Promise<void>((resolve) => {
    locks
      .request(APP_LOCK, () => {
        resolve();
        return new Promise<never>(() => undefined); // tenuto finché la pagina resta aperta
      })
      .catch(() => resolve()); // errore dell'API: meglio partire che restare fermi
  });
  return acquired;
}

/** Il lucchetto è tenuto da un'altra copia (e questa non ce l'ha ancora)? */
export async function heldElsewhere(): Promise<boolean> {
  try {
    const q = await navigator.locks.query();
    return !!q.held?.some((l) => l.name === APP_LOCK);
  } catch {
    return false;
  }
}

// ---------- app installata aperta in una scheda del browser ----------

const INSTALLED_KEY = 'tg.installed';

/** Aperta dall'icona (app installata)? */
export function isStandalone(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

/**
 * Consiglio «Usa l'app dall'icona»: solo in una scheda del browser su un telefono dove l'app è stata aperta
 * almeno una volta dall'icona (lo ricorda localStorage, comodità per questo dispositivo).
 */
export function shouldSuggestIcon(): boolean {
  try {
    if (isStandalone()) {
      localStorage.setItem(INSTALLED_KEY, '1');
      return false;
    }
    return localStorage.getItem(INSTALLED_KEY) === '1';
  } catch {
    return false;
  }
}
