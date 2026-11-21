import { expect, test, type Page } from '@playwright/test';
import { autoDialogs, expectToast, goTab, installFakes, logSet, openApp, openHistory, saveSession, separateSidesOn } from './helpers';
import { readDb } from './migrazione-helpers';
import type { SettingRow } from '../src/db/migrate';
import type { Program } from '../src/program/types';
import type { Session, SetLog } from '../src/db/models';

// Circuito facoltativo in fondo alle schede A e B del Modello 1 (21/11). C e Modello 2 invariati. Dati inventati.

const NOTE = 'facoltativo: si salta se stanco o poco recuperato';
const box = (page: Page) => page.getByTestId('circuit-box');
const startBtn = (page: Page) => box(page).getByRole('button', { name: '▶ Avvia circuito' });

const programsOf = async (page: Page) =>
  ((await readDb(page)).stores.programs as Program[]).sort((a, b) => a.order - b.order);
const settingsOf = async (page: Page) =>
  Object.fromEntries(((await readDb(page)).stores.settings as SettingRow[]).map((r) => [r.key, r.value]));

/** Il riquadro del circuito viene dopo l'ultimo esercizio (ultima voce della seduta). */
async function expectCircuitLast(page: Page) {
  const after = await box(page).evaluate((n) => {
    const all = document.querySelectorAll('section.ex');
    return !!(n.compareDocumentPosition(all[all.length - 1]) & Node.DOCUMENT_POSITION_PRECEDING);
  });
  expect(after).toBe(true);
}

/** A e B: circuito facoltativo, chiuso, con la frase; si apre con un tocco. C: circuito aperto, senza frase. */
async function expectModel1Circuits(page: Page) {
  for (const tab of ['A', 'B']) {
    await goTab(page, tab);
    await expect(page.locator('h2')).toHaveText(`Seduta ${tab} — Full body`);
    await expect(box(page)).toHaveCount(1);
    await expectCircuitLast(page);
    await expect(page.getByTestId('circuit-note')).toHaveText(NOTE);
    await expect(box(page).locator('summary')).toContainText('Circuito cardio senza salti');
    await expect(box(page)).not.toContainText('(facoltativo)');
    await expect(startBtn(page)).toBeHidden();
    await box(page).locator('summary').click();
    await expect(page.getByTestId('circuit').locator('li')).toHaveCount(4);
    await expect(page.getByRole('radio')).toHaveCount(4);
    await expect(startBtn(page)).toBeVisible();
  }
  await goTab(page, 'C');
  await expect(box(page)).toHaveCount(1);
  await expectCircuitLast(page);
  await expect(box(page).locator('summary')).toHaveCount(0);
  await expect(page.getByTestId('circuit-note')).toHaveCount(0);
  await expect(box(page)).not.toContainText('facoltativo');
  await expect(startBtn(page)).toBeVisible();
}

test('CA01 installazione nuova, Modello 1: A e B finiscono con il circuito facoltativo, C invariata', async ({ page }) => {
  await openApp(page, 'A');
  await expectModel1Circuits(page);
  const ps = await programsOf(page);
  expect(ps.map((p) => [p.name, p.circuit, p.circuitNote])).toEqual([
    ['A', 'optional', NOTE],
    ['B', 'optional', NOTE],
    ['C', 'yes', undefined],
  ]);
});

test('CA02 installazione nuova, Modello 2: nessuna modifica (A-C «(facoltativo)» senza frase, D senza circuito)', async ({ page }) => {
  await openApp(page, 'A', 'm2');
  for (const tab of ['A', 'B', 'C']) {
    await goTab(page, tab);
    await expect(box(page).locator('summary')).toHaveText('Circuito cardio senza salti (facoltativo)');
    await expect(page.getByTestId('circuit-note')).toHaveCount(0);
  }
  await goTab(page, 'D');
  await expect(page.locator('h2')).toContainText('Seduta D');
  await expect(box(page)).toHaveCount(0);
  expect((await programsOf(page)).every((p) => !('circuitNote' in p))).toBe(true);
});

