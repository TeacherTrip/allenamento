import { expect, test, type Page } from '@playwright/test';
import { autoDialogs, card, checkSet, expectToast, goTab, openApp, openHistory, patchDraft, row, saveSession, separateSidesOn, typeSet } from './helpers';
import { readDb } from './migrazione-helpers';
import { CATALOG_BY_ID } from '../src/catalog/exercises';
import { TEMPLATE_BY_ID } from '../src/catalog/templates';
import { startValues } from '../src/logic/prefill';
import { missingText } from '../src/logic/values';

// Verifica del 21/11/2026 (ramo fix-spunta) della regola «la ✓ conferma solo una serie completa».
// SP01-SP04: TUTTE le voci di Modello 1 e Modello 2, «Separa i lati» spento e acceso: ogni serie mostra
// solo i campi della sua metrica e si conferma compilando solo quelli. SP05-SP07: bozze con serie
// confermate ma incomplete (di prima della pubblicazione n. 9, o svuotate dopo la ✓). Dati inventati.

const FIELDS = {
  kg: { load: 1, reps: 1, seconds: 0, chips: 0 },
  band: { load: 0, reps: 1, seconds: 0, chips: 1 },
  level: { load: 0, reps: 1, seconds: 0, chips: 1 },
  bodyweight: { load: 0, reps: 1, seconds: 0, chips: 0 },
  time: { load: 0, reps: 0, seconds: 1, chips: 0 },
} as const;

async function checkWholeModel(page: Page, model: 'm1' | 'm2', sides: boolean) {
  await openApp(page, 'A', model);
  for (const p of TEMPLATE_BY_ID[model].programs) {
    if (sides) await separateSidesOn(page, p.name);
    else await goTab(page, p.name);
    for (const item of p.items) {
      const ex = CATALOG_BY_ID[item.exerciseId];
      const r = row(page, ex.id, 0);
      const f = FIELDS[ex.metric];
      const what = `${model} ${p.name} ${ex.id} (${ex.metric})`;
      // solo i campi della metrica
      await expect(r.locator('input[data-field="load"]'), what).toHaveCount(f.load);
      await expect(r.locator('input[data-field="reps"]'), what).toHaveCount(f.reps);
      await expect(r.locator('input[data-field="seconds"]'), what).toHaveCount(f.seconds);
      await expect(r.locator('.chips'), what).toHaveCount(f.chips);
      // ✓ (o primo lato) con la sola precompilazione: non conferma e dice cosa manca
      const twoSides = sides && !!ex.confirmSides;
      await expect(r.locator('.side-btn'), what).toHaveCount(twoSides ? 2 : 0);
      const first = r.getByRole('button', { name: twoSides ? 'Conferma lato sinistro' : 'Conferma serie' });
      const pre = startValues(ex.metric, item.startValue);
      if (pre) {
        await first.click();
        await expectToast(page, `${missingText(ex.metric, pre)}: la serie non è confermata`);
        await expect(r, what).toHaveClass(/prefilled/);
      } else {
        await expect(first, what).toBeDisabled(); // niente da confermare
      }
      // 0 kg (manubri facoltativi): lo 0 precompilato basta, non va riscritto
      if (ex.metric === 'kg' && item.startValue === 0) await expect(r.locator('input[data-field="load"]'), what).toHaveValue('0');
      // compilati SOLO i campi mostrati → la serie si conferma
      if (f.load && (await r.locator('input[data-field="load"]').inputValue()) === '') await typeSet(page, ex.id, 0, { kg: 8 });
      if (f.chips && (await r.locator('.chip.on').count()) === 0) await r.locator('.chip').first().click();
      await typeSet(page, ex.id, 0, f.seconds ? { sec: 30 } : { reps: 10 });
      await checkSet(page, ex.id, 0);
      await expect(r, what).toHaveClass(/confirmed/);
    }
  }
}

test('SP01 Modello 1, lati spenti: ogni voce chiede solo i suoi campi e si conferma', async ({ page }) => {
  test.setTimeout(120_000);
  await checkWholeModel(page, 'm1', false);
});

test('SP02 Modello 1, lati accesi: idem con [Sx] [Dx]', async ({ page }) => {
  test.setTimeout(120_000);
  await checkWholeModel(page, 'm1', true);
});

test('SP03 Modello 2, lati spenti (anche 0 kg: split squat statico e ponte glutei della D)', async ({ page }) => {
  test.setTimeout(120_000);
  await checkWholeModel(page, 'm2', false);
});

test('SP04 Modello 2, lati accesi', async ({ page }) => {
  test.setTimeout(120_000);
  await checkWholeModel(page, 'm2', true);
});

