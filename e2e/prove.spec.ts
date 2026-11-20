import { expect, test } from '@playwright/test';
import * as os from 'node:os';
import * as path from 'node:path';
import { autoDialogs, card, chip, expectToast, goTab, openApp, openHistory, row, saveSession, setPhase1InInfo, typeSet, checkSet, logSet, separateSidesOn } from './helpers';

// Prove 1-19 concordate. Ogni test parte da un profilo pulito (database vuoto).
// Di default "Settimane 1-2" è attivo: 2 serie per esercizio.

test('P01 scrivere kg e reps NON conferma la serie: solo il tasto ✓ (che avvia il recupero)', async ({ page }) => {
  await openApp(page);
  await typeSet(page, 'gsq', 0, { kg: 14, reps: 10 });
  await expect(row(page, 'gsq', 0)).toHaveClass(/prefilled/);
  await expect(row(page, 'gsq', 0).locator('.check')).not.toHaveClass(/on/);
  await expect(page.locator('.restbar')).toHaveCount(0);
  await checkSet(page, 'gsq', 0);
  await expect(row(page, 'gsq', 0)).toHaveClass(/confirmed/);
  await expect(row(page, 'gsq', 0).locator('.check')).toHaveClass(/on/);
  await expect(page.locator('.restbar')).toContainText('Goblet squat');
  await expect(row(page, 'gsq', 1)).toHaveClass(/prefilled/);
  // correggere un valore di una serie già confermata: resta confermata
  await typeSet(page, 'gsq', 0, { reps: 11 });
  await expect(row(page, 'gsq', 0)).toHaveClass(/confirmed/);
});

test('P02 elastico e appoggio si selezionano con i pulsanti (confermati solo con ✓)', async ({ page }) => {
  await openApp(page);
  await chip(page, 'pull', 0, '30');
  await typeSet(page, 'pull', 0, { reps: 4 });
  await expect(row(page, 'pull', 0).getByRole('button', { name: '30', exact: true })).toHaveClass(/on prefilled/);
  await checkSet(page, 'pull', 0);
  await expect(row(page, 'pull', 0).getByRole('button', { name: '30', exact: true })).toHaveClass(/on confirmed/);
  await chip(page, 'pu', 0, '2 Schienale divano');
  await expect(row(page, 'pu', 0).getByRole('button', { name: '2 Schienale divano' })).toHaveClass(/on prefilled/);
  await checkSet(page, 'pu', 0);
  await expect(row(page, 'pu', 0).getByRole('button', { name: '2 Schienale divano' })).toHaveClass(/on confirmed/);
});

test('P03 la bozza sopravvive al ricaricamento', async ({ page }) => {
  await openApp(page);
  await typeSet(page, 'gsq', 0, { kg: 14, reps: 10 });
  await page.locator('textarea').fill('nota di prova');
  await page.reload();
  await expect(row(page, 'gsq', 0).locator('input[placeholder="kg"]')).toHaveValue('14');
  await expect(row(page, 'gsq', 0).locator('input[placeholder^="reps"]')).toHaveValue('10');
  await expect(page.locator('textarea')).toHaveValue('nota di prova');
});

test('P04-P05 salvo; riaprendo la seduta i valori sono precompilati in grigio', async ({ page }) => {
  autoDialogs(page);
  await openApp(page);
  await logSet(page, 'gsq', 0, { kg: 14, reps: 10 });
  await logSet(page, 'gsq', 1, { kg: 14, reps: 9 });
  await saveSession(page);
  await expectToast(page, 'Seduta salvata');
  await goTab(page, 'Storico');
  await goTab(page, 'A');
  const r0 = row(page, 'gsq', 0);
  await expect(r0).toHaveClass(/prefilled/);
  await expect(r0.locator('input[placeholder="kg"]')).toHaveValue('14');
  await expect(r0.locator('input[placeholder^="reps"]')).toHaveValue('10');
  await expect(row(page, 'gsq', 1).locator('input[placeholder^="reps"]')).toHaveValue('9');
  await expect(card(page, 'gsq').locator('.last')).toContainText('Ultima volta');
});

test('P06+P12 serie non confermate: avviso e storico con SOLO le confermate', async ({ page }) => {
  const msgs = autoDialogs(page);
  await openApp(page);
  await logSet(page, 'gsq', 0, { kg: 14, reps: 10 });
  await logSet(page, 'gsq', 1, { kg: 14, reps: 9 });
  await saveSession(page);
  await expectToast(page, 'Seduta salvata');
  // nuova seduta: confermo solo S1 (✓ sul valore precompilato)
  await row(page, 'gsq', 0).locator('.check').click();
  await saveSession(page);
  expect(msgs.some((m) => /1 serie non confermate \(senza ✓\) NON verranno salvate/.test(m))).toBe(true);
  await openHistory(page);
  const newest = page.locator('.hist details').first();
  await expect(newest).toContainText('1 serie');
  await expect(newest.locator('.it', { hasText: 'Goblet squat' })).toHaveText('Goblet squat: 14 kg × 10');
});

