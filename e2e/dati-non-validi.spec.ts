import { expect, test, type Page } from '@playwright/test';
import { autoDialogs, card, goTab, logSet, openApp, row, saveSession } from './helpers';
import { readDb } from './migrazione-helpers';

/*
 * Correzione del 21/11/2026, punto f: all'avvio l'app trova dati non validi (scritti da un guasto o a mano).
 * Bozza non valida → scartata; impostazione non valida → valore predefinito; sedute mai toccate.
 * Copia di ciò che è stato scartato solo in memoria, scaricabile con un tocco. Dati inventati.
 */

/** Scrive dati non validi con IndexedDB da una pagina che non è l'app (file statico). */
async function writeBroken(page: Page) {
  const other = await page.context().newPage();
  await other.goto('./favicon.svg');
  await other.evaluate(
    () =>
      new Promise<void>((ok, ko) => {
        const req = indexedDB.open('teachergym');
        req.onsuccess = () => {
          const tx = req.result.transaction(['programs', 'drafts', 'settings'], 'readwrite');
          const progs = tx.objectStore('programs').getAll();
          progs.onsuccess = () => {
            const a = (progs.result as { id: string; name: string }[]).find((p) => p.name === 'A')!;
            tx.objectStore('drafts').put({ day: a.id, updatedAt: 'x', sets: 'rotto', notes: '' });
            tx.objectStore('settings').put({ key: 'autoRest', value: 'sì' });
            tx.objectStore('settings').put({ key: 'startSide', value: 'su' });
          };
          tx.oncomplete = () => (req.result.close(), ok());
          tx.onerror = () => ko(tx.error);
        };
      }),
  );
  await other.close();
}

test('DV01 bozza e impostazioni non valide: l’app si apre, avviso con «Scarica la copia», bozza scartata, sedute intatte', async ({ page }) => {
  autoDialogs(page);
  await openApp(page, 'A', 'm2');
  await logSet(page, 'gsq', 0, { kg: 8, reps: 10 });
  await saveSession(page);
  await expect.poll(async () => ((await readDb(page)).stores.sessions as unknown[]).length).toBe(1);
  const before = await readDb(page);

  await writeBroken(page);
  await page.reload();
  await expect(page.locator('nav.tabbar')).toBeVisible();
  const notice = page.getByTestId('data-repaired');
  await expect(notice).toContainText('Alcuni dati salvati non erano validi');
  await expect(notice).toContainText('seduta in corso della scheda A');
  await expect(notice).toContainText('Le sedute salvate non sono state toccate');
  const download = page.waitForEvent('download');
  await notice.getByRole('button', { name: 'Scarica la copia' }).click();
  expect((await download).suggestedFilename()).toMatch(/^teachergym-backup-dati-scartati-\d{4}-\d{2}-\d{2}\.json$/);

  // la scheda A si apre vuota; Info mostra i valori predefiniti
  await goTab(page, 'A');
  await expect(card(page, 'gsq')).toBeVisible();
  await expect(row(page, 'gsq', 0)).toHaveClass(/prefilled/);
  await goTab(page, 'Info');
  await expect(page.getByRole('checkbox', { name: /Recupero automatico/ })).toBeChecked();
  // bozza non valida tolta dal database; sedute e serie identiche a prima
  const after = await readDb(page);
  expect(after.stores.drafts).toEqual([]);
  expect(after.stores.sessions).toEqual(before.stores.sessions);
  expect(after.stores.setLogs).toEqual(before.stores.setLogs);
  await notice.getByRole('button', { name: 'Chiudi' }).click();
  await expect(notice).toHaveCount(0);
});

test('DV02 dati tutti validi: nessun avviso', async ({ page }) => {
  await openApp(page, 'A', 'm2');
  await page.reload();
  await expect(page.locator('nav.tabbar')).toBeVisible();
  await expect(page.getByTestId('data-repaired')).toHaveCount(0);
});
