import { expect, test, type Page } from '@playwright/test';
import { autoDialogs, card, goTab, logSet, openApp, saveSession } from './helpers';
import { readDb, seedV1 } from './migrazione-helpers';
import type { SettingRow } from '../src/db/migrate';
import type { Program } from '../src/program/types';
import type { Session } from '../src/db/models';

// Fase 4-bis passo 5: primo avvio, Info (nome, lato, Settimane 1-2), «Ricarica un modello». Dati inventati.

const programsOf = async (page: Page) =>
  ((await readDb(page)).stores.programs as Program[]).sort((a, b) => a.order - b.order);
const settingsOf = async (page: Page) =>
  Object.fromEntries(((await readDb(page)).stores.settings as SettingRow[]).map((r) => [r.key, r.value]));

/** Scrive impostazioni direttamente nel database (le schermate le rileggono dopo il ricaricamento). */
async function putSettings(page: Page, rows: SettingRow[]) {
  await page.evaluate(
    (rows) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('teachergym');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('settings', 'readwrite');
          for (const r of rows) tx.objectStore('settings').put(r);
          tx.oncomplete = () => (db.close(), resolve());
          tx.onerror = () => reject(tx.error);
        };
      }),
    rows,
  );
  await page.reload();
}

/** Errori in console e della pagina (devono restare zero). */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(`${m.text()} [${m.location().url}]`));
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
  return errors;
}

/** Riga delle impostazioni (scritta così anche per non somigliare a una "chiave segreta" per gitleaks). */
const setting = (name: SettingRow['key'], value: unknown): SettingRow => ({ key: name, value });

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

/** Database v1 inventato: 2 sedute sulla scheda A di prima. */
function v1WithSessions() {
  const sessions = [
    { id: 's1', date: '2026-10-05T09:00:00.000Z', day: 'A', phase1: true, notes: '', programVersion: 1 },
    { id: 's2', date: '2026-10-09T09:00:00.000Z', day: 'A', phase1: true, notes: '', programVersion: 1 },
  ] as Session[];
  const setLogs = sessions.map((s, i) => ({
    id: `l${i}`, sessionId: s.id, exerciseId: 'gsq', setIndex: 0, load: 12 + i, reps: 10, confirmed: true,
  }));
  return { sessions, setLogs, drafts: [], settings: [setting('phase1', true)] as SettingRow[] };
}