test('P07 range massimo su tutte le serie → "Aumenta carico o variante"', async ({ page }) => {
  autoDialogs(page);
  await openApp(page);
  await logSet(page, 'gsq', 0, { kg: 14, reps: 12 });
  await logSet(page, 'gsq', 1, { kg: 14, reps: 12 });
  await saveSession(page);
  await expect(card(page, 'gsq').locator('.hint')).toContainText('Aumenta carico o variante');
});

test('P08 storico: modifica valore e data, poi elimina', async ({ page }) => {
  autoDialogs(page);
  await openApp(page);
  await logSet(page, 'gsq', 0, { kg: 14, reps: 10 });
  await saveSession(page);
  await openHistory(page);
  await page.getByRole('button', { name: 'Modifica' }).click();
  await page.locator('.editrow input').nth(1).fill('11');
  await page.locator('.editor input[type="date"]').fill('2026-01-15');
  await page.getByRole('button', { name: 'Salva modifiche' }).click();
  await expectToast(page, 'Seduta aggiornata');
  const item = page.locator('.hist details').first();
  await expect(item.locator('summary')).toContainText('15/01/2026');
  await item.locator('summary').click();
  await expect(item).toContainText('14 kg × 11');
  await item.getByRole('button', { name: 'Elimina' }).click();
  await expect(page.locator('.hist details')).toHaveCount(0);
});

test('P09 esporta backup con il nome giusto', async ({ page }) => {
  autoDialogs(page);
  await openApp(page);
  await logSet(page, 'gsq', 0, { kg: 14, reps: 10 });
  await saveSession(page);
  await goTab(page, 'Info');
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Esporta backup' }).click();
  expect((await dl).suggestedFilename()).toMatch(/^teachergym-backup-\d{4}-\d{2}-\d{2}\.json$/);
});

test('P10 interruttore Settimane 1-2 (in Info): 2 serie attivo, 3 disattivo; nella seduta solo la riga', async ({ page }) => {
  await openApp(page);
  await expect(card(page, 'gsq').locator('.setrow')).toHaveCount(2);
  await expect(page.getByTestId('phase1-line')).toHaveText('Settimane 1-2 attive: massimo 2 serie, RIR 3');
  await expect(page.locator('main input[type="checkbox"]')).toHaveCount(0);
  await setPhase1InInfo(page, false);
  await goTab(page, 'A');
  await expect(card(page, 'gsq').locator('.setrow')).toHaveCount(3);
  await expect(page.getByTestId('phase1-line')).toHaveCount(0);
});

test('P11 solo kg senza ripetizioni: non salvata e avviso', async ({ page }) => {
  const msgs = autoDialogs(page);
  await openApp(page);
  await logSet(page, 'gsq', 0, { kg: 14 });
  await saveSession(page);
  const warned =
    msgs.some((m) => /ripetizioni/i.test(m)) || (await page.locator('.toast').textContent().catch(() => ''))?.match(/ripetizioni/i);
  expect(warned, 'deve comparire un avviso sulle ripetizioni mancanti').toBeTruthy();
  await openHistory(page);
  await expect(page.locator('.hist')).not.toContainText('Goblet squat');
});

test('P13 da 2 a 3 serie: la terza è precompilata con la seconda', async ({ page }) => {
  autoDialogs(page);
  await openApp(page);
  await logSet(page, 'gsq', 0, { kg: 14, reps: 10 });
  await logSet(page, 'gsq', 1, { kg: 12, reps: 9 });
  await saveSession(page);
  await setPhase1InInfo(page, false);
  await goTab(page, 'A');
  const r2 = row(page, 'gsq', 2);
  await expect(r2).toHaveClass(/prefilled/);
  await expect(r2.locator('input[placeholder="kg"]')).toHaveValue('12');
  await expect(r2.locator('input[placeholder^="reps"]')).toHaveValue('9');
});

test('P14 lat pulldown (resistenza) al massimo con elastico 20 → elastico più pesante', async ({ page }) => {
  autoDialogs(page);
  await openApp(page, 'B');
  for (const i of [0, 1]) {
    await chip(page, 'lpd', i, '20');
    await logSet(page, 'lpd', i, { reps: 15 });
  }
  await saveSession(page);
  await expect(card(page, 'lpd').locator('.hint')).toContainText('↑');
  await expect(card(page, 'lpd').locator('.hint')).toContainText('più pesante');
});

