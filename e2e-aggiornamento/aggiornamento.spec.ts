import { expect, test, type Page } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import * as path from 'node:path';

/*
 * Prova di aggiornamento REALE (passo 10 della Fase 4-bis), al posto della prova a secco quando lo storico
 * del telefono è vuoto. Solo a mano: `npm run prova-aggiornamento` (vedi scripts/prova-aggiornamento.mjs).
 * Come sul telefono: profilo pulito di Chrome, la versione pubblicata (Fase 7) si installa col service worker,
 * poi allo STESSO indirizzo compare la versione nuova; l'utente tocca «Aggiorna» e il database passa a v2.
 * Dati di prova inventati.
 */

const OLD = process.env.AGG_DIST_OLD;
const NEW = process.env.AGG_DIST_NEW;
const PORT = 4176;
const BASE = `http://localhost:${PORT}/allenamento/`;
const DAY_MS = 24 * 60 * 60 * 1000;

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

/** Server statico con la cartella da servire che si può cambiare durante la prova (stessa porta, stesso indirizzo). */
let root = '';
let server: Server;

test.beforeAll(async () => {
  if (!OLD || !NEW) throw new Error('Lanciare con: npm run prova-aggiornamento');
  server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', BASE);
    if (!url.pathname.startsWith('/allenamento/')) {
      res.writeHead(404).end();
      return;
    }
    let file = path.join(root, decodeURIComponent(url.pathname.slice('/allenamento/'.length)));
    if (!existsSync(file) || statSync(file).isDirectory()) {
      if (path.extname(file)) {
        res.writeHead(404).end();
        return;
      }
      file = path.join(root, 'index.html'); // come GitHub Pages con navigateFallback: le pagine portano a index.html
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(readFileSync(file));
  });
  await new Promise<void>((resolve) => server.listen(PORT, 'localhost', resolve));
});

test.afterAll(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()));
});

const goTab = (page: Page, label: string) =>
  page.locator('nav.tabbar button', { hasText: new RegExp(`^${label}$`) }).click();
const row = (page: Page, id: string, i: number) => page.locator(`section[data-ex="${id}"] .setrow`).nth(i);

/** Errori in console e della pagina, raccolti solo dopo l'aggiornamento (`watch.on = true`). */
function watchErrors(page: Page) {
  const watch = { on: false, errors: [] as string[] };
  page.on('console', (m) => {
    if (watch.on && m.type() === 'error') watch.errors.push(m.text());
  });
  page.on('pageerror', (e) => {
    if (watch.on) watch.errors.push(e.message);
  });
  return watch;
}

/** Impostazioni così come sono nel database (senza passare dall'app). */
const settingsOf = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<Record<string, unknown>>((resolve, reject) => {
        const req = indexedDB.open('teachergym');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const all = db.transaction('settings').objectStore('settings').getAll();
          all.onsuccess = () => {
            db.close();
            resolve(Object.fromEntries((all.result as { key: string; value: unknown }[]).map((r) => [r.key, r.value])));
          };
        };
      }),
  );

/** a) versione pubblicata: si apre, il service worker si installa e prende il controllo (app "installata"). */
async function installOld(page: Page) {
  root = OLD!;
  await page.goto(BASE);
  await expect(page.locator('nav.tabbar')).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.locator('nav.tabbar')).toBeVisible();
  expect(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toBe(`${BASE}sw.js`);
  // è proprio la versione vecchia: nessun «Separa i lati» in Info
  await goTab(page, 'Info');
  await expect(page.getByRole('checkbox', { name: /Separa i lati/ })).toHaveCount(0);
}

