import { expect, test, type Page } from '@playwright/test';
import { card, goTab, openApp, row, typeSet } from './helpers';
import { readDb, seedV1 } from './migrazione-helpers';
import type { SettingRow } from '../src/db/migrate';

// «Separa i lati» (Info): spento di serie sulle installazioni nuove, acceso dalla migrazione. Dati inventati.

const settingsOf = async (page: Page) =>
  Object.fromEntries(((await readDb(page)).stores.settings as SettingRow[]).map((r) => [r.key, r.value]));

const sidesBox = (page: Page) => page.getByRole('checkbox', { name: /Separa i lati/ });

test('L01 spento (installazione nuova): un solo ✓ per serie, «per lato», nessuna indicazione di lato', async ({ page }) => {
  await openApp(page); // Modello 1, scheda A: rematore a un braccio
  const c = card(page, 'row');
  await expect(c.locator('.meta')).toContainText('2 × 8-12 per lato'); // Settimane 1-2: 2 serie
  await expect(c.locator('.side')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(/Parti dal lato|sinistro|destro/);
  const r = row(page, 'row', 0);
  await expect(r.locator('.side-btn')).toHaveCount(0);
  await typeSet(page, 'row', 0, { kg: 12, reps: 10 });
  await r.getByRole('button', { name: 'Conferma serie' }).click();
  await expect(r).toHaveClass(/confirmed/);
  // in Info: interruttore spento, lato di partenza nascosto
  await goTab(page, 'Info');
  await expect(sidesBox(page)).not.toBeChecked();
  await expect(page.getByTestId('start-side')).toHaveCount(0);
});

test('L02 acceso dal lato destro: i lati partono da quello scelto', async ({ page }) => {
  await openApp(page);
  await goTab(page, 'Info');
  await sidesBox(page).check();
  await expect(page.getByTestId('start-side')).toBeVisible();
  await page.getByRole('group', { name: 'Lato di partenza' }).getByRole('button', { name: 'Destro' }).click();
  await expect.poll(async () => {
    const s = await settingsOf(page);
    return [s.separateSides, s.startSide];
  }).toEqual([true, 'right']);
  await goTab(page, 'A');
  await expect(card(page, 'row')).toContainText('Parti dal lato destro: tocca Dx, poi Sx senza pausa');
  const r = row(page, 'row', 0);
  await expect(r.locator('.side-btn')).toHaveText(['Dx', 'Sx']);
  await typeSet(page, 'row', 0, { kg: 12, reps: 10 });
  await r.getByRole('button', { name: 'Conferma lato destro' }).click();
  await expect(r).not.toHaveClass(/confirmed/);
  await r.getByRole('button', { name: 'Conferma lato sinistro' }).click();
  await expect(r).toHaveClass(/confirmed/);
});

test('L03 bloccato con un allenamento avviato: il messaggio dice quale scheda', async ({ page }) => {
  await openApp(page, 'B');
  await page.getByRole('button', { name: /Inizia allenamento/ }).click();
  await goTab(page, 'Info');
  await expect(sidesBox(page)).toBeDisabled();
  await expect(page.getByTestId('sides-blocked')).toHaveText(
    'C’è un allenamento avviato sulla scheda B: concludilo o annullalo prima di cambiare «Separa i lati».',
  );
});

test('L04 database v1 migrato: lati separati accesi, dal sinistro come prima', async ({ page }) => {
  await seedV1(page, { sessions: [], setLogs: [], drafts: [], settings: [] });
  await page.goto('./');
  await goTab(page, 'A');
  await expect(row(page, 'row', 0).locator('.side-btn')).toHaveText(['Sx', 'Dx']);
  const s = await settingsOf(page);
  expect([s.separateSides, s.startSide]).toEqual([true, 'left']);
  await goTab(page, 'Info');
  await expect(sidesBox(page)).toBeChecked();
});

test('L05 installazione nuova: lati separati spenti (nessuna voce scritta: vale il predefinito)', async ({ page }) => {
  await openApp(page, 'A', 'm2');
  expect((await settingsOf(page)).separateSides).toBeUndefined();
  await expect(row(page, 'row', 0).locator('.side-btn')).toHaveCount(0);
});
