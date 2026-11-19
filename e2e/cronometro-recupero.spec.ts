import { expect, test } from '@playwright/test';
import { autoDialogs, card, chip, expectToast, goTab, openApp, openHistory, patchDraft, row, saveSession, typeSet } from './helpers';

// ---------- Cronometro della seduta ----------

test('C01 inizia → cronometro in alto, sopravvive al ricaricamento, durata giusta alla fine', async ({ page }) => {
  const msgs = autoDialogs(page);
  await openApp(page);
  await page.getByRole('button', { name: '▶ Inizia allenamento' }).click();
  const sw = page.locator('header .stopwatch');
  await expect(sw).toContainText('⏱ A · 00:0');
  await expect(page.getByRole('button', { name: '■ Termina allenamento' })).toBeVisible();
  await expect(page.locator('button.save')).toHaveText('■ Termina e salva');

  // simuliamo 47 minuti passati: orario di inizio spostato indietro nel database, poi ricarico
  await typeSet(page, 'gsq', 0, { kg: 14, reps: 10 });
  await patchDraft(page, 'A', { startedAt: new Date(Date.now() - 47 * 60_000).toISOString() });
  await page.reload();
  await expect(sw).toContainText('⏱ A · 47:0');
  // cambiando scheda il cronometro resta visibile
  await goTab(page, 'Info');
  await expect(sw).toBeVisible();
  await goTab(page, 'A');

  await page.getByRole('button', { name: '■ Termina allenamento' }).click();
  expect(msgs.some((m) => m.includes("Terminare l'allenamento? Durata: 47 min"))).toBe(true);
  await expectToast(page, 'Seduta salvata · 47 min');
  await expect(sw).toHaveCount(0);
  await expect(page.getByRole('button', { name: '▶ Inizia allenamento' })).toBeVisible();
  await openHistory(page);
  await expect(page.locator('.hist details').first().locator('summary')).toContainText('47 min');
  await expect(page.locator('.hist details').first()).toContainText('Durata: 47 min');
});

test('C02 annullo la conferma di fine: niente salvato, cronometro ancora attivo', async ({ page }) => {
  page.on('dialog', (d) => void d.dismiss());
  await openApp(page);
  await page.getByRole('button', { name: '▶ Inizia allenamento' }).click();
  await typeSet(page, 'gsq', 0, { kg: 14, reps: 10 });
  await page.getByRole('button', { name: '■ Termina allenamento' }).click();
  await expect(page.locator('header .stopwatch')).toBeVisible();
  await goTab(page, 'Storico');
  await expect(page.locator('.hist details')).toHaveCount(0);
});

test('C03 salvo senza aver premuto Inizia: seduta senza durata, nessun errore', async ({ page }) => {
  autoDialogs(page);
  await openApp(page);
  await typeSet(page, 'gsq', 0, { kg: 14, reps: 10 });
  await saveSession(page);
  await expectToast(page, /^Seduta salvata$/);
  await openHistory(page);
  await expect(page.locator('.hist details').first()).not.toContainText(/\d+ min/);
  await expect(page.locator('.hist details').first()).not.toContainText('Durata');
});

