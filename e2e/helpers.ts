import { expect, type Page } from '@playwright/test';

/** Accetta automaticamente tutti i confirm/alert e ne registra il testo. */
export function autoDialogs(page: Page): string[] {
  const msgs: string[] = [];
  page.on('dialog', (d) => {
    msgs.push(d.message());
    void d.accept();
  });
  return msgs;
}

export async function openApp(page: Page, tab = 'A') {
  await page.goto('./');
  await goTab(page, tab);
}

export async function goTab(page: Page, label: string) {
  await page.locator('nav.tabbar button', { hasText: new RegExp(`^${label}$`) }).click();
}

export const card = (page: Page, id: string) => page.locator(`section[data-ex="${id}"]`);
export const row = (page: Page, id: string, i: number) => card(page, id).locator('.setrow').nth(i);

export async function typeSet(page: Page, id: string, i: number, v: { kg?: number; reps?: number; sec?: number }) {
  const r = row(page, id, i);
  if (v.kg != null) await r.locator('input[placeholder="kg"]').fill(String(v.kg));
  if (v.reps != null) await r.locator('input[placeholder^="reps"]').fill(String(v.reps));
  if (v.sec != null) await r.locator('input[placeholder^="sec"]').fill(String(v.sec));
}

export async function chip(page: Page, id: string, i: number, label: string) {
  await row(page, id, i).getByRole('button', { name: label, exact: true }).click();
}

export async function saveSession(page: Page) {
  await page.locator('button.save').click();
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.locator('.toast')).toContainText(text);
}

/** Apre i dettagli di tutte le sedute nello storico. */
export async function openHistory(page: Page) {
  await goTab(page, 'Storico');
  const items = page.locator('.hist details');
  const n = await items.count();
  for (let i = 0; i < n; i++) await items.nth(i).locator('summary').click();
}

/** Modifica direttamente la bozza nel database (per simulare il passare del tempo). */
export async function patchDraft(page: Page, day: string, patch: Record<string, unknown>) {
  await page.evaluate(
    ([day, patch]) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('teachergym');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const tx = req.result.transaction('drafts', 'readwrite');
          const store = tx.objectStore('drafts');
          const g = store.get(day as string);
          g.onsuccess = () => store.put({ ...g.result, ...(patch as object) });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    [day, patch] as const,
  );
}
