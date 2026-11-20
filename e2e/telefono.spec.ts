import { expect, test } from '@playwright/test';
import {
  autoDialogs, card, checkSet, expectToast, fakes, goTab, installFakes, openApp, openHistory, row, saveSession,
  logSet, setVisibility, typeSet, via, separateSidesOn,
} from './helpers';

// Prove nate dalla diagnosi sul telefono (telefono Android, Chrome 157), 2026-11-19.

// ---------- A: fine recupero a schermo acceso ----------

test('A1 fine recupero: "Via!" grande al centro, per 4 s, poi si chiude', async ({ page }) => {
  await installFakes(page);
  await page.clock.install();
  await openApp(page);
  await card(page, 'db').getByRole('button', { name: 'Avvia recupero 45s' }).click();
  await page.clock.runFor(45_100);
  const v = via(page);
  await expect(v).toBeVisible();
  await expect(v.locator('.via-text')).toHaveText('Via!');
  await expect(v.locator('.via-label')).toHaveText('Dead bug');
  // al centro dello schermo
  const box = (await v.locator('.via-circle').boundingBox())!;
  const vp = page.viewportSize()!;
  expect(Math.abs(box.x + box.width / 2 - vp.width / 2)).toBeLessThan(4);
  expect(Math.abs(box.y + box.height / 2 - vp.height / 2)).toBeLessThan(4);
  await page.clock.runFor(3_300); // ~3,4 s dopo la comparsa
  await expect(v).toBeVisible();
  await page.clock.runFor(1_000);
  await expect(v).toHaveCount(0);
});

test('A2 un tocco chiude "Via!" subito', async ({ page }) => {
  await page.clock.install();
  await openApp(page);
  await card(page, 'db').getByRole('button', { name: 'Avvia recupero 45s' }).click();
  await page.clock.runFor(45_500);
  await via(page).click();
  await expect(via(page)).toHaveCount(0);
});

test('A3 vibrazione e audio che lanciano errori NON impediscono "Via!"', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await installFakes(page, 'none', true); // tutto "rotto": niente wakeLock, audio e vibrazione lanciano errori
  await page.clock.install();
  await openApp(page);
  await row(page, 'gsq', 0).locator('input[placeholder="kg"]').fill('14');
  await typeSet(page, 'gsq', 0, { reps: 10 });
  await checkSet(page, 'gsq', 0); // il tocco crea l'AudioContext
  await page.clock.runFor(91_000);
  await expect(via(page)).toContainText('Via!');
  const f = await fakes(page);
  expect(f.vib).toBe(1); // tentata (e fallita) senza conseguenze
  expect(errors).toEqual([]);
  await page.clock.runFor(4_500);
  await expect(via(page)).toHaveCount(0);
});

// ---------- B: blocco e sblocco durante il recupero ----------

test('B1 recupero scaduto a telefono bloccato: "Via!" resta finché non sblocchi, poi 4 s, senza suono', async ({ page }) => {
  await installFakes(page);
  await page.clock.install();
  await openApp(page);
  await card(page, 'db').getByRole('button', { name: 'Avvia recupero 45s' }).click();
  await setVisibility(page, 'hidden');
  // a telefono bloccato i timer continuano a girare (come visto sul telefono Android): il recupero scade e passa altro tempo
  await page.clock.runFor(45_000 + 4_000 + 60_000);
  await expect(via(page)).toBeVisible(); // NON si è chiuso mentre era bloccato
  await setVisibility(page, 'visible');
  await page.clock.runFor(3_500);
  await expect(via(page)).toBeVisible();
  await page.clock.runFor(700);
  await expect(via(page)).toHaveCount(0);
});

test('B2 dopo un ricaricamento della pagina (come fa il server di sviluppo allo sblocco): "Via!" ricompare', async ({ page }) => {
  await installFakes(page);
  await openApp(page);
  await card(page, 'db').getByRole('button', { name: 'Avvia recupero 45s' }).click();
  // recupero partito 2 minuti fa
  await page.evaluate(() => {
    const r = JSON.parse(sessionStorage.getItem('tg.rest')!);
    r.startedAt -= 120_000;
    sessionStorage.setItem('tg.rest', JSON.stringify(r));
  });
  await page.reload();
  await expect(via(page)).toContainText('Via!');
  const f = await fakes(page);
  expect(f.audio.osc).toBe(0); // in ritardo: niente suono
  expect(f.vib).toBe(0);
});

