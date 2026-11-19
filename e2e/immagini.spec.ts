import { expect, test, type Locator, type Page } from '@playwright/test';
import { card, goTab, openApp } from './helpers';

const viewer = (page: Page) => page.locator('.viewer');

/** L'immagine è caricata davvero (niente riquadro rotto). */
async function expectLoaded(img: Locator) {
  await img.scrollIntoViewIfNeeded();
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
}

test('I01 seduta A: miniatura → tutto schermo → chiusura con tap, il recupero continua', async ({ page }) => {
  await openApp(page, 'A');
  const thumb = card(page, 'gsq').locator('.thumb img');
  await expect(thumb).toBeVisible();
  await expect(thumb).toHaveAttribute('alt', 'Goblet squat');
  await expect(thumb).toHaveAttribute('loading', 'lazy');
  await expect(thumb).toHaveAttribute('src', /\/allenamento\/esercizi\/gsq\.webp$/);
  await expectLoaded(thumb);

  await page.getByRole('button', { name: '▶ Inizia allenamento' }).click();
  await expect(page.locator('header .stopwatch')).toContainText('⏱ A · 00:0');
  await card(page, 'gsq').locator('button.rest').click();
  await expect(page.locator('.restbar')).toBeVisible();

  await card(page, 'gsq').locator('.thumb').click();
  await expect(viewer(page)).toBeVisible();
  await expectLoaded(viewer(page).locator('img'));
  await page.waitForTimeout(1200);
  await viewer(page).click();
  await expect(viewer(page)).toHaveCount(0);

  await expect(page.locator('.restbar')).toBeVisible();
  await expect(page.locator('.restbar .t')).toHaveText(/01:(2\d|1\d)/);
  await expect(page.locator('header .stopwatch')).toContainText(/⏱ A · 00:0[1-9]/);
});

test('I02 il tasto Indietro chiude l\'immagine e resta nell\'app', async ({ page }) => {
  await openApp(page, 'A');
  const url = page.url();
  await card(page, 'row').locator('.thumb').click();
  await expect(viewer(page)).toBeVisible();
  await page.goBack();
  await expect(viewer(page)).toHaveCount(0);
  expect(page.url()).toBe(url);
  await expect(card(page, 'gsq')).toBeVisible();
});

test('I03 tre aperture/chiusure con tap non lasciano passi vuoti nella cronologia', async ({ page }) => {
  await page.goto('./?prima=1'); // schermata precedente "reale"
  await openApp(page, 'A');
  for (let i = 0; i < 3; i++) {
    await card(page, 'gsq').locator('.thumb').click();
    await expect(viewer(page)).toBeVisible();
    await viewer(page).click();
    await expect(viewer(page)).toHaveCount(0);
  }
  await page.goBack();
  await expect(page).toHaveURL(/\?prima=1$/);
});

test('I04 doppio tap veloce sulla chiusura: un solo passo indietro', async ({ page }) => {
  await page.goto('./?prima=1');
  await openApp(page, 'A');
  await card(page, 'gsq').locator('.thumb').click();
  await expect(viewer(page)).toBeVisible();
  await viewer(page).dblclick();
  await expect(viewer(page)).toHaveCount(0);
  await expect(page).not.toHaveURL(/\?prima=1$/);
  await expect(card(page, 'gsq')).toBeVisible();
});

test('I05 immagine mancante: nessun riquadro rotto, la scheda funziona', async ({ page }) => {
  await page.route('**/esercizi/gsq.webp', (r) => r.fulfill({ status: 404, body: '' }));
  await openApp(page, 'A');
  await expect(card(page, 'pu').locator('.thumb img')).toBeVisible();
  await expect(card(page, 'gsq').locator('.thumb')).toHaveCount(0);
  await expect(card(page, 'gsq').locator('h3')).toHaveText('Goblet squat');
  await expect(card(page, 'gsq').locator('.setrow')).toHaveCount(2);
});

test('I06 riscaldamento (5) e circuito (4) hanno le miniature caricate', async ({ page }) => {
  await openApp(page, 'A');
  const wu = page.getByTestId('warmup').locator('.thumb img');
  await expect(wu).toHaveCount(5);
  for (let i = 0; i < 5; i++) await expectLoaded(wu.nth(i));
  await expect(page.locator('[data-item="wu-pa"] img')).toHaveAttribute('src', /\/esercizi\/pa\.webp$/);

  await goTab(page, 'C');
  const cx = page.getByTestId('circuit').locator('.thumb img');
  await expect(cx).toHaveCount(4);
  for (let i = 0; i < 4; i++) await expectLoaded(cx.nth(i));
});
