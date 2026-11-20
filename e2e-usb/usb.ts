import { chromium, test as base, type Browser, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * UNICO indirizzo usato sul telefono: http://localhost:5173/allenamento/ via `adb reverse tcp:5173 tcp:5173`.
 * Mai l'app installata né https://teachertrip.github.io/.
 */
export const APP = 'http://localhost:5173/allenamento/';
const ORIGIN = 'http://localhost:5173';

/** Schermate: in una cartella temporanea di sistema, mai nel progetto. */
export const SHOTS = path.join(os.tmpdir(), 'teachergym-usb');

/** adb: dal PATH, oppure dalla variabile d'ambiente ADB (mai un percorso scritto qui). */
export function adb(...args: string[]): string {
  return execFileSync(process.env.ADB ?? 'adb', args, { encoding: 'utf8' });
}

/**
 * Chrome del telefono attraverso il suo canale di debug (adb forward tcp:9222 localabstract:chrome_devtools_remote).
 * Prima di ogni prova si cancellano SOLO i dati di localhost:5173 (nient'altro di Chrome).
 * Ogni prova apre una scheda nuova e la chiude alla fine; nessuna app installata, nessuna impostazione cambiata.
 */
export const test = base.extend<{ page: Page }, { phone: Browser }>({
  phone: [
    async ({}, use) => {
      const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
      await use(browser);
    },
    { scope: 'worker' },
  ],
  page: async ({ phone }, use) => {
    const page = await openInForeground(phone);
    await clearOrigin(page);
    await use(page);
    await page.close();
  },
});

/**
 * Apre una scheda di localhost:5173 DAVVERO in primo piano: su Android una scheda creata via debug resta dietro
 * e non viene disegnata (niente tocchi). Si apre come un link toccato (`am start` con l'indirizzo), poi la si comanda via debug.
 * Prima chiude le schede di localhost:5173 rimaste da prove interrotte; le altre schede non vengono né lette né toccate.
 */
async function openInForeground(phone: Browser): Promise<Page> {
  const ctx = phone.contexts()[0];
  for (const p of ctx.pages()) if (p.url().startsWith(`${ORIGIN}/`)) await p.close();
  const token = `prova${Date.now()}`;
  adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `${ORIGIN}/allenamento/favicon.svg?${token}`, 'com.android.chrome');
  for (let i = 0; i < 100; i++) {
    const page = ctx.pages().find((p) => p.url().includes(token));
    if (page) return page;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('scheda di prova non aperta sul telefono');
}

/**
 * Azzera i dati di localhost:5173 DALL'INTERNO di una pagina di quell'origine (le API del browser vedono solo i suoi dati):
 * service worker, cache, database dell'app, localStorage e sessionStorage. Nient'altro di Chrome.
 * Si apre un file statico (favicon.svg), non l'app, così nessun dato viene ricreato prima della pulizia.
 */
async function clearOrigin(page: Page) {
  await page.waitForLoadState();
  await page.evaluate(async () => {
    for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
    for (const k of await caches.keys()) await caches.delete(k);
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('teachergym');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('database aperto in un altro tab di localhost:5173'));
    });
    localStorage.clear();
    sessionStorage.clear();
  });
}

export { expect } from '@playwright/test';
