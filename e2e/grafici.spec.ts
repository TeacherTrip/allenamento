import { expect, test, type Page } from '@playwright/test';
import { goTab, openApp } from './helpers';

// Dati di prova inventati, scritti direttamente nel database.
const day = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(18, 0, 0, 0);
  return d.toISOString();
};

const SESSIONS = [
  { id: 'g1', date: day(20), day: 'A', phase1: false, notes: '', programVersion: 1 },
  { id: 'g2', date: day(13), day: 'A', phase1: false, notes: '', programVersion: 1 },
  { id: 'g3', date: day(6), day: 'A', phase1: false, notes: '', programVersion: 1 },
  { id: 'g4', date: day(0), day: 'B', phase1: false, notes: '', programVersion: 1 },
];
let k = 0;
const L = (sessionId: string, exerciseId: string, v: Record<string, number>) => ({
  id: `gl${k++}`,
  sessionId,
  exerciseId,
  setIndex: k,
  confirmed: true,
  ...v,
});
const LOGS = [
  L('g1', 'gsq', { load: 10, reps: 12 }),
  L('g1', 'gsq', { load: 10, reps: 10 }),
  L('g2', 'gsq', { load: 12, reps: 10 }),
  L('g3', 'gsq', { load: 12, reps: 12 }),
  L('g1', 'pull', { load: 30, reps: 5 }),
  L('g3', 'pull', { load: 20, reps: 4 }),
  L('g3', 'pull', { load: 20, reps: 4 }),
  L('g4', 'bss', { load: 8, reps: 10 }),
];

async function seed(page: Page) {
  await openApp(page, 'Info'); // crea il database
  await page.evaluate(
    ([sessions, logs]) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('teachergym');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const tx = req.result.transaction(['sessions', 'setLogs'], 'readwrite');
          for (const s of sessions) tx.objectStore('sessions').put(s);
          for (const l of logs) tx.objectStore('setLogs').put(l);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    [SESSIONS, LOGS] as const,
  );
  await page.reload();
  await goTab(page, 'Grafici');
}

test('G01 senza dati: messaggio, nessun errore', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openApp(page, 'Grafici');
  await expect(page.getByTestId('charts-empty')).toBeVisible();
  expect(errors).toEqual([]);
});

test('G02 per esercizio (kg): Partenza → Attuale con e1RM e carico, grafico disegnato', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await seed(page);
  const select = page.getByLabel('Esercizio');
  await expect(select).toHaveValue('gsq'); // primo esercizio con dati
  const sum = page.getByTestId('chart-summary');
  await expect(sum).toContainText('3 sedute');
  await expect(sum).toContainText('14 kg → 16,8 kg');
  await expect(sum).toContainText('+2,8 kg (+20%)');
  await expect(sum).toContainText('10 kg → 12 kg');
  await expect(page.locator('.chart canvas')).toHaveCount(1);
  // esercizi senza dati non selezionabili
  await expect(select.locator('option[value="rdl"]')).toBeDisabled();
  // tabella dei valori
  await page.locator('.datatable summary').first().click();
  await expect(page.locator('.datatable tbody tr')).toHaveCount(3);
  await page.screenshot({ path: test.info().outputPath('esercizio-kg.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('G03 elastico di aiuto: due grafici (elastico + ripetizioni), "più difficile" quando l\'aiuto scende', async ({ page }) => {
  await seed(page);
  await page.getByLabel('Esercizio').selectOption('pull');
  const sum = page.getByTestId('chart-summary');
  await expect(sum).toContainText('30 → 20');
  await expect(sum).toContainText('più difficile');
  await expect(sum).toContainText('5 → 8');
  await expect(page.locator('.chart canvas')).toHaveCount(2);
  // la scelta resta dopo il ricaricamento
  await page.reload();
  await goTab(page, 'Grafici');
  await expect(page.getByLabel('Esercizio')).toHaveValue('pull');
  await page.screenshot({ path: test.info().outputPath('esercizio-elastico.png'), fullPage: true });
});

test('G04 per gruppo muscolare: serie della settimana, indice e serie settimanali', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await seed(page);
  await page.getByRole('tab', { name: 'Per gruppo muscolare' }).click();
  await expect(page.locator('.chart canvas')).toHaveCount(3);
  // quadricipiti: gsq 100 → 120 (e1RM 14 → 16,8), bss 100 → media (120 + 100) / 2 = 110
  await expect(page.getByTestId('index-summary')).toContainText('100 → 110');
  // solo i gruppi allenati (passo 8): niente Petto né Polpacci in queste sedute
  await expect(page.getByRole('radio', { name: 'Petto' })).toHaveCount(0);
  await expect(page.getByRole('radio', { name: 'Polpacci' })).toHaveCount(0);
  await page.getByRole('radio', { name: 'Core' }).click(); // solo secondario: nessun indice
  await expect(page.getByTestId('index-empty')).toBeVisible();
  await page.getByRole('radio', { name: 'Schiena' }).click();
  await expect(page.getByTestId('index-summary')).toBeVisible();
  await page.getByRole('radio', { name: 'Quadricipiti' }).click();
  await page.screenshot({ path: test.info().outputPath('gruppi.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('G05 tema scuro: i grafici si disegnano senza errori', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await seed(page);
  await expect(page.locator('.chart canvas')).toHaveCount(1);
  await page.getByRole('tab', { name: 'Per gruppo muscolare' }).click();
  await expect(page.locator('.chart canvas')).toHaveCount(3);
  await page.screenshot({ path: test.info().outputPath('gruppi-scuro.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('G06 Info: nota sui dati legati all\'indirizzo dell\'app', async ({ page }) => {
  await openApp(page, 'Info');
  await expect(page.getByTestId('address-note')).toContainText('esporta il backup e importalo nella nuova');
});
