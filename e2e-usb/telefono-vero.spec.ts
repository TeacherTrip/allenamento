import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { card, goTab, logSet, passFirstRun, row, typeSet } from '../e2e/helpers';
import { APP, SHOTS, expect, test } from './usb';

// Prove sul telefono vero, SOLO su http://localhost:5173/allenamento/. Si lanciano con `npm run prova-usb`
// (vedi playwright.usb.config.ts). Dati inventati. Ordine: U1…U5, poi la prova offline, che ferma il server.

fs.mkdirSync(SHOTS, { recursive: true });
const MISURE = path.join(SHOTS, 'misure.json');
const misure: Record<string, unknown> = fs.existsSync(MISURE) ? JSON.parse(fs.readFileSync(MISURE, 'utf8')) : {};
const salva = (k: string, v: unknown) => {
  misure[k] = v;
  fs.writeFileSync(MISURE, JSON.stringify(misure, null, 1));
};
const shot = (page: Page, name: string) => page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
/** Misura un tasto e controlla l'area da toccare (≥ 48 × 48 px, se richiesto). */
const size = async (l: Locator, min48 = false) => {
  const b = (await l.boundingBox())!;
  if (min48) {
    expect(b.width).toBeGreaterThanOrEqual(48);
    expect(b.height).toBeGreaterThanOrEqual(48);
  }
  return `${Math.round(b.width)} × ${Math.round(b.height)}`;
};

test('U1 primo avvio: una schermata, immagini caricate, misure; Modello 2 → schede A-D', async ({ page }) => {
  await page.goto(APP);
  await expect(page.getByTestId('firstrun')).toBeVisible();
  salva('innerWidth', await page.evaluate(() => window.innerWidth));
  salva('devicePixelRatio', await page.evaluate(() => window.devicePixelRatio));
  for (const id of ['m1', 'm2']) {
    const img = page.getByTestId(`model-${id}`).locator('img');
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(800);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, '1-primo-avvio');
  salva('scorrimentoOrizzontalePrimoAvvio', await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth));
  await page.getByTestId('model-m2').click();
  const inizia = page.getByRole('button', { name: 'Inizia', exact: true });
  await inizia.scrollIntoViewIfNeeded();
  salva('tastoInizia', await size(inizia, true));
  await shot(page, '2-primo-avvio-scelto');
  await inizia.click();
  await expect(page.locator('nav.tabbar button')).toHaveText(['A', 'B', 'C', 'D', 'Storico', 'Grafici', 'Info']);
  const barra: string[] = [];
  let tagliati = 0;
  for (const b of await page.locator('nav.tabbar button').all()) {
    barra.push(await size(b, true));
    if (await b.evaluate((el) => el.scrollWidth > el.clientWidth)) tagliati++;
  }
  salva('barraInBasso', barra);
  salva('barraTestiTagliati', tagliati);
  salva('tastoIniziaAllenamento', await size(page.getByRole('button', { name: /Inizia allenamento/ })));
  await shot(page, '3-seduta-A-modello-2');
});

test('U2 seduta del Modello 2: ✓, salvataggio, storico e grafici', async ({ page }) => {
  page.on('dialog', (d) => void d.accept());
  await page.goto(APP);
  await passFirstRun(page, 'm2');
  await goTab(page, 'A');
  await expect(card(page, 'gsq').locator('input[placeholder="kg"]').first()).toHaveValue('6');
  salva('tastoConferma', await size(row(page, 'gsq', 0).getByRole('button', { name: 'Conferma serie' }), true));
  await logSet(page, 'gsq', 0, { kg: 6, reps: 11 });
  await page.locator('button.save').click();
  await expect(page.locator('.toast')).toContainText('Seduta salvata');
  await goTab(page, 'Storico');
  await page.locator('.hist details').first().locator('summary').click();
  await expect(page.locator('.hist details').first()).toContainText('6 kg × 11');
  await goTab(page, 'Grafici');
  await expect(page.locator('main canvas').first()).toBeVisible();
  await shot(page, '4-grafici');
});

test('U3 «Separa i lati»: spento un solo ✓; acceso dal destro [Dx] [Sx]', async ({ page }) => {
  await page.goto(APP);
  await passFirstRun(page, 'm1');
  await goTab(page, 'A');
  const r = row(page, 'row', 0);
  await expect(card(page, 'row').locator('.meta')).toContainText('per lato');
  await expect(r.locator('.side-btn')).toHaveCount(0);
  await card(page, 'row').scrollIntoViewIfNeeded();
  await shot(page, '5-lati-spenti');
  await goTab(page, 'Info');
  await page.getByRole('checkbox', { name: /Separa i lati/ }).check();
  await page.getByRole('group', { name: 'Lato di partenza' }).getByRole('button', { name: 'Destro' }).click();
  await page.getByTestId('start-side').scrollIntoViewIfNeeded();
  await shot(page, '6-info-lati');
  await goTab(page, 'A');
  await expect(r.locator('.side-btn')).toHaveText(['Dx', 'Sx']);
  salva('tastiLati', [await size(r.locator('.side-btn').nth(0), true), await size(r.locator('.side-btn').nth(1), true)]);
  await typeSet(page, 'row', 0, { kg: 12, reps: 10 });
  await r.getByRole('button', { name: 'Conferma lato destro' }).click();
  await r.getByRole('button', { name: 'Conferma lato sinistro' }).click();
  await expect(r).toHaveClass(/confirmed/);
  await card(page, 'row').scrollIntoViewIfNeeded();
  await shot(page, '7-lati-accesi');
});

