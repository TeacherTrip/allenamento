/**
 * Passo 4 della Fase 4-bis: la seduta è guidata dalle schede salvate nel database.
 * Le schede di prova vengono scritte direttamente in IndexedDB (l'editor arriva al passo 6).
 * Dati e nomi INVENTATI.
 */
import { expect, test, type Page } from '@playwright/test';
import type { Program, ProgramItem } from '../src/program/types';
import type { Session } from '../src/db/models';
import { autoDialogs, card, checkSet, expectToast, goTab, logSet, openHistory, row, saveSession, typeSet } from './helpers';
import { readDb } from './migrazione-helpers';

const item = (exerciseId: string, sets: number, repRange: [number, number], restSec: number | null, extra: Partial<ProgramItem> = {}): ProgramItem => ({
  key: `k-${exerciseId}`, exerciseId, sets, repRange, restSec, ...extra,
});
const program = (id: string, name: string, order: number, items: ProgramItem[], extra: Partial<Program> = {}): Program => ({
  id, name, order, warmup: false, circuit: 'no', items, ...extra,
});

/** Apre l'app, sostituisce schede (e impostazioni) nel database e ricarica. */
async function useProgramsIn(page: Page, programs: Program[], settings: Record<string, unknown> = {}) {
  await page.goto('./');
  await expect(page.locator('h1')).toHaveText('TeacherGym');
  await page.evaluate(
    ([programs, settings]) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('teachergym');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const tx = req.result.transaction(['programs', 'settings'], 'readwrite');
          tx.objectStore('programs').clear();
          for (const p of programs as unknown[]) tx.objectStore('programs').put(p);
          for (const [key, value] of Object.entries(settings as Record<string, unknown>)) tx.objectStore('settings').put({ key, value });
          tx.oncomplete = () => (req.result.close(), resolve());
          tx.onerror = () => reject(tx.error);
        };
      }),
    [programs, settings] as const,
  );
  await page.reload();
  await expect(page.locator('nav.tabbar button').first()).toHaveText(programs[0].name);
}

test('D01 superset con serie diverse: gsq 3 + cr 2 → in coppia per 2 giri, poi recupero dopo gsq da solo', async ({ page }) => {
  await useProgramsIn(page, [
    program('p1', 'Prova', 1, [item('gsq', 3, [10, 12], null, { supersetNext: true }), item('cr', 2, [15, 20], 90), item('db', 2, [6, 8], 45)]),
  ], { phase1: false });
  const bar = page.locator('.restbar');
  await expect(card(page, 'gsq').locator('.tag')).toHaveText('1a');
  await expect(card(page, 'cr').locator('.tag')).toHaveText('1b');
  await expect(card(page, 'gsq')).toContainText('Passa subito a 1b');
  await expect(card(page, 'gsq').getByRole('button', { name: 'Avvia recupero 90s' })).toBeVisible();

  for (let i = 0; i < 2; i++) {
    await logSet(page, 'gsq', i, { kg: 6, reps: 10 });
    await expectToast(page, '→ Passa a 1b');
    await expect(bar).toHaveCount(0);
    await logSet(page, 'cr', i, { reps: 15 });
    await expect(bar).toContainText('Calf raise in piedi');
    await bar.getByRole('button', { name: 'Stop' }).click();
  }
  // 3ª serie: solo gsq → il recupero della coppia parte dopo gsq
  await logSet(page, 'gsq', 2, { kg: 6, reps: 10 });
  await expect(bar).toContainText('Goblet squat');
  await expect(bar.locator('.t')).toHaveText(/01:(30|29|28)/);
  await bar.getByRole('button', { name: 'Stop' }).click();
  // ultimo blocco: recupero tra le serie, nessun timer dopo l'ultima serie della seduta
  await logSet(page, 'db', 0, { reps: 6 });
  await expect(bar).toContainText('Dead bug');
  await bar.getByRole('button', { name: 'Stop' }).click();
  await logSet(page, 'db', 1, { reps: 6 });
  await expect(bar).toHaveCount(0);
});

test('D02 recupero "–": nessun timer automatico, niente "rec." e pulsante manuale da 60 s', async ({ page }) => {
  await useProgramsIn(page, [program('p1', 'Prova', 1, [item('hfs', 2, [30, 40], null), item('pa', 2, [12, 15], 60)])]);
  await expect(card(page, 'hfs').locator('.meta')).not.toContainText('rec.');
  await expect(card(page, 'hfs').locator('.meta')).toContainText('2 × 30-40 s /lato');
  await expect(card(page, 'hfs').getByRole('button', { name: 'Avvia recupero 60s' })).toBeVisible();
  await typeSet(page, 'hfs', 0, { sec: 30 });
  await checkSet(page, 'hfs', 0);
  await expect(page.locator('.restbar')).toHaveCount(0);
  // mobilità: nessun suggerimento di progressione nemmeno al massimo del range
  await expect(card(page, 'hfs').locator('.hint')).toHaveCount(0);
});

