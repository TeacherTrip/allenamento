import { test, expect } from '@playwright/test';
import { passFirstRun } from './helpers';

// Prove sulla versione COSTRUITA (npm run build + vite preview): il service worker esiste solo lì.
const PWA = 'http://localhost:4174/allenamento/';
test.skip(!!process.env.E2E_BASE_URL, 'serve la versione costruita in locale');

test('manifest: nome, indirizzi e icone raggiungibili', async ({ request }) => {
  const res = await request.get(PWA + 'manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m.name).toBe('TeacherGym');
  expect(m.start_url).toBe('/allenamento/');
  expect(m.scope).toBe('/allenamento/');
  expect(m.display).toBe('standalone');
  expect(m.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
  expect(m.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  for (const i of m.icons) expect((await request.get(PWA + i.src)).ok(), i.src).toBe(true);
  expect((await request.get(PWA + 'favicon.svg')).ok()).toBe(true);
  expect((await request.get(PWA + 'icone/apple-touch-icon.png')).ok()).toBe(true);
});

test('senza rete: l\'app si apre, con immagini e grafici', async ({ page, context }) => {
  await page.goto(PWA);
  await page.evaluate(() => navigator.serviceWorker.ready); // l'avviso «App pronta» compare dopo il primo avvio (prova A01)
  await page.reload(); // dalla seconda apertura la pagina è gestita dal service worker
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await passFirstRun(page); // primo avvio offline: le immagini dei modelli vengono dalla cache
  await expect(page.locator('nav.tabbar')).toBeVisible();
  await expect(page.locator('section[data-ex]').first()).toBeVisible();
  // immagine di un esercizio servita dalla cache
  const img = await page.evaluate(async () => {
    const r = await fetch('esercizi/ap.webp');
    return { ok: r.ok, type: r.headers.get('content-type') };
  });
  expect(img.ok).toBe(true);
  expect(img.type).toContain('webp');
  // la schermata Grafici è caricata a parte: deve esserci anche offline
  await page.locator('nav.tabbar button', { hasText: /^Grafici$/ }).click();
  await expect(page.locator('main h2')).toContainText('Grafici');
  await context.setOffline(false);
});

test('precache: tutte le immagini degli esercizi, nessun doppione', async ({ request }) => {
  const sw = await (await request.get(PWA + 'sw.js')).text();
  const urls = [...sw.matchAll(/url:"([^"]+)"/g)].map((m) => m[1]);
  expect(new Set(urls).size, 'voci doppie nel precache').toBe(urls.length);
  const fs = await import('node:fs');
  const webp = fs.readdirSync('public/esercizi').filter((f) => f.endsWith('.webp'));
  expect(webp.length).toBeGreaterThan(0);
  for (const f of webp) expect(urls, f).toContain(`esercizi/${f}`);
  // immagini dei modelli: il primo avvio funziona anche offline
  for (const f of ['modelli/modello-1.webp', 'modelli/modello-2.webp']) expect(urls, f).toContain(f);
  for (const f of ['index.html', 'manifest.webmanifest', 'favicon.svg', 'icone/icona-192.png', 'icone/icona-512.png'])
    expect(urls, f).toContain(f);
});

test('Info mostra la versione (in locale: "sviluppo locale")', async ({ page }) => {
  await page.goto(PWA);
  await passFirstRun(page);
  await page.locator('nav.tabbar button', { hasText: /^Info$/ }).click();
  await expect(page.getByTestId('app-version')).toHaveText('TeacherGym · sviluppo locale');
});

test('nessun avviso di aggiornamento al primo avvio', async ({ page }) => {
  await page.goto(PWA);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect(page.locator('.update')).toHaveCount(0);
});