test('U4 Ricarica un modello: Modello 2 → Modello 1, storico intatto', async ({ page }) => {
  page.on('dialog', (d) => void d.accept());
  await page.goto(APP);
  await passFirstRun(page, 'm2');
  await goTab(page, 'A');
  await logSet(page, 'gsq', 0, { kg: 6, reps: 10 });
  await page.locator('button.save').click();
  await goTab(page, 'Info');
  await page.getByRole('button', { name: 'Ricarica un modello' }).click();
  await page.getByTestId('reload-models').getByTestId('model-m1').click();
  await shot(page, '8-conferma-ricarica');
  await page.getByRole('dialog').getByRole('button', { name: 'Sostituisci' }).click();
  await expect(page.locator('nav.tabbar button')).toHaveText(['A', 'B', 'C', 'Storico', 'Grafici', 'Info']);
  await goTab(page, 'Storico');
  await expect(page.locator('.hist details')).toHaveCount(1);
});

test('U5 schermo acceso durante il timer del circuito (Wake Lock)', async ({ page }) => {
  // dumpsys non basta: col debug collegato Chrome tiene acceso lo schermo comunque. Si registra la richiesta dentro la pagina.
  await page.addInitScript(() => {
    const w = window as unknown as { __locks: { ok: boolean; err?: string; s?: WakeLockSentinel }[] };
    w.__locks = [];
    const orig = navigator.wakeLock.request.bind(navigator.wakeLock);
    navigator.wakeLock.request = async (t?: 'screen') => {
      try {
        const s = await orig(t);
        w.__locks.push({ ok: true, s });
        return s;
      } catch (e) {
        w.__locks.push({ ok: false, err: String(e) });
        throw e;
      }
    };
  });
  const stato = () =>
    page.evaluate(() =>
      (window as unknown as { __locks: { ok: boolean; err?: string; s?: WakeLockSentinel }[] }).__locks.map((l) =>
        l.ok ? (l.s!.released ? 'concesso, poi rilasciato' : 'concesso, attivo') : `negato: ${l.err}`,
      ),
    );
  await page.goto(APP);
  await passFirstRun(page, 'm1');
  await goTab(page, 'C');
  salva('wakeLockPrimaDelCircuito', await stato());
  await page.getByTestId('circuit-box').getByRole('button', { name: '▶ Avvia circuito' }).click();
  await expect(page.locator('.circuit-overlay')).toBeVisible();
  await expect.poll(stato).toContain('concesso, attivo');
  await page.waitForTimeout(5000); // il timer gira
  await shot(page, '10-circuito');
  salva('wakeLockDopo5sDiTimer', await stato());
  page.on('dialog', (d) => void d.accept()); // «Interrompi» chiede conferma
  await page.getByRole('button', { name: 'Interrompi' }).click();
  await expect(page.locator('.circuit-overlay')).toHaveCount(0);
  await page.waitForTimeout(1000);
  salva('wakeLockDopoInterrompi', await stato());
});

test('U6 (ultima) primo avvio OFFLINE: dopo il primo caricamento il server viene fermato', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto(APP);
  await expect(page.getByTestId('firstrun')).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  // Si ferma il SERVER (togliere l'inoltro non basta: un collegamento già aperto resta in piedi).
  // La prova scrive «pronto-offline», scripts/prova-usb.mjs ferma il server e scrive «server-fermo».
  const pronto = path.join(SHOTS, 'pronto-offline'), fermo = path.join(SHOTS, 'server-fermo');
  fs.rmSync(fermo, { force: true });
  fs.writeFileSync(pronto, '');
  await expect.poll(() => fs.existsSync(fermo), { timeout: 180_000, intervals: [1000] }).toBe(true);
  {
    // indirizzo FUORI dal service worker (che vale solo per /allenamento/): risponde solo se il server è raggiungibile
    const online = await page.evaluate(() => fetch('/?prova-rete=' + Date.now(), { cache: 'no-store' }).then(() => true, () => false));
    salva('serverRaggiungibileDuranteOffline', online);
    expect(online).toBe(false);
    await page.reload();
    await expect(page.getByTestId('firstrun')).toBeVisible();
    for (const id of ['m1', 'm2']) {
      const img = page.getByTestId(`model-${id}`).locator('img');
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(800);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, '9-primo-avvio-offline');
    await page.getByTestId('model-m1').click();
    await page.getByRole('button', { name: 'Inizia', exact: true }).click();
    await expect(page.locator('nav.tabbar button')).toHaveText(['A', 'B', 'C', 'Storico', 'Grafici', 'Info']);
    await goTab(page, 'A');
    await expect(card(page, 'gsq').locator('img')).toBeVisible();
    await expect.poll(() => card(page, 'gsq').locator('img').evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  }
});
