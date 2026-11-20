import { expect, test } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFile, rm } from 'node:fs/promises';
import type { Draft, Session, SetLog } from '../src/db/models';
import { model1Plan, model1Programs, settingsToAdd, upgradeSession, type SettingRow } from '../src/db/migrate';
import { EXERCISES } from '../src/program/program';
import { bandOptions } from '../src/program/bands';
import { computeStats, diff, expectedLastText, readDb, seedV1, type V1Data } from './migrazione-helpers';
import { card, goTab, row } from './helpers';

/**
 * Database v1 INVENTATO ma realistico: 8 settimane di sedute A/C/B con tutte le metriche,
 * "Settimane 1-2" nelle prime due, serie extra, note, durate, circuito, una seduta incompleta,
 * una bozza con allenamento in corso e le impostazioni della versione 1.
 */
function fakeV1(): V1Data {
  const sessions: Session[] = [];
  const setLogs: SetLog[] = [];
  const start = Date.UTC(2026, 8, 7, 8, 0); // lunedì 7/9/2026, 10:00 a Roma
  const dayOffset = { A: 0, C: 2, B: 4 } as const;
  let n = 0;
  for (let w = 0; w < 8; w++) {
    for (const day of ['A', 'C', 'B'] as const) {
      if (w === 5 && day === 'C') continue; // settimana con una seduta saltata
      const id = `s${w}${day}`;
      const phase1 = w < 2;
      sessions.push({
        id,
        date: new Date(start + (w * 7 + dayOffset[day]) * 86400000).toISOString(),
        day,
        phase1,
        notes: w % 3 === 0 ? `nota inventata ${w}${day}` : '',
        programVersion: 1,
        ...(w > 0 ? { durationSec: 2400 + w * 60 } : {}),
        ...(day === 'C' && w % 2 === 0 ? { circuit: { protocol: 0, label: 'Sett. 1-2', rounds: 6, completedRounds: 6 - (w % 3) } } : {}),
      });
      for (const ex of EXERCISES.filter((e) => e.day === day)) {
        if (w === 6 && ex.id === 'lc') continue; // esercizio saltato in una seduta
        const sets = phase1 ? Math.min(2, ex.sets) : ex.sets;
        for (let i = 0; i < sets; i++) {
          const reps = ex.repRange[0] + ((w + i) % (ex.repRange[1] - ex.repRange[0] + 1));
          const v: Partial<SetLog> = {};
          if (ex.metric === 'kg') Object.assign(v, { load: 6 + w * 0.5 + (i === 0 ? 0 : 1), reps });
          else if (ex.metric === 'band') Object.assign(v, { load: bandOptions(ex.bandDirection!)[Math.min(w >> 1, 2)].value, reps });
          else if (ex.metric === 'level') Object.assign(v, { load: 1 + (w >> 2), reps });
          else if (ex.metric === 'bodyweight') Object.assign(v, { reps });
          else Object.assign(v, { seconds: 20 + w * 2 + i });
          setLogs.push({ id: `l${n++}`, sessionId: id, exerciseId: ex.id, setIndex: i, confirmed: true, ...v });
        }
        // serie extra ogni tanto
        if (w === 3 && (ex.id === 'gsq' || ex.id === 'pa')) {
          setLogs.push({ id: `l${n++}`, sessionId: id, exerciseId: ex.id, setIndex: ex.sets, confirmed: true, extra: true, load: ex.metric === 'kg' ? 8 : 10, reps: 6 });
        }
      }
    }
  }
  const drafts: Draft[] = [
    {
      day: 'B',
      updatedAt: new Date().toISOString(),
      sets: { bss: [{ load: '11', reps: '9' }, null], ht: [{ load: '14', reps: '12', pending: true }] },
      notes: 'bozza in corso',
      startedAt: new Date(Date.now() - 10 * 60000).toISOString(),
    },
  ];
  const settings: SettingRow[] = [
    { key: 'phase1', value: false },
    { key: 'cardioProtocol', value: 1 },
    { key: 'lastBackupAt', value: '2026-10-20T18:00:00.000Z' },
    { key: 'sessionsSinceBackup', value: 3 },
    { key: 'autoRest', value: true },
  ];
  return { sessions, setLogs, drafts, settings };
}

