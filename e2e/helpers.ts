import { expect, type Page } from '@playwright/test';

/** Accetta automaticamente tutti i confirm/alert e ne registra il testo. */
export function autoDialogs(page: Page): string[] {
  const msgs: string[] = [];
  page.on('dialog', (d) => {
    msgs.push(d.message());
    void d.accept();
  });
  return msgs;
}

export async function openApp(page: Page, tab = 'A') {
  await page.goto('./');
  await goTab(page, tab);
}

export async function goTab(page: Page, label: string) {
  await page.locator('nav.tabbar button', { hasText: new RegExp(`^${label}$`) }).click();
}

export const card = (page: Page, id: string) => page.locator(`section[data-ex="${id}"]`);
export const row = (page: Page, id: string, i: number) => card(page, id).locator('.setrow').nth(i);

export async function typeSet(page: Page, id: string, i: number, v: { kg?: number; reps?: number; sec?: number }) {
  const r = row(page, id, i);
  if (v.kg != null) await r.locator('input[placeholder="kg"]').fill(String(v.kg));
  if (v.reps != null) await r.locator('input[placeholder^="reps"]').fill(String(v.reps));
  if (v.sec != null) await r.locator('input[placeholder^="sec"]').fill(String(v.sec));
}

/** Conferma col tasto (per gli esercizi con lati separati: [Sx] poi [Dx]). */
export async function checkSet(page: Page, id: string, i: number) {
  const r = row(page, id, i);
  const sx = r.getByRole('button', { name: 'Conferma lato sinistro' });
  if (await sx.count()) {
    await sx.click();
    await r.getByRole('button', { name: 'Conferma lato destro' }).click();
  } else {
    await r.getByRole('button', { name: 'Conferma serie' }).click();
  }
}

/** Toglie la conferma (i valori restano). */
export async function uncheckSet(page: Page, id: string, i: number) {
  await row(page, id, i).getByRole('button', { name: 'Annulla conferma' }).click();
}

export const via = (page: Page) => page.locator('.via-overlay');

/**
 * Sostituisce AudioContext, vibrazione e (opzionale) Wake Lock con versioni finte che contano le chiamate.
 * wakeLock: 'fake' = API presente; 'none' = API assente (come su http).
 */
export async function installFakes(page: Page, wakeLock: 'fake' | 'none' = 'fake', broken = false) {
  await page.addInitScript(([wl, broken]) => {
    const w = window as unknown as Record<string, unknown>;
    const audio = { created: 0, resumed: 0, osc: 0 };
    const vib = { calls: 0 };
    const wlState = { requests: 0, locks: [] as { released: boolean }[] };
    w.__audio = audio;
    w.__vib = vib;
    w.__wl = wlState;
    class FakeAC {
      state = 'suspended';
      currentTime = 0;
      destination = {};
      constructor() { audio.created++; }
      resume() { audio.resumed++; this.state = 'running'; return Promise.resolve(); }
      createOscillator() {
        audio.osc++;
        if (broken) throw new Error('audio rotto (prova)');
        return { frequency: { value: 0 }, connect() {}, start() {}, stop() {} };
      }
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    }
    w.AudioContext = FakeAC;
    Object.defineProperty(Navigator.prototype, 'vibrate', {
      value: () => {
        vib.calls++;
        if (broken) throw new Error('vibrazione rotta (prova)');
        return true;
      },
      configurable: true,
    });
    if (wl === 'none') {
      delete (Navigator.prototype as unknown as Record<string, unknown>).wakeLock;
    } else {
      const fake = {
        request: async () => {
          wlState.requests++;
          const l = { released: false, release: async () => { l.released = true; } };
          wlState.locks.push(l);
          return l;
        },
      };
      Object.defineProperty(Navigator.prototype, 'wakeLock', { get: () => fake, configurable: true });
    }
  }, [wakeLock, broken] as const);
}

export const fakes = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as Record<string, { [k: string]: number }>;
    return { audio: w.__audio, vib: w.__vib.calls, wl: w.__wl.requests as number };
  });

/** Simula app in background (schermo bloccato: il browser rilascia il wake lock) e ritorno. */
export async function setVisibility(page: Page, state: 'hidden' | 'visible') {
  await page.evaluate((s) => {
    Object.defineProperty(document, 'visibilityState', { value: s, configurable: true });
    if (s === 'hidden') {
      const wl = (window as unknown as { __wl?: { locks: { released: boolean }[] } }).__wl;
      wl?.locks.forEach((l) => (l.released = true));
    }
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}

export async function chip(page: Page, id: string, i: number, label: string) {
  await row(page, id, i).getByRole('button', { name: label, exact: true }).click();
}

export async function saveSession(page: Page) {
  await page.locator('button.save').click();
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.locator('.toast')).toContainText(text);
}

/** Apre i dettagli di tutte le sedute nello storico. */
export async function openHistory(page: Page) {
  await goTab(page, 'Storico');
  const items = page.locator('.hist details');
  const n = await items.count();
  for (let i = 0; i < n; i++) await items.nth(i).locator('summary').click();
}

/** Modifica direttamente la bozza nel database (per simulare il passare del tempo). */
export async function patchDraft(page: Page, day: string, patch: Record<string, unknown>) {
  await page.evaluate(
    ([day, patch]) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('teachergym');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const tx = req.result.transaction('drafts', 'readwrite');
          const store = tx.objectStore('drafts');
          const g = store.get(day as string);
          g.onsuccess = () => store.put({ ...g.result, ...(patch as object) });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    [day, patch] as const,
  );
}