/** b) stessa porta e indirizzo, versione nuova: ricarica, avviso di aggiornamento, «Aggiorna». */
async function updateToNew(page: Page, watch: { on: boolean }) {
  root = NEW!;
  await page.reload();
  const banner = page.locator('.update');
  await expect(banner).toContainText('Nuova versione disponibile.', { timeout: 30_000 });
  watch.on = true;
  await Promise.all([page.waitForEvent('load'), banner.getByRole('button', { name: 'Aggiorna' }).click()]);
  // versione nuova al comando: database v2 (IndexedDB 20) e «Separa i lati» in Info
  await expect(page.locator('nav.tabbar').or(page.getByTestId('firstrun'))).toBeVisible();
  expect(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toBe(`${BASE}sw.js`);
  await goTab(page, 'Info');
  await expect(page.getByRole('checkbox', { name: /Separa i lati/ })).toHaveCount(1);
}

async function expectModel1NoFirstRun(page: Page) {
  await expect(page.getByTestId('firstrun')).toHaveCount(0);
  const tabs = (await page.locator('nav.tabbar button').allTextContents()).map((t) => t.trim());
  expect(tabs.slice(0, 3)).toEqual(['A', 'B', 'C']);
  expect(tabs).not.toContain('D');
  const s = await settingsOf(page);
  expect(s.templateId ?? 'm1').toBe('m1');
  expect([s.separateSides, s.startSide]).toEqual([true, 'left']);
  await goTab(page, 'Info');
  await expect(page.getByRole('checkbox', { name: /Separa i lati/ })).toBeChecked();
  await expect(page.getByRole('group', { name: 'Lato di partenza' }).getByRole('button', { name: 'Sinistro' })).toHaveAttribute('aria-pressed', 'true');
  await goTab(page, 'A');
  await expect(page.locator('section[data-ex="gsq"]')).toBeVisible();
  await expect(row(page, 'row', 0).locator('.side-btn')).toHaveText(['Sx', 'Dx']);
}

test('AG01 con una seduta salvata: aggiornamento col pulsante, Modello 1, lati dal sinistro, Storico, Grafici e precompilazione', async ({ page }) => {
  const watch = watchErrors(page);
  page.on('dialog', (d) => void d.accept());
  await installOld(page);

  // seduta di prova nella scheda A (versione vecchia: Settimane 1-2 attive, 2 serie)
  await goTab(page, 'A');
  const set = async (id: string, i: number, kg: number, reps: number) => {
    const r = row(page, id, i);
    await r.locator('input[placeholder="kg"]').fill(String(kg));
    await r.locator('input[placeholder^="reps"]').fill(String(reps));
    const sx = r.getByRole('button', { name: 'Conferma lato sinistro' });
    if (await sx.count()) {
      await sx.click();
      await r.getByRole('button', { name: 'Conferma lato destro' }).click();
    } else await r.getByRole('button', { name: 'Conferma serie' }).click();
  };
  await set('gsq', 0, 14, 10);
  await set('gsq', 1, 14, 9);
  await set('row', 0, 8, 10);
  await page.locator('button.save').click();
  await expect(page.locator('.toast')).toContainText('Seduta salvata');

  await updateToNew(page, watch);
  await expectModel1NoFirstRun(page);

  // valori grigi precompilati dall'ultima seduta
  await expect(row(page, 'gsq', 0)).toHaveClass(/prefilled/);
  await expect(row(page, 'gsq', 0).locator('input[placeholder="kg"]')).toHaveValue('14');
  await expect(row(page, 'gsq', 0).locator('input[data-field="reps"]')).toHaveValue('10');
  await expect(row(page, 'gsq', 1).locator('input[data-field="reps"]')).toHaveValue('9');
  await expect(row(page, 'row', 0).locator('input[placeholder="kg"]')).toHaveValue('8');

  // Storico: la seduta è sotto «Scheda A»
  await goTab(page, 'Storico');
  const groups = page.locator('.hist h3');
  await expect(groups).toHaveCount(1);
  await expect(groups.first()).toHaveText(/^Scheda\sA\s·\s1\sseduta$/);
  await page.locator('.hist details summary').first().click();
  await expect(page.locator('.hist details').first()).toContainText('Goblet squat');
  await expect(page.locator('.hist details').first()).toContainText('Rematore a un braccio');

  // Grafici: si aprono e disegnano, senza errori
  await goTab(page, 'Grafici');
  for (const id of ['gsq', 'row']) {
    await page.getByLabel('Esercizio').selectOption(id);
    await expect(page.locator('canvas').first()).toBeVisible();
  }
  await page.waitForTimeout(500);
  expect(watch.errors, 'errori in console dopo l’aggiornamento').toEqual([]);
});

test('AG02 storico VUOTO (caso reale): nessun primo avvio, Modello 1, nessun «Disattivarle?» nemmeno 30 giorni dopo', async ({ page }) => {
  const watch = watchErrors(page);
  await installOld(page);
  await goTab(page, 'A');
  await expect(page.locator('section[data-ex="gsq"]')).toBeVisible();

  await updateToNew(page, watch);
  await expectModel1NoFirstRun(page);
  const s = await settingsOf(page);
  expect(s.phase1Since ?? null).toBeNull();
  await goTab(page, 'Info');
  await expect(page.getByRole('checkbox', { name: /Settimane 1-2/ })).toBeChecked(); // attive: l'avviso potrebbe comparire

  // 30 giorni dopo
  const later = Date.now() + 30 * DAY_MS;
  await page.clock.install({ time: later });
  await page.reload();
  expect(await page.evaluate(() => Date.now())).toBeGreaterThanOrEqual(later);
  await expect(page.locator('nav.tabbar')).toBeVisible();
  await expect(page.getByTestId('firstrun')).toHaveCount(0);
  for (const tab of ['A', 'B', 'C']) {
    await goTab(page, tab);
    await expect(page.locator('section[data-ex]').first()).toBeVisible();
    await expect(page.getByText(/Disattivarle\?/)).toHaveCount(0);
  }
  await page.waitForTimeout(500);
  expect(watch.errors, 'errori in console dopo l’aggiornamento').toEqual([]);
});