test('D03 scheda senza esercizi: messaggio "Aggiungi esercizi da Info" e Inizia disattivato', async ({ page }) => {
  await useProgramsIn(page, [program('p1', 'Vuota', 1, [])]);
  await expect(page.getByTestId('empty-program')).toContainText('Aggiungi esercizi da Info');
  await expect(page.getByRole('button', { name: '▶ Inizia allenamento' })).toBeDisabled();
  await expect(page.locator('section.ex')).toHaveCount(0);
});

test('D04 valore di partenza: precompila in grigio solo senza storico (0 kg compresi)', async ({ page }) => {
  autoDialogs(page);
  await useProgramsIn(page, [
    program('p1', 'Prova', 1, [
      item('gb', 2, [12, 15], 75, { startValue: 0 }),
      item('rdl', 3, [10, 12], 90, { startValue: 6 }),
      item('pa', 2, [12, 15], 60, { startValue: 10 }),
      item('pu', 2, [8, 12], 75, { startValue: 1 }),
      item('sp', 2, [15, 20], 60, { startValue: 15 }),
    ]),
  ]);
  const kg = (id: string, i: number) => row(page, id, i).locator('input[placeholder="kg"]');
  await expect(kg('gb', 0)).toHaveValue('0');
  await expect(kg('gb', 1)).toHaveValue('0');
  await expect(kg('gb', 0)).toHaveClass(/prefilled/);
  await expect(row(page, 'gb', 0).locator('input[placeholder^="reps"]')).toHaveValue('');
  await expect(kg('rdl', 1)).toHaveValue('6'); // "Settimane 1-2" attivo (predefinito): 2 serie
  await expect(row(page, 'pa', 0).getByRole('button', { name: '10', exact: true })).toHaveClass(/on prefilled/);
  await expect(row(page, 'pu', 0).getByRole('button', { name: '1 Piano cucina' })).toHaveClass(/on prefilled/);
  await expect(row(page, 'sp', 0).locator('input[placeholder^="sec"]')).toHaveValue('15');

  // a 0 kg la serie si salva; la volta dopo vince lo storico
  await logSet(page, 'gb', 0, { kg: 0, reps: 14 });
  await saveSession(page);
  await expectToast(page, 'Seduta salvata');
  await expect(kg('gb', 0)).toHaveValue('0');
  await expect(row(page, 'gb', 0).locator('input[placeholder^="reps"]')).toHaveValue('14');
  await expect(card(page, 'gb').locator('.last')).toContainText('0 kg × 14');
});