// ---------- C e punto 3: etichette Sx / Dx ----------

const SIDES = { B: ['bss', 'mp', 'sp'], A: ['row'], C: ['slrdl'] } as const;

test('C1 esercizi con lati separati: due tasti [Sx] [Dx] affiancati su OGNI serie', async ({ page }) => {
  await openApp(page);
  await separateSidesOn(page, 'A'); // prima della Fase 4-bis i lati erano sempre separati
  for (const [day, ids] of Object.entries(SIDES)) {
    await goTab(page, day);
    for (const id of ids) {
      const rows = card(page, id).locator('.setrow');
      await expect(rows.first()).toBeVisible();
      const n = await rows.count();
      expect(n).toBeGreaterThan(0);
      for (let i = 0; i < n; i++) {
        const btns = rows.nth(i).locator('.sides button');
        await expect(btns).toHaveText(['Sx', 'Dx']);
        // affiancati: stessa altezza, Dx a destra di Sx
        const [a, b] = [(await btns.nth(0).boundingBox())!, (await btns.nth(1).boundingBox())!];
        expect(Math.abs(a.y - b.y)).toBeLessThan(2);
        expect(b.x).toBeGreaterThan(a.x);
      }
    }
  }
});

test('C2 [Dx] è attivo solo dopo [Sx]', async ({ page }) => {
  await openApp(page, 'B');
  await separateSidesOn(page, 'B'); // prima della Fase 4-bis i lati erano sempre separati
  await typeSet(page, 'bss', 0, { kg: 10, reps: 10 });
  const r = row(page, 'bss', 0);
  await expect(r.getByRole('button', { name: 'Conferma lato destro' })).toBeDisabled();
  await r.getByRole('button', { name: 'Conferma lato sinistro' }).click();
  await expect(r.getByRole('button', { name: 'Conferma lato destro' })).toBeEnabled();
  await expect(r.locator('.sides button').first()).toHaveClass(/half/);
});

// ---------- Punto 4: dead bug e curl alternato con un solo ✓ ----------

test('P4 dead bug e curl alternato: un solo ✓, "reps per lato", recupero subito', async ({ page }) => {
  await openApp(page);
  await separateSidesOn(page, 'A'); // prima della Fase 4-bis i lati erano sempre separati
  for (const [day, id] of [['A', 'db'], ['C', 'cu']] as const) {
    await goTab(page, day);
    const c = card(page, id);
    await expect(c.locator('.sides')).toHaveCount(0);
    await expect(c.getByRole('button', { name: 'Conferma serie' }).first()).toHaveText('✓');
    await expect(c.locator('input[data-field="reps"]').first()).toHaveAttribute('aria-label', /ripetizioni per lato$/);
    await expect(c).toContainText('lati alternati');
  }
  // dead bug S1: un tocco → recupero (non è l'ultima serie della seduta)
  await goTab(page, 'A');
  await typeSet(page, 'db', 0, { reps: 8 });
  await row(page, 'db', 0).getByRole('button', { name: 'Conferma serie' }).click();
  await expect(page.locator('.restbar')).toContainText('Dead bug');
});

// ---------- Punto 5: "+ Serie" ----------

test('S1 "+ Serie": riga grigia con i valori dell’ultima serie, eliminabile se non confermata', async ({ page }) => {
  await openApp(page);
  await typeSet(page, 'gsq', 0, { kg: 14, reps: 10 });
  await typeSet(page, 'gsq', 1, { kg: 12, reps: 9 });
  await card(page, 'gsq').getByRole('button', { name: '+ Serie' }).click();
  const x = row(page, 'gsq', 2);
  await expect(x).toHaveClass(/extra/);
  await expect(x).toHaveClass(/prefilled/);
  await expect(x.locator('.setn')).toContainText('S3');
  await expect(x.locator('input[placeholder="kg"]')).toHaveValue('12');
  await expect(x.locator('input[data-field="reps"]')).toHaveValue('9');
  await x.getByRole('button', { name: 'Elimina S3' }).click();
  await expect(card(page, 'gsq').locator('.setrow')).toHaveCount(2);
});

