import { expect, test, type Locator, type Page } from '@playwright/test';
import { card, openApp, row, separateSidesOn } from './helpers';

// D1/D2 (prova sul telefono del 20/11): tasti ✓, [Sx] [Dx] ≥ 48 × 48 px; riga della serie su una sola riga,
// senza scorrimento orizzontale; segnaposto corti, mai tagliati. A 360 px (telefoni stretti) e 384 px (telefono di prova).

const box = async (l: Locator) => (await l.boundingBox())!;

/** La riga della serie: tutto su una riga, dentro lo schermo, niente scorrimento orizzontale della pagina. */
async function expectOneLine(page: Page, r: Locator) {
  const width = await page.evaluate(() => window.innerWidth);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const rb = await box(r);
  expect(rb.x + rb.width).toBeLessThanOrEqual(width);
  const inputs = await r.locator('input').all();
  const buttons = await r.locator('button.check').all();
  const tops = [...(await Promise.all(inputs.map(box))), ...(await Promise.all(buttons.map(box)))].map((b) => b.y + b.height / 2);
  // stessi centri in verticale (± 6 px): nessun elemento è andato a capo
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(6);
}

/** Il segnaposto sta tutto nel campo (larghezza del testo ≤ spazio interno). */
async function expectPlaceholderFits(input: Locator) {
  const { text, room } = await input.evaluate((el: HTMLInputElement) => {
    const cs = getComputedStyle(el);
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.font = `italic ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    return {
      text: ctx.measureText(el.placeholder).width,
      room: el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
    };
  });
  expect(text).toBeLessThanOrEqual(room);
}

for (const width of [360, 384]) {
  test.describe(`a ${width} px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test(`T01 ${width} px lati spenti: ✓ almeno 48 × 48, riga su una riga, segnaposto interi`, async ({ page }) => {
      await openApp(page); // Modello 1, scheda A
      for (const id of ['gsq', 'row']) {
        const r = row(page, id, 0);
        await r.scrollIntoViewIfNeeded();
        const b = await box(r.getByRole('button', { name: 'Conferma serie' }));
        expect(b.width).toBeGreaterThanOrEqual(48);
        expect(b.height).toBeGreaterThanOrEqual(48);
        await expectOneLine(page, r);
        for (const input of await r.locator('input').all()) await expectPlaceholderFits(input);
      }
      await expect(row(page, 'row', 0).locator('input[data-field="reps"]')).toHaveAttribute('placeholder', 'rip.');
    });

    test(`T02 ${width} px lati accesi: [Sx] [Dx] almeno 48 × 48, riga su una riga, «rip.» intero`, async ({ page }) => {
      await openApp(page);
      await separateSidesOn(page, 'A');
      const r = row(page, 'row', 0);
      await r.scrollIntoViewIfNeeded();
      const sides = r.locator('.side-btn');
      await expect(sides).toHaveCount(2);
      for (const b of [await box(sides.nth(0)), await box(sides.nth(1))]) {
        expect(b.width).toBeGreaterThanOrEqual(48);
        expect(b.height).toBeGreaterThanOrEqual(48);
      }
      await expectOneLine(page, r);
      for (const input of await r.locator('input').all()) await expectPlaceholderFits(input);
      // segnaposto corto, senza «/lato»; il nome completo resta per i lettori di schermo
      const reps = r.locator('input[data-field="reps"]');
      await expect(reps).toHaveAttribute('placeholder', 'rip.');
      await expect(reps).toHaveAttribute('aria-label', 'S1 ripetizioni per lato');
      await expect(card(page, 'row')).not.toContainText('/lato');
    });
  });
}