test('P15 trazioni (assistenza) al massimo con elastico 30 → elastico più leggero', async ({ page }) => {
  autoDialogs(page);
  await openApp(page);
  for (const i of [0, 1]) {
    await chip(page, 'pull', i, '30');
    await logSet(page, 'pull', i, { reps: 6 });
  }
  await saveSession(page);
  await expect(card(page, 'pull').locator('.hint')).toContainText('più leggero');
});

test('P16 dead bug e side plank: nessun campo kg', async ({ page }) => {
  await openApp(page);
  await expect(card(page, 'db').locator('input[placeholder="kg"]')).toHaveCount(0);
  await expect(card(page, 'db').locator('input[placeholder^="reps"]')).toHaveCount(2);
  await goTab(page, 'B');
  await expect(card(page, 'sp').locator('input[placeholder="kg"]')).toHaveCount(0);
  await expect(card(page, 'sp').locator('input[placeholder^="sec"]')).toHaveCount(2);
});

test('P17 superset 2a/2b: su 2a indicazione "passa a 2b"; pulsante manuale su entrambi (tempo della coppia)', async ({ page }) => {
  await openApp(page);
  await expect(card(page, 'pu')).toContainText('Passa subito a 2b');
  await expect(card(page, 'pu').getByRole('button', { name: 'Avvia recupero 75s' })).toHaveCount(1);
  await expect(card(page, 'row').getByRole('button', { name: 'Avvia recupero 75s' })).toHaveCount(1);
});

test('P18 export → elimino tutto → import: torna tutto, compresa la precompilazione', async ({ page }) => {
  autoDialogs(page);
  await openApp(page);
  await logSet(page, 'gsq', 0, { kg: 14, reps: 10 });
  await chip(page, 'pull', 0, '20');
  await logSet(page, 'pull', 0, { reps: 5 });
  await saveSession(page);
  await goTab(page, 'Info');
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Esporta backup' }).click();
  // salvato FUORI dal progetto, in una cartella temporanea di sistema
  const file = path.join(os.tmpdir(), `tg-e2e-${Date.now()}.json`);
  await (await dl).saveAs(file);

  await openHistory(page);
  await page.locator('.hist details').first().getByRole('button', { name: 'Elimina' }).click();
  await expect(page.locator('.hist details')).toHaveCount(0);
  await goTab(page, 'A');
  await expect(card(page, 'gsq').locator('.last')).toHaveCount(0);

  await goTab(page, 'Info');
  await page.locator('input[type="file"]').setInputFiles(file);
  await expectToast(page, 'Backup importato: 1 sedute');
  await goTab(page, 'A');
  await expect(row(page, 'gsq', 0).locator('input[placeholder="kg"]')).toHaveValue('14');
  await expect(row(page, 'pull', 0).getByRole('button', { name: '20', exact: true })).toHaveClass(/on prefilled/);
});

test('P19 rematore e bulgarian split squat: "Parti dal lato sinistro"', async ({ page }) => {
  await openApp(page);
  await separateSidesOn(page, 'A'); // prima della Fase 4-bis i lati erano sempre separati
  await expect(card(page, 'row')).toContainText('Parti dal lato sinistro');
  await goTab(page, 'B');
  await expect(card(page, 'bss')).toContainText('Parti dal lato sinistro');
});

test('P20 backup del prototipo importato due volte: il secondo dice "nessuna seduta nuova" (trovato sul telefono)', async ({ page }) => {
  const msgs = autoDialogs(page);
  await openApp(page, 'Info');
  // dati INVENTATI
  const proto = {
    sessions: [
      { id: 1700000000000, day: 'A', date: '2026-01-10T08:00:00.000Z', note: 'nota finta', entries: { gsq: [{ l: '14', r: '10' }], pu: [{ l: 'boh', r: '8' }] } },
    ],
  };
  const file = { name: 'prototipo-finto.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(proto)) };
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect.poll(() => msgs.length).toBe(2);
  expect(msgs[1]).toBe('Importate dal prototipo: 1 seduta.\n1 valore non interpretato: li trovi nelle note delle sedute importate.');
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect.poll(() => msgs.length).toBe(4);
  expect(msgs[3]).toBe('Nessuna seduta nuova: 1 già presente, saltata.');
  await goTab(page, 'Storico');
  await expect(page.locator('.hist details')).toHaveCount(1);
});