test('S2 "+ Serie": salvata solo se confermata e segnata "extra" nello storico', async ({ page }) => {
  const msgs = autoDialogs(page);
  await openApp(page);
  await logSet(page, 'gsq', 0, { kg: 14, reps: 10 });
  await logSet(page, 'gsq', 1, { kg: 14, reps: 10 });
  await card(page, 'gsq').getByRole('button', { name: '+ Serie' }).click(); // S3 confermata
  await logSet(page, 'gsq', 2, { reps: 8 });
  await expect(row(page, 'gsq', 2).getByRole('button', { name: `Elimina S3` })).toHaveCount(0); // confermata: non eliminabile
  await card(page, 'gsq').getByRole('button', { name: '+ Serie' }).click(); // S4 non confermata
  await saveSession(page);
  expect(msgs.some((m) => /1 serie non confermate \(senza ✓\)/.test(m))).toBe(true);
  await openHistory(page);
  await expect(page.locator('.hist .it', { hasText: 'Goblet squat' })).toHaveText(
    'Goblet squat: 14 kg × 10 · 14 kg × 10 · 14 kg × 8 (extra)',
  );
});

test('S3 "+ Serie" NON conta per "↑ Aumenta carico"', async ({ page }) => {
  autoDialogs(page);
  await openApp(page);
  // previste al massimo (12, 12), extra a 6: il suggerimento deve comparire comunque
  await logSet(page, 'gsq', 0, { kg: 14, reps: 12 });
  await logSet(page, 'gsq', 1, { kg: 14, reps: 12 });
  await card(page, 'gsq').getByRole('button', { name: '+ Serie' }).click();
  await logSet(page, 'gsq', 2, { reps: 6 });
  await saveSession(page);
  await expect(card(page, 'gsq').locator('.hint')).toContainText('Aumenta carico o variante');
  // e la precompilazione resta sulle serie previste (niente terza riga)
  await expect(card(page, 'gsq').locator('.setrow')).toHaveCount(2);
});

test('S4 "+ Serie" e regola dell’ultima serie: il timer non parte solo sull’ultima riga, extra comprese', async ({ page }) => {
  await openApp(page);
  // Seduta A: l'ultimo esercizio è dead bug (S2 con Settimane 1-2). Aggiungo una S3 extra.
  await card(page, 'db').getByRole('button', { name: '+ Serie' }).click();
  await typeSet(page, 'db', 1, { reps: 8 });
  await checkSet(page, 'db', 1); // S2 non è più l'ultima → timer
  await expect(page.locator('.restbar')).toContainText('Dead bug');
  await page.locator('.restbar').getByRole('button', { name: 'Stop' }).click();
  await expect(row(page, 'db', 2).locator('input')).toHaveValue('8'); // precompilata dalla S2
  await checkSet(page, 'db', 2); // S3 extra è l'ultima → niente timer
  await expect(row(page, 'db', 2)).toHaveClass(/confirmed/);
  await expect(page.locator('.restbar')).toHaveCount(0);
});

// ---------- Punto 6: avviso se lo schermo può spegnersi ----------

test('W3 senza blocco schermo: avviso al primo "Inizia", poi mai più', async ({ page }) => {
  await installFakes(page, 'none');
  autoDialogs(page);
  await openApp(page);
  await page.getByRole('button', { name: '▶ Inizia allenamento' }).click();
  await expectToast(page, 'Lo schermo può spegnersi: allunga il tempo di spegnimento del telefono');
  await page.getByRole('button', { name: 'Annulla cronometro' }).click();
  await expect(page.getByRole('button', { name: '▶ Inizia allenamento' })).toBeVisible();
  await page.waitForTimeout(300); // la bozza è salvata nel database in modo asincrono
  await page.reload();
  await page.getByRole('button', { name: '▶ Inizia allenamento' }).click();
  await page.waitForTimeout(300);
  await expect(page.locator('.toast')).toHaveCount(0);
});

test('W4 con blocco schermo supportato: nessun avviso', async ({ page }) => {
  await installFakes(page, 'fake');
  await openApp(page);
  await page.getByRole('button', { name: '▶ Inizia allenamento' }).click();
  await page.waitForTimeout(300);
  await expect(page.locator('.toast')).toHaveCount(0);
});
