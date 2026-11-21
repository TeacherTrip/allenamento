import { expect, test, type Page } from '@playwright/test';
import { card, goTab, openApp, row, typeSet } from './helpers';

/*
 * Regressione del bug segnalato il 21/11/2026 (versione 8, installazione nuova):
 * Modello → scheda A → Inizia → kg e ripetizioni sul primo esercizio → ✓ → Info →
 * spegne «Recupero automatico» → prova a riaccenderlo → torna su A: la pagina deve caricarsi
 * (non restare su «Caricamento…»). Dati inventati.
 */

const autoRestBox = (page: Page) => page.getByRole('checkbox', { name: /Recupero automatico/ });

async function sequenzaDelBug(page: Page, model: 'm1' | 'm2') {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));

  await openApp(page, 'A', model);
  await page.getByRole('button', { name: /Inizia allenamento/ }).click();
  await expect(page.getByRole('button', { name: /Termina allenamento/ })).toBeVisible();

  await typeSet(page, 'gsq', 0, { kg: 8, reps: 10 });
  await row(page, 'gsq', 0).getByRole('button', { name: 'Conferma serie' }).click();
  await expect(row(page, 'gsq', 0)).toHaveClass(/confirmed/);

  await goTab(page, 'Info');
  const box = autoRestBox(page);
  await expect(box).toBeChecked();
  await box.click();
  await expect(box).not.toBeChecked();
  await box.click();
  await expect(box, 'il recupero automatico si deve poter riaccendere').toBeChecked();

  await goTab(page, 'A');
  await expect(card(page, 'gsq'), 'la scheda A si deve caricare').toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Caricamento…')).toHaveCount(0);
  // le altre pagine si aprono
  for (const t of ['Storico', 'Grafici', 'Info']) {
    await goTab(page, t);
    await expect(page.getByText('Caricamento…')).toHaveCount(0, { timeout: 5000 });
  }
  // e dopo un ricaricamento (app chiusa e riaperta)
  await page.reload();
  await goTab(page, 'A');
  await expect(card(page, 'gsq')).toBeVisible({ timeout: 5000 });
  await expect(row(page, 'gsq', 0)).toHaveClass(/confirmed/);
  expect(errors, 'nessun errore in console').toEqual([]);
}

test('RG01 Modello 2: ✓ sul goblet squat, recupero automatico spento e riacceso, la scheda A si carica', async ({ page }) => {
  await sequenzaDelBug(page, 'm2');
});

test('RG02 Modello 1: stessa sequenza', async ({ page }) => {
  await sequenzaDelBug(page, 'm1');
});

test.describe('schermo stretto (360 × 640)', () => {
  test.use({ viewport: { width: 360, height: 640 } });
  test('RG03 Modello 2 a 360 px: stessa sequenza', async ({ page }) => {
    await sequenzaDelBug(page, 'm2');
  });
});

test('RG04 allenamento avviato, Info: «Separa i lati» bloccato col motivo accanto; «Recupero automatico» libero, lo dice, e si salva', async ({ page }) => {
  await openApp(page, 'A', 'm2');
  await page.getByRole('button', { name: /Inizia allenamento/ }).click();
  await goTab(page, 'Info');
  await expect(page.getByRole('checkbox', { name: /Separa i lati/ })).toBeDisabled();
  await expect(page.getByTestId('sides-blocked')).toContainText('C’è un allenamento avviato sulla scheda A');
  await expect(page.getByTestId('autorest-free')).toHaveText('Si può cambiare anche durante l’allenamento.');
  const box = autoRestBox(page);
  await box.click();
  await expect(box).not.toBeChecked();
  const saved = () =>
    page.evaluate(
      () =>
        new Promise<unknown>((res) => {
          const req = indexedDB.open('teachergym');
          req.onsuccess = () => {
            const r = req.result.transaction('settings', 'readonly').objectStore('settings').get('autoRest');
            r.onsuccess = () => (req.result.close(), res(r.result?.value));
          };
        }),
    );
  await expect.poll(saved).toBe(false);
  await box.click();
  await expect(box).toBeChecked();
  await expect.poll(saved).toBe(true);
});