test('D05 note: catalogo + nota della voce; note della scheda in cima o in fondo; riscaldamento e circuito per scheda', async ({ page }) => {
  await useProgramsIn(page, [
    program('p1', 'Su', 1, [item('gsq', 2, [8, 12], 90, { notes: 'Nota inventata della voce.' })], {
      notes: 'Nota inventata della scheda.', notesPosition: 'top', warmup: true, circuit: 'optional', description: 'Prova', subtitle: 'Sottotitolo',
    }),
    program('p2', 'Giu', 2, [item('db', 2, [6, 8], 45)], { notes: 'Nota in fondo.', notesPosition: 'bottom', circuit: 'yes' }),
  ]);
  await expect(page.locator('h2')).toHaveText('Seduta Su — Prova');
  await expect(page.locator('.sub').first()).toHaveText('Sottotitolo');
  const note = card(page, 'gsq').locator('details.note');
  await note.locator('summary').click();
  await expect(note).toContainText('Talloni a terra'); // nota del catalogo
  await expect(note.locator('.item-notes')).toHaveText('Nota della scheda: Nota inventata della voce.');
  // note della scheda prima del primo esercizio
  const notes = page.getByTestId('program-notes');
  await expect(notes).toContainText('Nota inventata della scheda.');
  expect(await notes.evaluate((n) => !!(n.compareDocumentPosition(document.querySelector('section.ex')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await expect(page.getByTestId('warmup')).toBeVisible();
  // circuito facoltativo: chiuso, si apre con un tocco
  const circuit = page.getByTestId('circuit-box');
  await expect(circuit).toContainText('(facoltativo)');
  await expect(circuit.getByRole('button', { name: '▶ Avvia circuito' })).toBeHidden();
  await circuit.locator('summary').click();
  await expect(circuit.getByRole('button', { name: '▶ Avvia circuito' })).toBeVisible();

  await goTab(page, 'Giu');
  await expect(page.locator('h2')).toHaveText('Seduta Giu');
  await expect(page.getByTestId('warmup')).toHaveCount(0);
  await expect(page.getByTestId('circuit-box').getByRole('button', { name: '▶ Avvia circuito' })).toBeVisible();
  const bottom = page.getByTestId('program-notes');
  expect(await bottom.evaluate((n) => !!(n.compareDocumentPosition(document.querySelector('section.ex')!) & Node.DOCUMENT_POSITION_PRECEDING))).toBe(true);
});

test('D06 lato di partenza destro: testi e ordine dei tasti dei lati', async ({ page }) => {
  await useProgramsIn(page, [program('p1', 'Prova', 1, [item('row', 2, [8, 12], 75), item('bdog', 2, [6, 8], 60)])], { startSide: 'right' });
  await expect(card(page, 'row')).toContainText('Parti dal lato destro: tocca Dx, poi Sx senza pausa');
  await expect(card(page, 'bdog')).toContainText('Parti dal lato destro, lati alternati');
  const r = row(page, 'row', 0);
  await expect(r.locator('.side-btn').first()).toHaveText('Dx');
  await typeSet(page, 'row', 0, { kg: 6, reps: 10 });
  await r.getByRole('button', { name: 'Conferma lato destro' }).click();
  await expectToast(page, '→ Lato sinistro, senza pausa');
  await r.getByRole('button', { name: 'Conferma lato sinistro' }).click();
  await expect(r).toHaveClass(/confirmed/);
});

test('D07 la seduta salva una copia della scheda: cambiare la scheda dopo non cambia lo storico', async ({ page }) => {
  autoDialogs(page);
  const items = [item('gsq', 2, [8, 12], 90, { notes: 'nota v1' }), item('cr', 2, [15, 20], 60)];
  await useProgramsIn(page, [program('p1', 'Prova', 1, items)]);
  await logSet(page, 'gsq', 0, { kg: 8, reps: 10 });
  await saveSession(page);
  await expectToast(page, 'Seduta salvata');

  const s1 = (await readDb(page)).stores.sessions as Session[];
  expect(s1).toHaveLength(1);
  expect(s1[0]).toMatchObject({ day: 'p1', programName: 'Prova', plan: items });

  // scheda cambiata (nome, voci): la seduta salvata resta com'era
  await useProgramsIn(page, [program('p1', 'Nuova', 1, [item('db', 3, [6, 8], 45)])]);
  const s2 = (await readDb(page)).stores.sessions as Session[];
  expect(s2[0]).toEqual(s1[0]);
  await openHistory(page);
  await expect(page.locator('.hist details').first().locator('summary')).toContainText('Seduta Prova');
  await expect(page.locator('.hist details').first()).toContainText('Goblet squat');
});

test('D08 barra in basso a 360 px con 4 schede da 6 caratteri: pulsanti ≥ 48 px, nessun testo tagliato', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const names = ['Gambe1', 'Spalle', 'Schien', 'Petto2'];
  await useProgramsIn(page, names.map((n, i) => program(`p${i}`, n, i + 1, [item('gsq', 2, [8, 12], 90)])));
  const buttons = page.locator('nav.tabbar button');
  await expect(buttons).toHaveText([...names, 'Storico', 'Grafici', 'Info']);
  for (let i = 0; i < 7; i++) {
    const b = buttons.nth(i);
    const box = (await b.boundingBox())!;
    expect(box.width, await b.textContent() ?? '').toBeGreaterThanOrEqual(48);
    expect(box.height).toBeGreaterThanOrEqual(48);
    // testo intero: niente parti nascoste
    expect(await b.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
  const nav = page.locator('nav.tabbar');
  expect(await nav.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('D09 esercizi nuovi del catalogo nella seduta: immagine, unilaterale per lato, salvataggio', async ({ page }) => {
  autoDialogs(page);
  await useProgramsIn(page, [program('p1', 'Prova', 1, [item('ss', 2, [8, 10], 75, { startValue: 0 }), item('cls', 2, [12, 15], 75), item('cr', 2, [15, 20], 90)])]);
  await expect(card(page, 'ss').locator('.thumb img')).toHaveAttribute('src', /esercizi\/ss\.webp$/);
  await expect(card(page, 'ss').locator('.meta')).toContainText('2 × 8-10 /lato');
  await logSet(page, 'ss', 0, { kg: 0, reps: 8 });
  await logSet(page, 'cls', 0, { reps: 12 });
  await logSet(page, 'cr', 0, { reps: 15 });
  await saveSession(page);
  await expectToast(page, 'Seduta salvata');
  await openHistory(page);
  const h = page.locator('.hist details').first();
  await expect(h).toContainText('Split squat statico: 0 kg × 8 /lato');
  await expect(h).toContainText('Clamshell con fascia: 12 /lato reps');
  await expect(h).toContainText('Calf raise in piedi: 15 reps');
});