test('F01 profilo pulito: una sola schermata, immagini dei modelli caricate, nessuna scheda prima di «Inizia», Modello 2', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('./');
  const fr = page.getByTestId('firstrun');
  await expect(fr).toBeVisible();
  await expect(page.locator('nav.tabbar')).toHaveCount(0);
  // niente nome né lato: solo i modelli, la riga sulle Settimane 1-2 e «Inizia» (disattivato finché non si sceglie)
  await expect(fr.locator('input')).toHaveCount(0);
  await expect(fr.getByRole('button', { name: /Sinistro|Destro|Avanti|Indietro/ })).toHaveCount(0);
  await expect(fr.locator('[data-testid^="model-"]')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Inizia', exact: true })).toBeDisabled();
  await expect(page.getByTestId('firstrun-phase1')).toHaveText(
    'Le prime 2 settimane: 2 serie per esercizio e più margine (RIR 3, cioè 3 ripetizioni di riserva). Si cambia in Info.',
  );

  // le due immagini sono visibili e caricate davvero
  for (const id of ['m1', 'm2']) {
    const img = page.getByTestId(`model-${id}`).locator('img');
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(800);
  }
  await expect(page.getByTestId('model-m1')).toContainText('Modello 1');
  await expect(page.getByTestId('model-m1')).toContainText('Scheda A — Full body · 6 esercizi');
  await expect(page.getByTestId('model-m2')).toContainText('Modello 2');
  await expect(page.getByTestId('model-m2')).toContainText('Scheda D — leggera (~25 min) · 6 esercizi');

  await page.getByTestId('model-m2').click();
  await expect(page.getByTestId('model-m2')).toHaveAttribute('aria-pressed', 'true');
  // fin qui niente di salvato
  expect(await programsOf(page)).toEqual([]);
  expect((await settingsOf(page)).onboarded).toBeUndefined();

  await page.getByRole('button', { name: 'Inizia', exact: true }).click();
  await expect(page.locator('nav.tabbar')).toBeVisible();
  await expect(page.locator('nav.tabbar button')).toHaveText(['A', 'B', 'C', 'D', 'Storico', 'Grafici', 'Info']);
  const programs = await programsOf(page);
  expect(programs.map((p) => p.name)).toEqual(['A', 'B', 'C', 'D']);
  for (const p of programs) expect(['A', 'B', 'C', 'D']).not.toContain(p.id);
  const s = await settingsOf(page);
  expect([s.onboarded, s.templateId]).toEqual([true, 'm2']);
  expect(s.phase1Since).toBeUndefined(); // nessuna seduta ancora
  expect(s.separateSides).toBeUndefined(); // vale il predefinito: spento

  // la seduta A del Modello 2 si apre: primo esercizio goblet squat con 6 kg di partenza
  await goTab(page, 'A');
  await expect(card(page, 'gsq').locator('input[placeholder="kg"]').first()).toHaveValue('6');
  await page.reload();
  await expect(page.getByTestId('firstrun')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('F02 primo avvio interrotto: alla riapertura riparte da capo, senza dati parziali', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('model-m1').click();
  await page.reload(); // app chiusa prima di «Inizia»
  await expect(page.getByTestId('firstrun')).toBeVisible();
  await expect(page.getByTestId('model-m1')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Inizia', exact: true })).toBeDisabled();
  const db = await readDb(page);
  expect(db.stores.programs).toEqual([]);
  expect(db.stores.settings).toEqual([]);
});

test('F03 database v1 vuoto (zero sedute) migrato: nessun primo avvio, Modello 1 presente, nessuna data di Settimane 1-2', async ({ page }) => {
  await seedV1(page, { sessions: [], setLogs: [], drafts: [], settings: [] });
  await page.goto('./');
  await expect(page.locator('nav.tabbar button')).toHaveText(['A', 'B', 'C', 'Storico', 'Grafici', 'Info']);
  await expect(page.getByTestId('firstrun')).toHaveCount(0);
  expect((await programsOf(page)).map((p) => p.id)).toEqual(['A', 'B', 'C']);
  const s = await settingsOf(page);
  expect([s.onboarded, s.templateId, s.phase1Since]).toEqual([true, 'm1', null]);
});

test('F04 Settimane 1-2: la data parte dalla prima seduta salvata (non dal primo avvio)', async ({ page }) => {
  autoDialogs(page);
  await openApp(page);
  await goTab(page, 'Info');
  await expect(page.getByTestId('phase1-since')).toHaveText('La data parte dalla prima seduta salvata');
  await goTab(page, 'A');
  await logSet(page, 'gsq', 0, { kg: 14, reps: 10 });
  await saveSession(page);
  const s = await settingsOf(page);
  const sessions = (await readDb(page)).stores.sessions as Session[];
  expect(s.phase1Since).toBe(sessions[0].date);
  const ddmm = new Date(sessions[0].date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
  await expect(page.getByTestId('phase1-line')).toHaveText(`Settimane 1-2 attive dal ${ddmm}: massimo 2 serie, RIR 3`);
});

test('F05 avviso «Disattivarle?» dopo 14 giorni: «Sì» le spegne (3 serie); mai con data vuota', async ({ page }) => {
  await openApp(page);
  await expect(page.getByTestId('phase1-ask')).toHaveCount(0); // data vuota
  await putSettings(page, [setting('phase1Since', daysAgo(13))]);
  await expect(card(page, 'gsq').locator('.setrow')).toHaveCount(2);
  await expect(page.getByTestId('phase1-ask')).toHaveCount(0);
  await putSettings(page, [setting('phase1Since', daysAgo(15))]);
  const ask = page.getByTestId('phase1-ask');
  await expect(ask).toHaveText(/Settimane 1-2 attive da 2 settimane\. Disattivarle\?/);
  await ask.getByRole('button', { name: 'Sì' }).click();
  await expect(ask).toHaveCount(0);
  await expect(card(page, 'gsq').locator('.setrow')).toHaveCount(3);
  expect((await settingsOf(page)).phase1).toBe(false);
  await goTab(page, 'Info');
  await expect(page.getByRole('checkbox', { name: /Settimane 1-2/ })).not.toBeChecked();
});

test('F06 «Non ancora»: l’avviso sparisce e non torna alla riapertura', async ({ page }) => {
  await openApp(page);
  await putSettings(page, [setting('phase1Since', daysAgo(15))]);
  await page.getByTestId('phase1-ask').getByRole('button', { name: 'Non ancora' }).click();
  await expect(page.getByTestId('phase1-ask')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('phase1-line')).toBeVisible();
  await expect(page.getByTestId('phase1-ask')).toHaveCount(0);
  const s = await settingsOf(page);
  expect(s.phase1 ?? true).toBe(true); // mai spenta da sola (non scritta = predefinito, attive)
  expect(Date.parse(s.phase1SnoozedUntil as string) - Date.now()).toBeGreaterThan(6.9 * 24 * 60 * 60 * 1000);
});

test('F07 Info: niente nome; riattivare Settimane 1-2 azzera data e rinvio', async ({ page }) => {
  await openApp(page);
  await putSettings(page, [
    setting('phase1', false),
    setting('phase1Since', daysAgo(30)),
    setting('phase1SnoozedUntil', daysAgo(-3)),
  ]);
  await goTab(page, 'Info');
  await expect(page.getByLabel('Nome')).toHaveCount(0);
  await page.getByRole('checkbox', { name: /Settimane 1-2/ }).check();
  await expect(page.getByTestId('phase1-since')).toHaveText('La data parte dalla prima seduta salvata');
  await expect.poll(async () => {
    const s = await settingsOf(page);
    return [s.phase1, s.phase1Since, s.phase1SnoozedUntil];
  }).toEqual([true, null, null]);
});

test('F08 Ricarica un modello: tre pulsanti; Annulla non cambia niente; Sostituisci → Modello 2, storico separato, nessun errore', async ({ page }) => {
  autoDialogs(page);
  await seedV1(page, v1WithSessions());
  const errors = collectErrors(page); // dopo la preparazione (la pagina favicon.svg chiede /favicon.ico: non è l'app)
  await page.goto('./');
  await goTab(page, 'Info');
  await page.getByRole('button', { name: 'Ricarica un modello' }).click();
  await page.getByTestId('reload-models').getByTestId('model-m2').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Le schede attuali verranno sostituite. Lo storico resta.');
  await expect(dialog.getByRole('button')).toHaveText(['Scarica backup', 'Sostituisci', 'Annulla']);

  // Scarica backup: parte il download (salvato in una cartella temporanea di Playwright, mai nel progetto)
  const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Scarica backup' }).click()]);
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  await expect(dialog).toBeVisible(); // la finestra resta aperta

  await dialog.getByRole('button', { name: 'Annulla' }).click();
  await expect(dialog).toHaveCount(0);
  expect((await programsOf(page)).map((p) => p.id)).toEqual(['A', 'B', 'C']);

  await page.getByTestId('reload-models').getByTestId('model-m2').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sostituisci' }).click();
  await expect(page.locator('.toast')).toContainText('Schede del Modello 2 caricate');
  await expect(page.locator('nav.tabbar button')).toHaveText(['A', 'B', 'C', 'D', 'Storico', 'Grafici', 'Info']);
  const programs = await programsOf(page);
  for (const p of programs) expect(['A', 'B', 'C', 'D']).not.toContain(p.id);
  expect((await settingsOf(page)).templateId).toBe('m2');

  // nuova seduta sulla NUOVA scheda «A»
  await goTab(page, 'A');
  await logSet(page, 'gsq', 0, { kg: 6, reps: 10 });
  await saveSession(page);
  const sessions = (await readDb(page)).stores.sessions as Session[];
  const newA = programs[0].id;
  expect(sessions.filter((s) => s.day === 'A').map((s) => s.id).sort()).toEqual(['s1', 's2']); // le vecchie restano sotto 'A'
  expect(sessions.filter((s) => s.day === newA)).toHaveLength(1); // la nuova ha l'id della scheda nuova
  expect(sessions.every((s) => s.programName === 'A')).toBe(true);

  // storico e grafici si aprono anche con sedute la cui scheda non esiste più
  await goTab(page, 'Storico');
  await expect(page.locator('.hist details')).toHaveCount(3);
  await goTab(page, 'Grafici');
  await expect(page.locator('main h2')).toContainText('Grafici');
  await expect(page.locator('main canvas').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Per gruppo muscolare' }).click();
  await expect(page.locator('main canvas').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Per esercizio' }).click();
  await expect(page.locator('main canvas').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('F09 Ricarica bloccata con un allenamento avviato: il messaggio dice quale scheda', async ({ page }) => {
  await openApp(page, 'B');
  await page.getByRole('button', { name: /Inizia allenamento/ }).click();
  await goTab(page, 'Info');
  await page.getByRole('button', { name: 'Ricarica un modello' }).click();
  await expect(page.getByTestId('reload-blocked')).toHaveText(
    'C’è un allenamento avviato sulla scheda B: concludilo o annullalo prima di ricaricare un modello.',
  );
  await expect(page.getByTestId('reload-models')).toHaveCount(0);
});

test('F10 Ricarica fallita a metà transazione: schede vecchie intatte, impostazioni invariate', async ({ page }) => {
  const msgs = autoDialogs(page);
  await openApp(page);
  const before = await programsOf(page);
  await goTab(page, 'Info');
  await page.getByRole('button', { name: 'Ricarica un modello' }).click();
  await page.getByTestId('reload-models').getByTestId('model-m2').click();
  await page.evaluate(() => {
    globalThis.__TG_TEST_FAIL_RELOAD__ = true;
  });
  await page.getByRole('dialog').getByRole('button', { name: 'Sostituisci' }).click();
  await expect.poll(() => msgs.join('\n')).toMatch(/Ricarica non riuscita: le schede non sono cambiate/);
  expect(await programsOf(page)).toEqual(before);
  expect((await settingsOf(page)).templateId).toBe('m1');
  await expect(page.locator('nav.tabbar button')).toHaveText(['A', 'B', 'C', 'Storico', 'Grafici', 'Info']);
});