test('CA03 «Ricarica un modello» → Modello 1: A e B con il circuito; le impostazioni restano', async ({ page }) => {
  autoDialogs(page);
  await openApp(page, 'C', 'm2');
  // impostazioni cambiate prima della ricarica: lati separati, Settimane 1-2 spente, protocollo Sett. 3-4
  await box(page).locator('summary').click(); // nel Modello 2 il circuito della C è facoltativo (chiuso)
  await page.getByRole('radio', { name: /Sett\. 3-4/ }).click();
  await separateSidesOn(page, 'A');
  await goTab(page, 'Info');
  await page.getByRole('checkbox', { name: /Settimane 1-2/ }).uncheck();
  // le scritture nel database arrivano poco dopo i tocchi: aspettarle
  await expect
    .poll(() => settingsOf(page))
    .toMatchObject({ separateSides: true, phase1: false, cardioProtocol: 1, templateId: 'm2' });
  const before = await settingsOf(page);

  await page.getByRole('button', { name: 'Ricarica un modello' }).click();
  await page.getByTestId('reload-models').getByTestId('model-m1').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sostituisci' }).click();
  await expectToast(page, 'Schede del Modello 1 caricate');
  await expect(page.locator('nav.tabbar button')).toHaveText(['A', 'B', 'C', 'Storico', 'Grafici', 'Info']);

  const after = await settingsOf(page);
  expect(after).toEqual({ ...before, templateId: 'm1' });
  await goTab(page, 'Info');
  await expect(page.getByRole('checkbox', { name: /Separa i lati/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /Settimane 1-2/ })).not.toBeChecked();

  await expectModel1Circuits(page);
  await goTab(page, 'A');
  await box(page).locator('summary').click();
  await expect(page.getByRole('radio', { name: /Sett\. 3-4/ })).toHaveAttribute('aria-checked', 'true');
});

test('CA04 seduta A salvata senza fare il circuito: nessun avviso, seduta salvata', async ({ page }) => {
  const dialogs = autoDialogs(page);
  await openApp(page, 'A');
  await logSet(page, 'gsq', 0, { kg: 8, reps: 10 });
  await saveSession(page);
  await expectToast(page, 'Seduta salvata');
  expect(dialogs).toEqual([]);
  const { sessions, setLogs } = (await readDb(page)).stores as { sessions: Session[]; setLogs: SetLog[] };
  expect(sessions).toHaveLength(1);
  expect(sessions[0]).not.toHaveProperty('circuit');
  expect(sessions[0].programName).toBe('A');
  expect(setLogs).toHaveLength(1);
});

test('CA05 seduta A con il circuito fatto: salvata con serie e circuito', async ({ page }) => {
  autoDialogs(page);
  await page.clock.install();
  await installFakes(page);
  await openApp(page, 'A');
  await logSet(page, 'gsq', 0, { kg: 8, reps: 10 });
  await box(page).locator('summary').click();
  await startBtn(page).click();
  const overlay = page.locator('.circuit-overlay');
  await expect(overlay).toBeVisible();
  await page.clock.runFor(5_000 + 6 * 30_000 + 5 * 30_000);
  await expect(page.getByTestId('circuit-phase')).toHaveText('COMPLETATO');
  await page.getByRole('button', { name: 'Chiudi' }).click();
  await expect(overlay).toHaveCount(0);
  await expect(page.getByTestId('circuit-recorded')).toContainText('Sett. 1-2, 6/6 round');

  await saveSession(page);
  await expectToast(page, 'Seduta salvata');
  const { sessions, setLogs } = (await readDb(page)).stores as { sessions: Session[]; setLogs: SetLog[] };
  expect(sessions).toHaveLength(1);
  expect(sessions[0].circuit).toEqual({ protocol: 0, label: 'Sett. 1-2', rounds: 6, completedRounds: 6 });
  expect(setLogs).toHaveLength(1);
  await openHistory(page);
  await expect(page.locator('.hist details').first()).toContainText('Sett. 1-2, 6/6 round');
});
