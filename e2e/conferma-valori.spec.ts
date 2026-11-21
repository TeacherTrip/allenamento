import { expect, test, type Page } from '@playwright/test';
import { openApp, row } from './helpers';
import { readDb } from './migrazione-helpers';

// Punto 1 della correzione del 21/11: le ripetizioni scritte subito prima della ✓ non devono andare perse.
// Sul telefono la tastiera può consegnare l'ultimo valore nello stesso istante del tocco sul ✓
// (es. fine della composizione quando il campo perde il fuoco): qui valore e tocco arrivano nello stesso compito JS.

const draftSet = async (page: Page, ex: string, i: number) => {
  const drafts = (await readDb(page)).stores.drafts as { sets: Record<string, ({ load?: string; reps?: string; pending?: boolean } | null)[]> }[];
  return drafts[0]?.sets[ex]?.[i];
};

/** Scrive i valori e tocca ✓ nello STESSO compito JavaScript (nessun ridisegno in mezzo). */
async function typeAndCheckAtOnce(page: Page, ex: string, i: number, v: { kg?: string; reps: string }) {
  await row(page, ex, i).evaluate((el, v) => {
    const set = (input: HTMLInputElement | null, value: string) => {
      if (!input) return;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    if (v.kg != null) set(el.querySelector<HTMLInputElement>('input[placeholder="kg"]'), v.kg);
    set(el.querySelector<HTMLInputElement>('input[data-field="reps"]'), v.reps);
    el.querySelector<HTMLButtonElement>('button[aria-label="Conferma serie"]')!.click();
  }, v);
}

test('CV01 kg e ripetizioni scritti e ✓ subito: entrambi i valori salvati e la serie confermata', async ({ page }) => {
  await openApp(page, 'A', 'm2');
  await typeAndCheckAtOnce(page, 'gsq', 0, { kg: '8', reps: '11' });
  await expect(row(page, 'gsq', 0)).toHaveClass(/confirmed/);
  await expect(row(page, 'gsq', 0).locator('input[data-field="reps"]')).toHaveValue('11');
  await expect.poll(() => draftSet(page, 'gsq', 0)).toEqual({ load: '8', reps: '11' });
});

test('CV02 solo ripetizioni (kg precompilato in grigio) e ✓ subito: ripetizioni salvate col kg precompilato', async ({ page }) => {
  await openApp(page, 'A', 'm2');
  await typeAndCheckAtOnce(page, 'gsq', 0, { reps: '12' });
  await expect.poll(() => draftSet(page, 'gsq', 0)).toEqual({ load: '6', reps: '12' });
  await page.reload();
  await expect(row(page, 'gsq', 0)).toHaveClass(/confirmed/);
  await expect(row(page, 'gsq', 0).locator('input[data-field="reps"]')).toHaveValue('12');
});