test('M1 installazione esistente: migrazione v1 → v2 senza perdite, valori calcolati identici prima/dopo', async ({ page }) => {
  const data = fakeV1();
  const before = computeStats(data.sessions, data.setLogs);
  expect(before.counts.sessions).toBe(23);

  await seedV1(page, data);
  await page.goto('./');
  await expect(page.locator('h1')).toHaveText('TeacherGym');
  await expect(page.getByTestId('db-error')).toHaveCount(0);

  const db = await readDb(page);
  expect(db.version).toBe(20); // Dexie versione 2
  const sessions = db.stores.sessions as Session[];
  const logs = db.stores.setLogs as SetLog[];

  // dati di prima: tutti presenti, campi v1 invariati
  expect(sessions).toHaveLength(data.sessions.length);
  expect(logs).toEqual(expect.arrayContaining(data.setLogs));
  expect(logs).toHaveLength(data.setLogs.length);
  for (const s of data.sessions) {
    const after = sessions.find((x) => x.id === s.id)!;
    expect(after).toEqual({ ...s, programName: s.day, plan: model1Plan(s.day) });
  }
  expect(db.stores.drafts).toEqual(data.drafts);

  // schede del Modello 1 con id A/B/C
  expect(db.stores.programs).toEqual(model1Programs());

  // impostazioni: le vecchie invariate + le nuove (primo avvio già fatto, Modello 1, lato sinistro)
  const rows = db.stores.settings as SettingRow[];
  for (const r of data.settings) expect(rows).toContainEqual(r);
  expect(rows).toEqual(
    expect.arrayContaining([
      { key: 'onboarded', value: true },
      { key: 'templateId', value: 'm1' },
      { key: 'startSide', value: 'left' },
      { key: 'phase1Since', value: null },
    ]),
  );

  // PRIMA = DOPO: storico, e1RM/carico/ripetizioni, indici, precompilazione, serie settimanali, gruppi
  const after = computeStats(sessions, logs);
  expect(diff(before, after)).toEqual([]);

  // idempotente: rieseguire le regole sui dati migrati non cambia nulla
  for (const s of sessions) expect(upgradeSession(s)).toBe(s);
  expect(settingsToAdd(rows, sessions)).toEqual([]);

  // l'app mostra quello che mostrava prima
  await expect(page.locator('.stopwatch')).toContainText('⏱ B'); // allenamento in corso conservato
  for (const day of ['A', 'B', 'C']) {
    await goTab(page, day);
    for (const ex of EXERCISES.filter((e) => e.day === day)) {
      const text = expectedLastText(ex.id, data.sessions, data.setLogs);
      await expect(card(page, ex.id).locator('.last'), ex.id).toHaveText(text!);
      // precompilazione della prima serie (kg) = ultima volta
      // (esclusi gli esercizi con valori nella bozza in corso: lì vince la bozza)
      const inDraft = data.drafts.some((d) => d.day === day && ex.id in d.sets);
      if (ex.metric === 'kg' && !inDraft) {
        const pre = before.perExercise[ex.id] as { prefill: { load?: number; reps?: number }[] };
        await expect(row(page, ex.id, 0).locator('input[placeholder="kg"]'), ex.id).toHaveValue(String(pre.prefill[0].load).replace('.', ','));
      }
    }
  }
  // bozza: valori della seduta in corso
  await goTab(page, 'B');
  await expect(row(page, 'bss', 0).locator('input[placeholder="kg"]')).toHaveValue('11');
  await expect(row(page, 'ht', 0).locator('input[placeholder="kg"]')).toHaveValue('14');
  await expect(page.locator('textarea')).toHaveValue('bozza in corso');

  // ricaricare non rifà nulla
  await page.reload();
  await expect(page.locator('h1')).toHaveText('TeacherGym');
  const again = await readDb(page);
  expect(again.stores).toEqual(db.stores);
});

