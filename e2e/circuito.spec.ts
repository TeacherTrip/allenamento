import { expect, test, type Page } from '@playwright/test';
import { autoDialogs, expectToast, fakes, installFakes, openApp, openHistory, saveSession } from './helpers';

// Timer del circuito (seduta C). L'orologio della pagina è finto (page.clock): i minuti passano in un attimo.

const overlay = (page: Page) => page.locator('.circuit-overlay');
const phase = (page: Page) => page.getByTestId('circuit-phase');
const exName = (page: Page) => page.getByTestId('circuit-exercise');
const time = (page: Page) => page.getByTestId('circuit-time');

async function openC(page: Page) {
  await page.clock.install();
  await installFakes(page);
  await openApp(page, 'C');
}

async function start(page: Page) {
  await page.getByRole('button', { name: '▶ Avvia circuito' }).click();
  await expect(overlay(page)).toBeVisible();
}

test('CI01 protocolli: 4 scelte, la scelta resta dopo il ricaricamento', async ({ page }) => {
  await openApp(page, 'C');
  const radios = page.getByRole('radio');
  await expect(radios).toHaveCount(4);
  await expect(radios.nth(0)).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('radio', { name: /Sett\. 3-4/ }).click();
  await expect(page.getByRole('radio', { name: /Sett\. 3-4/ })).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await expect(page.getByRole('radio', { name: /Sett\. 3-4/ })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: /Sett\. 3-4/ })).toContainText('8× 30/30 s');
});

test('CI02 preparazione → lavoro → pausa: fasi, esercizio, immagine, suoni, schermo acceso', async ({ page }) => {
  await openC(page);
  await start(page);
  await expect(phase(page)).toHaveText('PREPARATI');
  await expect(exName(page)).toHaveText('Primo: Shadow boxing');
  await expect(time(page)).toHaveText('00:05');
  expect((await fakes(page)).wl).toBeGreaterThan(0);

  const before = await fakes(page);
  await page.clock.runFor(5_000);
  await expect(phase(page)).toHaveText('LAVORO · round 1/6');
  await expect(exName(page)).toHaveText('Shadow boxing');
  await expect(overlay(page).locator('.co-img img')).toHaveAttribute('src', /cx-shadow\.webp$/);
  await expect(time(page)).toHaveText('00:30');
  const atWork = await fakes(page);
  expect(atWork.audio.osc - before.audio.osc).toBeGreaterThanOrEqual(4); // 3-2-1 + bip di inizio lavoro
  expect(atWork.vib).toBeGreaterThan(before.vib);

  await page.clock.runFor(30_000);
  await expect(phase(page)).toHaveText('PAUSA · poi round 2/6');
  await expect(exName(page)).toHaveText('Prossimo: Step-out jack');
  await expect(overlay(page).locator('.co-img img')).toHaveAttribute('src', /cx-stepout\.webp$/);

  await page.clock.runFor(30_000);
  await expect(phase(page)).toHaveText('LAVORO · round 2/6');
  await expect(exName(page)).toHaveText('Step-out jack');
});

test('CI03 pausa: il tempo si ferma; riprendi: riparte da lì', async ({ page }) => {
  await openC(page);
  await start(page);
  await page.clock.runFor(15_000); // 10 s di lavoro
  await expect(time(page)).toHaveText('00:20');
  await page.getByRole('button', { name: '❚❚ Pausa' }).click();
  await expect(phase(page)).toHaveText('LAVORO · round 1/6 · IN PAUSA');
  await page.clock.runFor(120_000);
  await expect(time(page)).toHaveText('00:20');
  await page.getByRole('button', { name: '▶ Riprendi' }).click();
  await page.clock.runFor(5_000);
  await expect(time(page)).toHaveText('00:15');
});

test('CI04 circuito completo → registrato → salvato nello storico', async ({ page }) => {
  autoDialogs(page);
  await openC(page);
  await start(page);
  await page.clock.runFor(5_000 + 6 * 30_000 + 5 * 30_000);
  await expect(phase(page)).toHaveText('COMPLETATO');
  await expect(overlay(page)).toContainText('6 round fatti');
  await page.getByRole('button', { name: 'Chiudi' }).click();
  await expect(overlay(page)).toHaveCount(0);
  await expect(page.getByTestId('circuit-recorded')).toContainText('Sett. 1-2, 6/6 round');

  await saveSession(page);
  await expectToast(page, 'Seduta salvata');
  await openHistory(page);
  await expect(page.locator('.hist details').first()).toContainText('Sett. 1-2, 6/6 round');
});

test('CI05 interrompo dopo 2 round: chiede conferma e registra 2/6', async ({ page }) => {
  const msgs = autoDialogs(page);
  await openC(page);
  await start(page);
  await page.clock.runFor(5_000 + 3 * 30_000 + 10_000); // lavoro 1, pausa, lavoro 2 → 10 s nella pausa dopo il round 2
  await expect(phase(page)).toHaveText('PAUSA · poi round 3/6');
  await page.getByRole('button', { name: 'Interrompi' }).click();
  expect(msgs.some((m) => m.includes('Round completati: 2/6'))).toBe(true);
  await expect(overlay(page)).toHaveCount(0);
  await expect(page.getByTestId('circuit-recorded')).toContainText('2/6 round');
  // il passo aggiunto alla cronologia è stato tolto: un'altra chiusura non resta appesa
  expect(await page.evaluate(() => (history.state as { overlay?: string } | null)?.overlay)).toBeUndefined();
});

test('CI06 ricaricamento a metà: il circuito riprende al punto giusto', async ({ page }) => {
  await openC(page);
  await start(page);
  await page.clock.runFor(5_000 + 30_000 + 30_000 + 12_000); // round 2, 12 s di lavoro
  await expect(phase(page)).toHaveText('LAVORO · round 2/6');
  await page.reload();
  await expect(phase(page)).toHaveText('LAVORO · round 2/6');
  await expect(time(page)).toHaveText('00:18');
});

test('CI07 tasto Indietro: chiede conferma; se annullo il circuito resta aperto', async ({ page }) => {
  await openC(page);
  await start(page);
  await page.clock.runFor(10_000);
  const asked: string[] = [];
  page.once('dialog', (d) => {
    asked.push(d.message());
    void d.dismiss();
  });
  await page.goBack();
  await expect.poll(() => asked.length).toBe(1);
  await expect(overlay(page)).toBeVisible();
  // un secondo Indietro, confermato, chiude
  page.once('dialog', (d) => void d.accept());
  await page.goBack();
  await expect(overlay(page)).toHaveCount(0);
  await expect(page.locator('nav.tabbar')).toBeVisible();
});

test('CI08 rifare il circuito chiede conferma e sostituisce il precedente', async ({ page }) => {
  const msgs = autoDialogs(page);
  await openC(page);
  await start(page);
  await page.clock.runFor(5_000 + 30_000 + 5_000);
  await page.getByRole('button', { name: 'Interrompi' }).click();
  await expect(page.getByTestId('circuit-recorded')).toContainText('1/6 round');
  await start(page);
  expect(msgs.some((m) => m.includes('Circuito già registrato (1/6 round)'))).toBe(true);
  await expect(phase(page)).toHaveText('PREPARATI');
});
