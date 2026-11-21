import { expect, test, type Page } from '@playwright/test';
import { card, goTab, openApp, row, typeSet } from './helpers';
import { readDb } from './migrazione-helpers';

/*
 * Correzione del 21/11/2026: una sola copia dell'app lavora sui dati (Web Locks).
 * Sul telefono c'erano insieme la scheda di Chrome e l'app installata: una copia congelata in secondo piano
 * può tenere occupato il database. La seconda copia ora lo dice e spiega cosa fare. Dati inventati.
 */

const otherCopy = (p: Page) => p.getByTestId('other-copy');

/** Finge l'app installata aperta dall'icona (display-mode standalone). */
async function standalone(page: Page) {
  await page.addInitScript(() => {
    const orig = window.matchMedia.bind(window);
    window.matchMedia = (q: string) =>
      q.includes('display-mode: standalone') ? ({ ...orig(q), matches: true, media: q } as MediaQueryList) : orig(q);
  });
}

test('UC01 seconda copia aperta: avviso con i passaggi e «Riprova», nessuna scrittura; chiusa la prima, parte da sola', async ({ page, context }) => {
  await openApp(page, 'A', 'm2');
  await typeSet(page, 'gsq', 0, { kg: 8 });
  await expect.poll(async () => ((await readDb(page)).stores.drafts as unknown[]).length).toBe(1);
  const before = await readDb(page);

  const second = await context.newPage();
  await second.goto('./');
  await expect(otherCopy(second)).toBeVisible();
  await expect(otherCopy(second)).toContainText('TeacherGym è aperta anche in un’altra scheda o finestra');
  // in una scheda di Chrome: chiudere questa scheda (se l'app è installata) o l'altra scheda
  await expect(otherCopy(second)).toContainText('Se hai installato TeacherGym: chiudi questa scheda e usa l’app dall’icona.');
  await expect(otherCopy(second)).toContainText('tocca il quadratino delle schede → chiudi l’altra scheda di TeacherGym → poi tocca Riprova');
  await expect(otherCopy(second)).not.toContainText('Apri Chrome');
  await expect(otherCopy(second).getByRole('button', { name: 'Riprova' })).toBeVisible();
  await expect(second.locator('nav.tabbar')).toHaveCount(0);
  // nessuna scrittura dalla seconda copia
  await second.waitForTimeout(500);
  expect((await readDb(second)).stores).toEqual(before.stores);

  await page.close(); // chiusa la prima copia
  await expect(second.locator('nav.tabbar')).toBeVisible({ timeout: 5000 });
  await goTab(second, 'A');
  await expect(row(second, 'gsq', 0).locator('input[placeholder="kg"]')).toHaveValue('8');
});

test('UC02 «Riprova» con l’altra copia ancora aperta: l’avviso resta', async ({ page, context }) => {
  await openApp(page, 'A', 'm2');
  const second = await context.newPage();
  await second.goto('./');
  await otherCopy(second).getByRole('button', { name: 'Riprova' }).click();
  await expect(otherCopy(second)).toBeVisible();
  await expect(card(page, 'gsq')).toBeVisible(); // la prima continua a funzionare
});

test('UC03 app installata (aperta dall’icona) e poi aperta in una scheda di Chrome: consiglio «Usa l’app dall’icona»', async ({ page, context }) => {
  await standalone(page);
  await openApp(page, 'A', 'm2');
  await expect(page.getByTestId('use-icon')).toHaveCount(0); // dall'icona nessun consiglio
  await page.close();
  const tab = await context.newPage(); // scheda del browser (non standalone)
  await tab.goto('./');
  await expect(tab.getByTestId('use-icon')).toContainText('Usa l’app dall’icona');
  await expect(tab.locator('nav.tabbar')).toBeVisible();
});

test('UC04 mai aperta dall’icona: nessun consiglio nella scheda del browser', async ({ page }) => {
  await openApp(page, 'A', 'm2');
  await expect(page.getByTestId('use-icon')).toHaveCount(0);
});

test('UC05 app installata aperta mentre c’è una scheda di Chrome: i passaggi per chiudere la scheda di Chrome', async ({ page, context }) => {
  await openApp(page, 'A', 'm2'); // scheda di Chrome
  const app = await context.newPage();
  await standalone(app); // aperta dall'icona
  await app.goto('./');
  await expect(otherCopy(app)).toContainText('TeacherGym è aperta anche in un’altra scheda o finestra');
  await expect(otherCopy(app)).toContainText('Apri Chrome → tocca il quadratino delle schede → chiudi la scheda di TeacherGym → poi tocca Riprova.');
  await expect(otherCopy(app)).not.toContainText('usa l’app dall’icona');
  await page.close();
  await expect(app.locator('nav.tabbar')).toBeVisible({ timeout: 5000 });
});
