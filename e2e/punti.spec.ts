import { expect, test } from '@playwright/test';
import {
  autoDialogs, card, checkSet, expectToast, fakes, goTab, installFakes, openApp, openHistory, row, saveSession,
  logSet, setVisibility, typeSet, via, separateSidesOn,
} from './helpers';

// Prove dei punti 1-6 (revisione del 2026-11-19).

// ---------- 1. Pulsante manuale su tutti gli esercizi ----------

for (const autoRest of [true, false]) {
  test(`M01 pulsante "Avvia recupero" su TUTTI gli esercizi (recupero automatico ${autoRest ? 'attivo' : 'disattivato'})`, async ({ page }) => {
    await openApp(page, 'Info');
    if (!autoRest) await page.getByRole('checkbox', { name: /Recupero automatico/ }).uncheck();
    for (const day of ['A', 'B', 'C']) {
      await goTab(page, day);
      const cards = page.locator('section.ex');
      await expect(cards.first()).toBeVisible();
      const n = await cards.count();
      expect(n).toBeGreaterThan(5);
      for (let i = 0; i < n; i++) await expect(cards.nth(i).getByRole('button', { name: /^Avvia recupero \d+s$/ })).toHaveCount(1);
    }
  });
}

test('M02 pulsante manuale sul primo esercizio di un superset: usa il recupero della coppia', async ({ page }) => {
  await openApp(page);
  await card(page, 'pu').getByRole('button', { name: 'Avvia recupero 75s' }).click();
  await expect(page.locator('.restbar')).toContainText('Push-up inclinati');
  await expect(page.locator('.restbar .t')).toHaveText(/01:1[45]/);
});

// ---------- 2. Tempi calcolati dall'ora di partenza ----------

test('T01 recupero giusto dopo un salto di tempo (telefono bloccato): conta l’ora, non i tick', async ({ page }) => {
  await installFakes(page);
  await page.clock.install();
  await openApp(page);
  await card(page, 'gsq').getByRole('button', { name: 'Avvia recupero 90s' }).click();
  await page.clock.runFor(10_000);
  await expect(page.locator('.restbar .t')).toHaveText('01:20');
  // salto di 50 s in cui i timer NON girano (come a schermo bloccato)
  await page.clock.fastForward(50_000);
  await expect(page.locator('.restbar .t')).toHaveText('00:30');
});

test('T02 recupero già scaduto al rientro: "Via!" senza suono né vibrazione', async ({ page }) => {
  await installFakes(page);
  await page.clock.install();
  await openApp(page);
  await card(page, 'gsq').getByRole('button', { name: 'Avvia recupero 90s' }).click();
  await setVisibility(page, 'hidden');
  await page.clock.fastForward(5 * 60_000); // 5 minuti a schermo bloccato
  await setVisibility(page, 'visible');
  await expect(via(page)).toContainText('Via!');
  await page.clock.runFor(1_000);
  const f = await fakes(page);
  expect(f.vib).toBe(0);
  expect(f.audio.osc).toBe(0);
});

test('T03 fine recupero normale: 4 bip e vibrazione UNA sola volta', async ({ page }) => {
  await installFakes(page);
  await page.clock.install();
  await openApp(page);
  await card(page, 'db').getByRole('button', { name: 'Avvia recupero 45s' }).click();
  await page.clock.runFor(46_000);
  await expect(via(page)).toContainText('Via!');
  await page.clock.runFor(1_000);
  let f = await fakes(page);
  expect(f.vib).toBe(1);
  expect(f.audio.osc).toBe(4); // due coppie di bip
  await page.clock.runFor(5_000);
  f = await fakes(page);
  expect(f.vib).toBe(1);
  expect(f.audio.osc).toBe(4);
  await expect(via(page)).toHaveCount(0);
});

test('T04 cronometro della seduta giusto dopo un salto di tempo', async ({ page }) => {
  await installFakes(page);
  await page.clock.install();
  await openApp(page);
  await page.getByRole('button', { name: '▶ Inizia allenamento' }).click();
  await page.clock.fastForward(25 * 60_000);
  await setVisibility(page, 'visible');
  await expect(page.locator('header .stopwatch')).toContainText('25:0');
});

test('T05 il recupero sopravvive al ricaricamento della pagina', async ({ page }) => {
  await openApp(page);
  await card(page, 'gsq').getByRole('button', { name: 'Avvia recupero 90s' }).click();
  await page.reload();
  await expect(page.locator('.restbar')).toContainText('Goblet squat');
  await expect(page.locator('.restbar .t')).toHaveText(/01:(2\d|30)/);
});

// ---------- 3. Wake lock ----------

