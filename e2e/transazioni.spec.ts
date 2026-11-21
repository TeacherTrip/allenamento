import { expect, test, type Page } from '@playwright/test';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { autoDialogs, expectToast, goTab, openApp } from './helpers';

/*
 * Correzione del 21/11/2026, punto 2: ogni operazione usa solo le tabelle che servono, e in sola lettura dove basta.
 * Un'altra pagina tiene aperta per sempre una LETTURA sulle schede (come una copia congelata a metà di una lettura):
 * un'operazione che non scrive sulle schede deve riuscire lo stesso.
 * Nota (provato in Chrome il 21/11): una SCRITTURA lasciata aperta su una tabella blocca le scritture su tutte le
 * altre, quindi contro quella servono la copia unica (una-copia.spec.ts) e il messaggio d'attesa (attesa.spec.ts).
 * Dati inventati.
 */

async function holdRead(page: Page, stores: string[]): Promise<Page> {
  const other = await page.context().newPage();
  await other.goto('./favicon.svg');
  await other.evaluate(
    (stores) =>
      new Promise<void>((ok) => {
        const req = indexedDB.open('teachergym');
        req.onsuccess = () => {
          const tx = req.result.transaction(stores, 'readonly');
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

/** Legge una sola tabella (le altre possono essere occupate). */
const readStore = (page: Page, store: string) =>
  page.evaluate(
    (store) =>
      new Promise<unknown[]>((res, rej) => {
        const req = indexedDB.open('teachergym');
        req.onsuccess = () => {
          const r = req.result.transaction(store, 'readonly').objectStore(store).getAll();
          r.onsuccess = () => (req.result.close(), res(r.result));
          r.onerror = () => rej(r.error);
        };
      }),
    store,
  );

test('TX01 «Separa i lati» con una lettura delle schede rimasta aperta: si salva lo stesso (le schede non servono)', async ({ page }) => {
  await openApp(page, 'A', 'm2');
  await goTab(page, 'Info');
  await holdRead(page, ['programs']);
  await page.getByRole('checkbox', { name: /Separa i lati/ }).check();
  await expect
    .poll(async () => (await readStore(page, 'settings') as { key: string; value: unknown }[]).find((r) => r.key === 'separateSides')?.value, { timeout: 5000 })
    .toBe(true);
});

test('TX02 importazione di un backup senza schede con una lettura delle schede rimasta aperta: riesce', async ({ page }) => {
  autoDialogs(page);
  await openApp(page, 'A', 'm2');
  await goTab(page, 'Info');
  const file = path.join(os.tmpdir(), `tg-e2e-${Date.now()}-tx02.json`);
  fs.writeFileSync(
    file,
    JSON.stringify({ app: 'TeacherGym', formatVersion: 1, exportedAt: '2026-01-01T10:00:00.000Z', programVersion: 1, sessions: [], setLogs: [] }),
  );
  await holdRead(page, ['programs']);
  await page.locator('input[type="file"]').setInputFiles(file);
  await expectToast(page, 'Backup importato: 0 sedute');
  fs.rmSync(file, { force: true });
});
