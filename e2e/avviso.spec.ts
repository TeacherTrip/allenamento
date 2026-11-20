import { expect, test, type Locator } from '@playwright/test';
import { card, openApp, passFirstRun, row, separateSidesOn, typeSet } from './helpers';

// D3 (prova sul telefono del 20/11): l'avviso breve non copre mai titoli o tasti; al primo avvio non compare;
// sta sopra la barra in basso (e sopra quella del recupero); un tocco lo chiude.

const box = async (l: Locator) => (await l.boundingBox())!;
const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test.describe('versione costruita (service worker)', () => {
  const PWA = 'http://localhost:4174/allenamento/';
  test.skip(!!process.env.E2E_BASE_URL, 'serve la versione costruita in locale');

  test('A01 «App pronta»: niente al primo avvio, compare dopo «Inizia», «Inizia allenamento» resta cliccabile', async ({ page }) => {
    await page.goto(PWA);
    await expect(page.getByTestId('firstrun')).toBeVisible();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForTimeout(800); // l'avviso del service worker arriverebbe qui
    await expect(page.locator('.toast')).toHaveCount(0);

    await passFirstRun(page, 'm1');
    const toast = page.locator('.toast');
    await expect(toast).toContainText('App pronta: funziona anche senza rete');
    const start = page.getByRole('button', { name: '▶ Inizia allenamento' });
    // non si sovrappone né a «Inizia allenamento», né al titolo, né alla barra in basso
    expect(overlaps(await box(toast), await box(start))).toBe(false);
    expect(overlaps(await box(toast), await box(page.locator('main h2').first()))).toBe(false);
    expect(overlaps(await box(toast), await box(page.locator('nav.tabbar')))).toBe(false);
    await expect(toast).toBeVisible();
    await start.click(); // Playwright controlla che il tocco arrivi davvero al tasto
    await expect(page.getByRole('button', { name: 'Allenamento in corso' })).toBeVisible();
  });
});

test('A02 con il recupero in corso l\'avviso sta sopra la barra del recupero; un tocco lo chiude', async ({ page }) => {
  await openApp(page);
  await separateSidesOn(page, 'A');
  const c = card(page, 'row');
  await c.getByRole('button', { name: /Avvia recupero/ }).click();
  const restbar = page.locator('.restbar');
  await expect(restbar).toBeVisible();
  await typeSet(page, 'row', 0, { kg: 12, reps: 10 });
  await row(page, 'row', 0).getByRole('button', { name: 'Conferma lato sinistro' }).click();
  const toast = page.locator('.toast');
  await expect(toast).toContainText('Lato destro, senza pausa');
  expect(overlaps(await box(toast), await box(restbar))).toBe(false);
  expect(overlaps(await box(toast), await box(page.locator('nav.tabbar')))).toBe(false);
  expect((await box(toast)).y + (await box(toast)).height).toBeLessThanOrEqual((await box(restbar)).y);
  await toast.click();
  await expect(toast).toHaveCount(0);
});

test('A03 spazio riservato: con l\'avviso visibile l\'ultimo tasto della pagina si porta sopra l\'avviso', async ({ page }) => {
  page.on('dialog', (d) => void d.dismiss());
  await openApp(page);
  await separateSidesOn(page, 'A');
  await typeSet(page, 'row', 0, { kg: 12, reps: 10 });
  await row(page, 'row', 0).getByRole('button', { name: 'Conferma lato sinistro' }).click();
  const toast = page.locator('.toast');
  await expect(toast).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const save = page.locator('button.save');
  expect(overlaps(await box(toast), await box(save))).toBe(false);
});
