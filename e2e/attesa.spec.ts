import { expect, test, type Page } from '@playwright/test';
import { card, goTab, openApp } from './helpers';

/*
 * Correzione del 21/11/2026: niente più «Caricamento…» senza fine né pagina bianca.
 * Un'altra pagina dello stesso sito tiene una transazione che non finisce mai (come una copia dell'app
 * congelata da Android a metà di un'operazione): l'app deve dirlo dopo un po', senza smettere di aspettare.
 * Dati inventati.
 */

const SLOW_MS = 1500; // nell'app: 8 s

async function fastSlowMessage(page: Page) {
  await page.addInitScript((ms) => {
    (globalThis as unknown as { __TG_TEST_SLOW_MS__: number }).__TG_TEST_SLOW_MS__ = ms;
  }, SLOW_MS);
}

/** Apre una pagina dello stesso sito (un file statico, non l'app) che tiene occupate le tabelle per sempre. */
async function holdTables(page: Page, stores: string[]): Promise<Page> {
  const other = await page.context().newPage();
  await other.goto('./favicon.svg');
  await other.evaluate(
    (stores) =>
      new Promise<void>((ok) => {
        const req = indexedDB.open('teachergym');
        req.onsuccess = () => {
          const tx = req.result.transaction(stores, 'readwrite');
          const st = tx.objectStore(stores[0]);
          const again = () => { st.count().onsuccess = again; };
          again();
          ok();
        };
      }),
    stores,
  );
  return other;
}

const slow = (page: Page) => page.getByTestId('slow');

test('AT01 storico occupato: dopo l’attesa il messaggio con i tre pulsanti; «Continua ad aspettare» non interrompe; liberato, la pagina si apre da sola', async ({ page }) => {
  await fastSlowMessage(page);
  await openApp(page, 'A', 'm2');
  const other = await holdTables(page, ['sessions', 'setLogs']);
  await page.reload();
  await expect(page.locator('nav.tabbar')).toBeVisible();
  await expect(page.getByText('Caricamento…')).toBeVisible();
  await expect(slow(page)).toBeVisible({ timeout: SLOW_MS + 3000 });
  await expect(slow(page)).toContainText('aperta anche in un’altra scheda o finestra');
  for (const name of ['Continua ad aspettare', 'Scarica backup', 'Ricarica'])
    await expect(slow(page).getByRole('button', { name })).toBeVisible();
  await slow(page).getByRole('button', { name: 'Continua ad aspettare' }).click();
  await expect(slow(page)).toHaveCount(0);
  await expect(page.getByText('Caricamento…')).toBeVisible();
  await expect(slow(page)).toBeVisible({ timeout: SLOW_MS + 3000 }); // l'attesa continua e il messaggio torna
  await other.close(); // la copia «congelata» si chiude: il database si libera
  await expect(card(page, 'gsq')).toBeVisible({ timeout: 5000 });
  await expect(slow(page)).toHaveCount(0);
});

test('AT02 impostazioni occupate (niente barra): stesso messaggio; «Scarica backup» dice chiaramente che non riesce a leggere i dati', async ({ page }) => {
  await fastSlowMessage(page);
  await openApp(page, 'A', 'm2');
  await holdTables(page, ['settings']);
  await page.reload();
  await expect(slow(page)).toBeVisible({ timeout: SLOW_MS + 3000 });
  await expect(page.locator('nav.tabbar')).toHaveCount(0);
  await slow(page).getByRole('button', { name: 'Scarica backup' }).click();
  await expect(page.getByTestId('backup-status')).toContainText('Non riesco a leggere i dati', { timeout: 10000 });
});

test('AT03 bozza occupata: la scheda A mostra il messaggio, Storico e Info si aprono', async ({ page }) => {
  await fastSlowMessage(page);
  await openApp(page, 'A', 'm2');
  await holdTables(page, ['drafts']);
  await page.reload();
  await expect(slow(page)).toBeVisible({ timeout: SLOW_MS + 3000 });
  await goTab(page, 'Storico');
  await expect(page.getByText('Caricamento…')).toHaveCount(0);
  await expect(slow(page)).toHaveCount(0);
});

test('EB01 errore imprevisto: messaggio al posto della pagina bianca, «Scarica backup» scarica il file, «Ricarica» riapre', async ({ page }) => {
  await openApp(page, 'A', 'm2');
  // errore di disegno forzato finché la prova non lo spegne (sessionStorage resta tra i ricaricamenti)
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('tg.eb-off')) (globalThis as unknown as { __TG_TEST_RENDER_ERROR__: boolean }).__TG_TEST_RENDER_ERROR__ = true;
  });
  await page.reload();
  const box = page.getByTestId('app-error');
  await expect(box).toBeVisible();
  await expect(box).toContainText('Qualcosa non ha funzionato');
  await expect(box).toContainText('Errore apposta (prova automatica)');
  const download = page.waitForEvent('download');
  await box.getByRole('button', { name: 'Scarica backup' }).click();
  expect((await download).suggestedFilename()).toMatch(/^teachergym-backup-grezzo-\d{4}-\d{2}-\d{2}\.json$/);
  await expect(page.getByTestId('backup-status')).toContainText('Backup grezzo scaricato');
  await page.evaluate(() => sessionStorage.setItem('tg.eb-off', '1'));
  await box.getByRole('button', { name: 'Ricarica' }).click();
  await expect(card(page, 'gsq')).toBeVisible();
});
