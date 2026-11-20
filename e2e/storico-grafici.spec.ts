import { expect, test, type Page } from '@playwright/test';
import { autoDialogs, goTab, openApp } from './helpers';
import { readDb } from './migrazione-helpers';
import type { Program } from '../src/program/types';

// Fase 4-bis passo 8: storico e grafici con due modelli. Dati di prova inventati, scritti nel database.

const day = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(18, 0, 0, 0);
  return d.toISOString();
};
/** "gg/mm/aaaa" come nello Storico. */
const dmy = (n: number) => new Date(day(n)).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
const NBSP = ' ';
/** Come nb(): «fino al» e «al» restano attaccati alla data. */
const nbLabel = (t: string) => t.replace('fino al ', `fino${NBSP}al `).replace(/(al) (?=\d)/g, `$1${NBSP}`);
const count = (n: number) => ` ·${NBSP}${n}${NBSP}${n === 1 ? 'seduta' : 'sedute'}`;

const programsOf = async (page: Page) =>
  ((await readDb(page)).stores.programs as Program[]).sort((a, b) => a.order - b.order);

let k = 0;
const S = (id: string, n: number, dayId: string, programName = 'A') => ({
  id,
  date: day(n),
  day: dayId,
  programName,
  phase1: false,
  notes: '',
  programVersion: 1,
});
const L = (sessionId: string, exerciseId: string, v: Record<string, number>) => ({
  id: `sg${k++}`,
  sessionId,
  exerciseId,
  setIndex: k,
  confirmed: true,
  ...v,
});