test('C04 un solo allenamento attivo: aprendo B con A in corso compare l’avviso', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: '▶ Inizia allenamento' }).click();
  await goTab(page, 'B');
  await expect(page.locator('.warnbox').first()).toContainText('in corso sulla seduta A');
  await expect(page.getByRole('button', { name: '▶ Inizia allenamento' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Vai alla seduta A' }).click();
  await expect(page.getByRole('button', { name: '■ Termina allenamento' })).toBeVisible();
});

test('C05 durata modificabile dallo storico e inclusa nel backup', async ({ page }) => {
  autoDialogs(page);
  await openApp(page);
  await page.getByRole('button', { name: '▶ Inizia allenamento' }).click();
  await typeSet(page, 'gsq', 0, { kg: 14, reps: 10 });
  await saveSession(page);
  await openHistory(page);
  await page.getByRole('button', { name: 'Modifica' }).click();
  await page.locator('.editor input.duration').fill('52');
  await page.getByRole('button', { name: 'Salva modifiche' }).click();
  await expect(page.locator('.hist details').first().locator('summary')).toContainText('52 min');
  await goTab(page, 'Info');
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Esporta backup' }).click();
  const stream = await (await dl).createReadStream();
  let text = '';
  for await (const chunk of stream) text += chunk;
  expect(JSON.parse(text).sessions[0].durationSec).toBe(52 * 60);
});

// ---------- Recupero automatico ----------

test('R01 scrivere i valori NON avvia il recupero; il tasto ✓ sì', async ({ page }) => {
  await openApp(page);
  await typeSet(page, 'gsq', 0, { kg: 14, reps: 10 }); // confermata scrivendo
  await expect(page.locator('.restbar')).toHaveCount(0);
  await row(page, 'gsq', 0).locator('.check').click(); // tolgo la conferma
  await expect(page.locator('.restbar')).toHaveCount(0);
  // i valori scritti restano, ma tornano grigi (non confermati)
  await expect(row(page, 'gsq', 0)).toHaveClass(/prefilled/);
  await expect(row(page, 'gsq', 0).locator('input[placeholder="kg"]')).toHaveValue('14');
  await row(page, 'gsq', 0).locator('.check').click(); // confermo con ✓
  await expect(page.locator('.restbar')).toContainText('Goblet squat');
  await expect(page.locator('.restbar .t')).toHaveText(/01:(30|29|28)/);
});

test('R02 superset: ✓ su 2a → avviso "Passa a 2b" senza timer; ✓ su 2b → timer', async ({ page }) => {
  await openApp(page);
  await chip(page, 'pu', 0, '2 Schienale divano');
  await typeSet(page, 'pu', 0, { reps: 10 });
  await row(page, 'pu', 0).locator('.check').click();
  await row(page, 'pu', 0).locator('.check').click();
  await expectToast(page, '→ Passa a 2b');
  await expect(page.locator('.restbar')).toHaveCount(0);
  await typeSet(page, 'row', 0, { kg: 14, reps: 10 });
  await row(page, 'row', 0).locator('.check').click();
  await row(page, 'row', 0).locator('.check').click();
  await expect(page.locator('.restbar')).toContainText('Rematore a un braccio');
});

test('R03 ultima serie dell’ultimo esercizio: niente timer', async ({ page }) => {
  await openApp(page);
  // Seduta A, ultimo esercizio = dead bug; con Settimane 1-2 l'ultima serie è la S2
  await typeSet(page, 'db', 1, { reps: 8 });
  await row(page, 'db', 1).locator('.check').click();
  await row(page, 'db', 1).locator('.check').click();
  await expect(page.locator('.restbar')).toHaveCount(0);
  // la S1 dello stesso esercizio invece sì
  await typeSet(page, 'db', 0, { reps: 8 });
  await row(page, 'db', 0).locator('.check').click();
  await row(page, 'db', 0).locator('.check').click();
  await expect(page.locator('.restbar')).toContainText('Dead bug');
});

test('R04 recupero automatico disattivato in Info: ✓ non avvia il timer; il pulsante manuale sì', async ({ page }) => {
  await openApp(page);
  await goTab(page, 'Info');
  await page.locator('.toggle input').uncheck();
  await goTab(page, 'A');
  await typeSet(page, 'gsq', 0, { kg: 14, reps: 10 });
  await row(page, 'gsq', 0).locator('.check').click();
  await row(page, 'gsq', 0).locator('.check').click();
  await expect(page.locator('.restbar')).toHaveCount(0);
  await card(page, 'gsq').getByRole('button', { name: 'Avvia recupero 90s' }).click();
  await expect(page.locator('.restbar')).toContainText('Goblet squat');
});

test('R05 +15 e Stop; a fine recupero compare "Via!" e la barra si chiude', async ({ page }) => {
  await page.clock.install();
  await openApp(page);
  await card(page, 'db').getByRole('button', { name: 'Avvia recupero 45s' }).click();
  await expect(page.locator('.restbar .t')).toHaveText('00:45');
  await page.locator('.restbar').getByRole('button', { name: '+15' }).click();
  await expect(page.locator('.restbar .t')).toHaveText('01:00');
  await page.clock.runFor(60_500);
  await expect(page.locator('.restbar .t')).toHaveText('Via!');
  await page.clock.runFor(3_000);
  await expect(page.locator('.restbar')).toHaveCount(0);
  await card(page, 'db').getByRole('button', { name: 'Avvia recupero 45s' }).click();
  await page.locator('.restbar').getByRole('button', { name: 'Stop' }).click();
  await expect(page.locator('.restbar')).toHaveCount(0);
});

test('R06 ogni esercizio mostra "rec. Xs"', async ({ page }) => {
  await openApp(page);
  await expect(card(page, 'gsq').locator('.meta')).toContainText('rec. 90s');
  await expect(card(page, 'row').locator('.meta')).toContainText('rec. 75s');
  await expect(card(page, 'pu').locator('.meta')).not.toContainText('rec.');
});