/** Bozza come quelle di prima della n. 9: serie confermate (senza `pending`) anche se incomplete. */
async function oldDraft(page: Page, sets: Record<string, object[]>) {
  await openApp(page, 'A', 'm2');
  await typeSet(page, 'cr', 0, { reps: 1 }); // crea la bozza della scheda A
  await expect.poll(async () => ((await readDb(page)).stores.drafts as unknown[]).length).toBe(1);
  await patchDraft(page, 'A', { sets });
  await page.reload();
  await expect(page.locator('nav.tabbar')).toBeVisible();
}

test('SP05 bozza di prima della n. 9 con serie confermate incomplete: grigie, avviso al salvataggio, salvate solo le complete', async ({ page }) => {
  const dialogs = autoDialogs(page);
  await oldDraft(page, {
    gsq: [{ load: '6' }], // mancano le ripetizioni
    pu: [{ reps: '8' }], // manca il livello
    row: [{ load: '6', reps: '10' }], // completa
    db: [{ reps: '7' }], // completa (corpo libero)
  });
  await expect(row(page, 'gsq', 0)).toHaveClass(/prefilled/);
  await expect(row(page, 'gsq', 0).locator('input[data-field="load"]')).toHaveValue('6');
  await expect(row(page, 'pu', 0)).toHaveClass(/prefilled/);
  await expect(row(page, 'row', 0)).toHaveClass(/confirmed/);
  await expect(row(page, 'db', 0)).toHaveClass(/confirmed/);
  // la ✓ sulla serie grigia dice cosa manca
  await row(page, 'pu', 0).getByRole('button', { name: 'Conferma serie' }).click();
  await expectToast(page, 'Manca il livello: la serie non è confermata');
  await saveSession(page);
  await expect.poll(() => dialogs.join('\n')).toContain('2 serie confermate ma incomplete (manca un valore) NON verranno salvate.');
  await openHistory(page);
  const hist = page.locator('.hist');
  await expect(hist).toContainText('Rematore a un braccio');
  await expect(hist).toContainText('Dead bug');
  await expect(hist).not.toContainText('Goblet squat');
  await expect(hist).not.toContainText('Push-up inclinati');
});

test('SP06 bozza di prima della n. 9 con sole serie incomplete: niente salvato, bozza intatta; completata, torna verde e si salva', async ({ page }) => {
  autoDialogs(page);
  await oldDraft(page, { gsq: [{ load: '6' }] });
  await saveSession(page);
  await expectToast(page, 'Serie incomplete (in grigio): completa i valori mancanti per salvarle.');
  const drafts = (await readDb(page)).stores.drafts as { sets: Record<string, unknown[]> }[];
  expect(drafts[0].sets.gsq[0]).toEqual({ load: '6' });
  // scritte le ripetizioni: la conferma data prima della n. 9 vale di nuovo
  await typeSet(page, 'gsq', 0, { reps: 10 });
  await expect(row(page, 'gsq', 0)).toHaveClass(/confirmed/);
  await saveSession(page);
  await openHistory(page);
  await expect(page.locator('.hist')).toContainText('Goblet squat');
});

test('SP07 serie confermata e poi svuotata: torna grigia, ricompilata torna verde senza un altro ✓; al salvataggio l\'avviso', async ({ page }) => {
  const dialogs = autoDialogs(page);
  await openApp(page, 'A', 'm2');
  const r = row(page, 'gsq', 0);
  await typeSet(page, 'gsq', 0, { reps: 10 });
  await checkSet(page, 'gsq', 0);
  await expect(r).toHaveClass(/confirmed/);
  await r.locator('input[data-field="reps"]').fill('');
  await expect(r).toHaveClass(/prefilled/);
  await r.locator('input[data-field="reps"]').fill('12');
  await expect(r).toHaveClass(/confirmed/);
  // di nuovo vuota + un'altra serie completa: al salvataggio l'avviso, salvata solo l'altra
  await r.locator('input[data-field="reps"]').fill('');
  await typeSet(page, 'db', 0, { reps: 7 });
  await checkSet(page, 'db', 0);
  await saveSession(page);
  await expect.poll(() => dialogs.join('\n')).toContain('1 serie confermata ma incompleta (manca un valore) NON verrà salvata.');
  await openHistory(page);
  await expect(page.locator('.hist')).toContainText('Dead bug');
  await expect(page.locator('.hist')).not.toContainText('Goblet squat');
  await expect(card(page, 'gsq')).toHaveCount(0); // siamo nello storico
});