test('M2 installazione nuova: nessuna migrazione, nessuna scheda creata da sola, compare il primo avvio', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('firstrun')).toBeVisible();
  await expect(page.locator('nav.tabbar')).toHaveCount(0);
  const db = await readDb(page);
  expect(db.version).toBe(20);
  expect(db.stores.programs).toEqual([]);
  expect((db.stores.settings as SettingRow[]).find((r) => r.key === 'onboarded')).toBeUndefined();
});

test('M3 migrazione che fallisce a metà: schermata d’errore, dati v1 intatti, backup grezzo; poi riparte', async ({ page, context }) => {
  const data = fakeV1();
  await seedV1(page, data);
  await page.addInitScript(() => {
    globalThis.__TG_TEST_FAIL_UPGRADE__ = true;
  });
  await page.goto('./');
  const err = page.getByTestId('db-error');
  await expect(err).toBeVisible();
  await expect(err).toContainText('Migrazione interrotta apposta');
  await expect(page.locator('nav.tabbar')).toHaveCount(0);

  // il browser ha annullato tutto: database ancora v1, sedute senza campi nuovi, nessuna tabella programs
  const db = await readDb(page);
  expect(db.version).toBe(10);
  expect(Object.keys(db.stores).sort()).toEqual(['drafts', 'sessions', 'setLogs', 'settings']);
  expect(db.stores.sessions).toEqual(expect.arrayContaining(data.sessions));
  expect((db.stores.sessions as Session[]).some((s) => 'programName' in s)).toBe(false);
  expect(db.stores.setLogs).toHaveLength(data.setLogs.length);
  expect(db.stores.settings).toEqual(expect.arrayContaining(data.settings));
  expect(db.stores.settings).toHaveLength(data.settings.length);

  // backup grezzo: scaricato in una cartella temporanea di sistema, contiene tutto
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Scarica backup grezzo' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^teachergym-backup-grezzo-\d{4}-\d{2}-\d{2}\.json$/);
  const file = join(tmpdir(), `tg-${Date.now()}-${download.suggestedFilename()}`);
  await download.saveAs(file);
  const dump = JSON.parse(await readFile(file, 'utf8'));
  await rm(file);
  expect(dump).toMatchObject({ app: 'TeacherGym', raw: true, idbVersion: 10, errors: {} });
  expect(dump.stores.sessions).toHaveLength(data.sessions.length);
  expect(dump.stores.setLogs).toHaveLength(data.setLogs.length);
  expect(dump.stores.drafts).toEqual(data.drafts);
  await expect(page.getByTestId('db-dump-status')).toContainText('Backup grezzo scaricato');

  // senza il guasto (nuova scheda del browser) la migrazione riesce
  const page2 = await context.newPage();
  await page2.goto('./');
  await expect(page2.locator('h1')).toHaveText('TeacherGym');
  expect((await readDb(page2)).version).toBe(20);
});

test('M4 un’altra scheda tiene aperto il database vecchio: avviso "Chiudi le altre schede dell’app", poi parte', async ({ page, context }) => {
  await seedV1(page, fakeV1(), true); // connessione v1 lasciata aperta
  const app = await context.newPage();
  await app.goto('./');
  await expect(app.getByTestId('db-blocked')).toContainText('Chiudi le altre schede dell’app');
  await page.evaluate(() => (window as unknown as { __v1db: IDBDatabase }).__v1db.close());
  await expect(app.locator('h1')).toHaveText('TeacherGym');
  await expect(app.getByTestId('db-blocked')).toHaveCount(0);
  expect((await readDb(app)).version).toBe(20);
});

test('M5 un’altra scheda aggiorna il database: questa chiede di essere ricaricata', async ({ page, context }) => {
  await page.goto('./');
  await expect(page.locator('h1')).toHaveText('TeacherGym');
  const other = await context.newPage();
  await other.goto('favicon.svg');
  // versione più nuova aperta altrove (come farebbe una versione futura dell'app)
  await other.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('teachergym', 30);
        req.onsuccess = () => (req.result.close(), resolve());
        req.onerror = () => reject(req.error);
      }),
  );
  await expect(page.getByTestId('db-stale')).toContainText('Un’altra scheda ha aggiornato i dati');
});