test('W01 wake lock: richiesto all’inizio e di nuovo al ritorno visibile; mai senza allenamento', async ({ page }) => {
  await installFakes(page, 'fake');
  await openApp(page);
  await page.waitForTimeout(300);
  expect((await fakes(page)).wl).toBe(0);
  await page.getByRole('button', { name: '▶ Inizia allenamento' }).click();
  await expect.poll(async () => (await fakes(page)).wl).toBe(1);
  await setVisibility(page, 'hidden'); // schermo bloccato: il browser rilascia il blocco
  await setVisibility(page, 'visible');
  await expect.poll(async () => (await fakes(page)).wl).toBe(2);
  await setVisibility(page, 'visible'); // già attivo: nessuna richiesta doppia
  await page.waitForTimeout(200);
  expect((await fakes(page)).wl).toBe(2);
  await goTab(page, 'Info');
  await expect(page.locator('.wakelock-info')).toHaveText(/supportato \(attivo/);
});

test('W02 wake lock non disponibile: nessun errore, riga in Info', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await installFakes(page, 'none');
  autoDialogs(page);
  await openApp(page);
  await page.getByRole('button', { name: '▶ Inizia allenamento' }).click();
  await setVisibility(page, 'visible');
  await logSet(page, 'gsq', 0, { kg: 14, reps: 10 });
  await saveSession(page);
  await expectToast(page, /Seduta salvata/);
  await goTab(page, 'Info');
  await expect(page.locator('.wakelock-info')).toHaveText('Schermo sempre acceso: non supportato.');
  expect(errors).toEqual([]);
});

// ---------- 4. Audio sbloccato dal tocco ----------

test('A01 AudioContext creato/ripreso al tocco su "Inizia allenamento"', async ({ page }) => {
  await installFakes(page);
  await openApp(page);
  expect((await fakes(page)).audio.created).toBe(0);
  await page.getByRole('button', { name: '▶ Inizia allenamento' }).click();
  const f = await fakes(page);
  expect(f.audio.created).toBe(1);
  expect(f.audio.resumed).toBeGreaterThanOrEqual(1);
});

test('A02 AudioContext creato/ripreso al tocco su ✓', async ({ page }) => {
  await installFakes(page);
  await openApp(page);
  await typeSet(page, 'gsq', 0, { kg: 14, reps: 10 });
  expect((await fakes(page)).audio.created).toBe(0); // scrivere non basta
  await checkSet(page, 'gsq', 0);
  const f = await fakes(page);
  expect(f.audio.created).toBe(1);
  expect(f.audio.resumed).toBeGreaterThanOrEqual(1);
});

// ---------- 5. Esercizi per lato ----------

test('U01 per lato: Sx (nessun timer) → Dx (timer); a metà la serie non è confermata', async ({ page }) => {
  await openApp(page, 'B');
  await separateSidesOn(page, 'B'); // prima della Fase 4-bis i lati erano sempre separati
  const r = row(page, 'bss', 0);
  await typeSet(page, 'bss', 0, { kg: 10, reps: 10 });
  await r.getByRole('button', { name: 'Conferma lato sinistro' }).click();
  await expectToast(page, '→ Lato destro, senza pausa');
  await expect(r).toHaveClass(/left-done/);
  await expect(r).not.toHaveClass(/confirmed/);
  await expect(page.locator('.restbar')).toHaveCount(0);
  await r.getByRole('button', { name: 'Conferma lato destro' }).click();
  await expect(r).toHaveClass(/confirmed/);
  await expect(page.locator('.restbar')).toContainText('Bulgarian split squat');
});

test('U02 per lato: se salvo con solo il lato sinistro fatto, la serie NON viene salvata', async ({ page }) => {
  const msgs = autoDialogs(page);
  await openApp(page, 'C');
  await separateSidesOn(page, 'C'); // prima della Fase 4-bis i lati erano sempre separati
  await logSet(page, 'slrdl', 0, { kg: 10, reps: 8 }); // S1 completa
  await typeSet(page, 'slrdl', 1, { kg: 10, reps: 8 });
  await row(page, 'slrdl', 1).getByRole('button', { name: 'Conferma lato sinistro' }).click();
  await saveSession(page);
  expect(msgs.some((m) => /1 serie non confermate \(senza ✓\)/.test(m))).toBe(true);
  await openHistory(page);
  await expect(page.locator('.hist details').first().locator('.it', { hasText: 'Stacco rumeno' })).toHaveText(
    'Stacco rumeno a una gamba: 10 kg × 8 per lato',
  );
});

// ---------- 6. Side plank in secondi ----------

test('SP01 side plank: registra i secondi per lato, non le ripetizioni', async ({ page }) => {
  autoDialogs(page);
  await openApp(page, 'B');
  await expect(card(page, 'sp').locator('input[data-field="reps"]')).toHaveCount(0);
  await logSet(page, 'sp', 0, { sec: 35 });
  await saveSession(page);
  await openHistory(page);
  await expect(page.locator('.hist details').first()).toContainText('Side plank: 35 s per lato');
});
