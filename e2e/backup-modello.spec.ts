import { expect, test } from '@playwright/test';
import * as os from 'node:os';
import * as path from 'node:path';
import { autoDialogs, expectToast, goTab, logSet, openApp, passFirstRun, saveSession } from './helpers';
import { readDb } from './migrazione-helpers';
import type { SettingRow } from '../src/db/migrate';

// Backup v2 con il Modello 2 ripristinato su un telefono vuoto: torna il Modello 2, testi di Info compresi. Dati inventati.

test('BK01 backup fatto col Modello 2 → telefono vuoto (primo avvio col Modello 1) → import: Modello 2, schede e Info', async ({ page, browser }, info) => {
  autoDialogs(page);
  await openApp(page, 'A', 'm2');
  await logSet(page, 'gsq', 0, { kg: 6, reps: 10 });
  await saveSession(page);
  await goTab(page, 'Info');
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Esporta backup' }).click();
  // salvato FUORI dal progetto, in una cartella temporanea di sistema
  const file = path.join(os.tmpdir(), `tg-e2e-${Date.now()}-m2.json`);
  await (await dl).saveAs(file);

  // «telefono vuoto»: profilo nuovo, con le stesse impostazioni del progetto
  const { baseURL, ...use } = info.project.use;
  const ctx = await browser.newContext({ ...(use as object), baseURL });
  const phone = await ctx.newPage();
  autoDialogs(phone);
  await phone.goto('./');
  await passFirstRun(phone, 'm1'); // senza dati si passa per forza dal primo avvio
  await goTab(phone, 'Info');
  await expect(phone.getByText('Esempio', { exact: true })).toHaveCount(0);

  await phone.locator('input[type="file"]').setInputFiles(file);
  await expectToast(phone, 'Backup importato: 1 sedute');
  const settings = Object.fromEntries(((await readDb(phone)).stores.settings as SettingRow[]).map((r) => [r.key, r.value]));
  expect(settings.templateId).toBe('m2');
  await expect(phone.locator('nav.tabbar button')).toHaveText(['A', 'B', 'C', 'D', /Storico/, /Grafici/, /Info/]);
  await goTab(phone, 'Info');
  await expect(phone.getByText('Esempio', { exact: true })).toBeVisible();
  await expect(phone.getByTestId('rules').locator('li')).toHaveCount(12);
  await expect(phone.getByText(/dal Modello 2/)).toBeVisible();
  await ctx.close();
});