async function put(page: Page, sessions: unknown[], logs: unknown[]) {
  await page.evaluate(
    ([sessions, logs]) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('teachergym');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const tx = req.result.transaction(['sessions', 'setLogs'], 'readwrite');
          for (const s of sessions as object[]) tx.objectStore('sessions').put(s);
          for (const l of logs as object[]) tx.objectStore('setLogs').put(l);
          tx.oncomplete = () => {
            req.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [sessions, logs] as const,
  );
  await page.reload();
}

/** Info → Ricarica un modello → Modello 1 → Sostituisci. */
async function reloadModel1(page: Page) {
  await goTab(page, 'Info');
  await page.getByRole('button', { name: 'Ricarica un modello' }).click();
  await page.getByTestId('reload-models').getByTestId('model-m1').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sostituisci' }).click();
  await expect(page.locator('.toast')).toContainText('Modello 1');
}

test('ST01 Storico dopo due ricariche successive: «fino al», poi «dal … al …» quando nome e data coincidono', async ({ page }) => {
  autoDialogs(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openApp(page, 'Info');
  const a1 = (await programsOf(page))[0].id;
  await reloadModel1(page);
  await expect.poll(async () => (await programsOf(page))[0].id).not.toBe(a1);
  const a2 = (await programsOf(page))[0].id;
  await reloadModel1(page);
  await expect.poll(async () => (await programsOf(page))[0].id).not.toBe(a2);
  const a3 = (await programsOf(page))[0].id;
  expect(new Set([a1, a2, a3]).size).toBe(3); // ogni ricarica dà id nuovi

  await put(
    page,
    [S('h1', 10, a1), S('h3', 5, a2), S('h5', 1, a3)],
    [L('h1', 'gsq', { load: 10, reps: 10 }), L('h3', 'gsq', { load: 12, reps: 10 }), L('h5', 'gsq', { load: 12, reps: 12 })],
  );
  await goTab(page, 'Storico');
  const groups = page.getByTestId('hist-group');
  const heads = groups.locator('h3');
  await expect(heads).toHaveText([
    `Scheda A${count(1)}`,
    `${nbLabel(`Scheda A — fino al ${dmy(5)}`)}${count(1)}`,
    `${nbLabel(`Scheda A — fino al ${dmy(10)}`)}${count(1)}`,
  ]);

  // stessa ultima data per i due gruppi vecchi → «dal … al …»
  await put(page, [S('h2', 3, a1), S('h4', 3, a2)], [L('h2', 'gsq', { load: 11, reps: 10 }), L('h4', 'gsq', { load: 12, reps: 11 })]);
  await goTab(page, 'Storico');
  await expect(heads).toHaveText([
    `Scheda A${count(1)}`,
    `${nbLabel(`Scheda A — dal ${dmy(5)} al ${dmy(3)}`)}${count(2)}`,
    `${nbLabel(`Scheda A — dal ${dmy(10)} al ${dmy(3)}`)}${count(2)}`,
  ]);
  await expect(groups.nth(2).locator('details')).toHaveCount(2);
  await page.screenshot({ path: test.info().outputPath('storico-ricariche.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('ST02 Grafici col Modello 2: menu per scheda, «Altri esercizi con dati», 0 kg, gruppi solo se allenati', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openApp(page, 'Info', 'm2');
  const [pa] = await programsOf(page);
  await put(
    page,
    [S('m1', 9, pa.id), S('m2', 2, pa.id), S('m3', 1, 'vecchia', 'X')],
    [
      L('m1', 'gb', { load: 0, reps: 12 }),
      L('m2', 'gb', { load: 0, reps: 15 }),
      L('m2', 'cr', { reps: 15 }),
      L('m2', 'hfs', { seconds: 30 }),
      L('m3', 'bss', { load: 8, reps: 10 }), // non è nel Modello 2
    ],
  );
  await goTab(page, 'Grafici');
  const select = page.getByLabel('Esercizio');
  const groups = select.locator('optgroup');
  await expect(groups).toHaveCount(4); // A, B, C (la D ripete esercizi già presenti) + Altri
  await expect(groups.nth(3)).toHaveAttribute('label', 'Altri esercizi con dati');
  await expect(groups.nth(3).locator('option')).toHaveText(['Bulgarian split squat']);
  for (const id of ['gb', 'ss', 'bdog', 'hfs', 'cr', 'cls']) await expect(select.locator(`option[value="${id}"]`)).toHaveCount(1);
  await expect(select.locator('option[value="pull"]')).toHaveCount(0); // del Modello 1, senza dati
  await expect(select.locator('option[value="ss"]')).toBeDisabled(); // nessun dato

  // ponte glutei sempre a 0 kg: solo Ripetizioni totali, con la frase
  await select.selectOption('gb');
  await expect(page.getByTestId('zero-kg-all')).toBeVisible();
  await expect(page.locator('main .chart canvas')).toHaveCount(1);
  await expect(page.getByTestId('chart-summary')).toContainText('12 → 15');
  await expect(page.getByTestId('chart-summary')).not.toContainText('e1RM');

  await page.getByRole('tab', { name: 'Per gruppo muscolare' }).click();
  const chips = page.getByRole('radiogroup', { name: 'Gruppo muscolare' }).getByRole('radio');
  await expect(chips).toHaveText(['Quadricipiti', 'Femorali', 'Glutei', 'Polpacci']); // bss + gb + cr; hfs non conta
  await page.getByRole('radio', { name: 'Glutei' }).click();
  await expect(page.getByTestId('index-zero-kg')).toHaveText("Le sedute a 0 kg non entrano nell'indice.");
  await page.getByRole('radio', { name: 'Polpacci' }).click();
  await expect(page.getByTestId('index-summary')).toContainText('100 → 100');
  await expect(page.getByTestId('index-zero-kg')).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath('gruppi-modello2.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('ST03 sedute miste (0 kg e con carico): nota nella legenda', async ({ page }) => {
  await openApp(page, 'Info', 'm2');
  const [pa] = await programsOf(page);
  await put(page, [S('x1', 9, pa.id), S('x2', 2, pa.id)], [L('x1', 'gb', { load: 0, reps: 12 }), L('x2', 'gb', { load: 6, reps: 12 })]);
  await goTab(page, 'Grafici');
  await page.getByLabel('Esercizio').selectOption('gb');
  await expect(page.getByTestId('zero-kg-mixed')).toBeVisible();
  await expect(page.getByTestId('zero-kg-all')).toHaveCount(0);
  await expect(page.locator('main .chart canvas')).toHaveCount(2);
});

test('ST04 solo allungamenti: nessun gruppo muscolare, messaggio senza errori', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openApp(page, 'Info', 'm2');
  const [pa] = await programsOf(page);
  await put(page, [S('y1', 1, pa.id)], [L('y1', 'hfs', { seconds: 30 })]);
  await goTab(page, 'Grafici');
  await page.getByRole('tab', { name: 'Per gruppo muscolare' }).click();
  await expect(page.getByTestId('muscles-empty')).toBeVisible();
  expect(errors).toEqual([]);
});

test('ST05 serie della settimana per gruppo: con 2, 3 o 4 gruppi allenati ogni gruppo ha la sua etichetta', async ({ page }) => {
  await openApp(page, 'Info', 'm2');
  const [pa] = await programsOf(page);
  const cases: [string, string[], string[]][] = [
    ['e2', ['cr', 'lc'], ['Femorali', 'Polpacci']],
    ['e3', ['gb', 'cr'], ['Femorali', 'Glutei', 'Polpacci']],
    ['e4', ['gb', 'cr', 'ss'], ['Quadricipiti', 'Femorali', 'Glutei', 'Polpacci']],
  ];
  for (const [id, exercises, labels] of cases) {
    await put(
      page,
      [S(id, 0, pa.id)],
      exercises.map((e) => L(id, e, e === 'gb' || e === 'ss' ? { load: 6, reps: 10 } : { reps: 12 })),
    );
    await goTab(page, 'Grafici');
    await page.getByRole('tab', { name: 'Per gruppo muscolare' }).click();
    await expect(page.getByRole('radiogroup', { name: 'Gruppo muscolare' }).getByRole('radio')).toHaveText(labels);
    const bars = page.getByRole('img', { name: 'Serie di questa settimana per gruppo muscolare' });
    await expect(bars).toHaveAttribute('data-ticks', labels.join('|'));
  }
});
