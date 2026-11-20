/**
 * PROVA A SECCO della migrazione sui DATI REALI. Solo a mano, solo sul PC: `npm run prova-a-secco`.
 * Esclusa dalle prove normali (playwright.config.ts) e dalla CI, che non ha il file.
 *
 * Legge il backup JSON esportato dal telefono (versione dell'app di prima) da dati-locali/,
 * lo carica in un database v1 in un profilo temporaneo, apre l'app (→ migrazione) e confronta
 * PRIMA/DOPO: storico, precompilazione di ogni esercizio, e1RM, serie settimanali, indici per gruppo.
 *
 * PRIVACY: non stampa MAI i dati. In uscita solo conteggi e, se ci sono differenze, il loro percorso
 * (es. "perExercise.gsq.prefill.1.reps") senza i valori. Se ci sono differenze: fermarsi e mostrarle
 * all'utente, NON correggerle da soli.
 */
import { expect, test } from '@playwright/test';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { Session, SetLog } from '../src/db/models';
import type { SettingRow } from '../src/db/migrate';
import { model1Plan, model1Programs } from '../src/db/migrate';
import { EXERCISES } from '../src/program/program';
import { computeStats, diff, expectedLastText, readDb, seedV1 } from './migrazione-helpers';
import { card, goTab, row } from './helpers';

const DIR = 'dati-locali';

async function backupFile(): Promise<string> {
  const files = (await readdir(DIR)).filter((f) => f.toLowerCase().endsWith('.json'));
  if (files.length === 0) throw new Error(`Nessun file .json in ${DIR}/`);
  // il più recente
  const withTime = await Promise.all(files.map(async (f) => ({ f, t: (await stat(join(DIR, f))).mtimeMs })));
  return join(DIR, withTime.sort((a, b) => b.t - a.t)[0].f);
}

test('prova a secco: migrazione del backup reale', async ({ page }) => {
  test.setTimeout(180_000);
  const path = await backupFile();
  const obj = JSON.parse(await readFile(path, 'utf8'));
  if (obj?.app !== 'TeacherGym') throw new Error('Il file non è un backup di TeacherGym.');
  if (obj.formatVersion !== 1) throw new Error(`Serve un backup della versione di prima (formato 1); questo è formato ${obj.formatVersion}.`);

  const sessions = obj.sessions as Session[];
  const setLogs = obj.setLogs as SetLog[];
  const settings: SettingRow[] = Object.entries(obj.settings ?? {}).map(([key, value]) => ({ key: key as SettingRow['key'], value }));
  const before = computeStats(sessions, setLogs);
  console.log(`Backup: ${before.counts.sessions} sedute, ${before.counts.logs} serie, ${before.counts.exercises} esercizi, ${before.counts.weeks} settimane con dati.`);

  await seedV1(page, { sessions, setLogs, drafts: [], settings });
  await page.goto('./');
  const problems: string[] = [];
  if (await page.getByTestId('db-error').count()) problems.push('schermata d’errore della migrazione');
  await expect(page.locator('h1')).toHaveText('TeacherGym');

  const db = await readDb(page);
  if (db.version !== 20) problems.push(`versione del database ${db.version} (attesa 20)`);
  const afterSessions = db.stores.sessions as Session[];
  const afterLogs = db.stores.setLogs as SetLog[];
  if (afterSessions.length !== sessions.length) problems.push(`sedute: ${sessions.length} prima, ${afterSessions.length} dopo`);
  if (afterLogs.length !== setLogs.length) problems.push(`serie: ${setLogs.length} prima, ${afterLogs.length} dopo`);
  const wrongPlan = afterSessions.filter((s) => s.programName !== s.day || JSON.stringify(s.plan) !== JSON.stringify(model1Plan(s.day) ?? [])).length;
  if (wrongPlan) problems.push(`${wrongPlan} sedute senza nome/copia della scheda corretti`);
  if (JSON.stringify(db.stores.programs) !== JSON.stringify(model1Programs())) problems.push('schede del Modello 1 non create correttamente');
  const rows = db.stores.settings as SettingRow[];
  const missing = settings.filter((r) => !rows.some((x) => x.key === r.key && JSON.stringify(x.value) === JSON.stringify(r.value))).length;
  if (missing) problems.push(`${missing} impostazioni cambiate`);
  if (!rows.some((r) => r.key === 'onboarded' && r.value === true)) problems.push('primo avvio non segnato come fatto');
  if (!rows.some((r) => r.key === 'startSide' && r.value === 'left')) problems.push('lato di partenza non sinistro');

  // PRIMA = DOPO sui valori calcolati: solo i percorsi, mai i valori
  const after = computeStats(afterSessions, afterLogs);
  const diffs = diff(before, after, '', [], false, 200);

  // nell'app: "Ultima volta" e precompilazione del carico di ogni esercizio
  let uiChecked = 0;
  for (const day of ['A', 'B', 'C']) {
    await goTab(page, day);
    for (const ex of EXERCISES.filter((e) => e.day === day)) {
      await card(page, ex.id).waitFor(); // la scheda appena aperta si disegna dopo aver letto la bozza
      const expected = expectedLastText(ex.id, sessions, setLogs);
      const last = card(page, ex.id).locator('.last');
      const shown = (await last.count()) ? (await last.textContent())?.trim() : null;
      if ((shown ?? null) !== expected) problems.push(`app: "Ultima volta" diverso per ${ex.id}`);
      if (ex.metric === 'kg') {
        const pre = (before.perExercise[ex.id] as { prefill: { load?: number }[] }).prefill[0]?.load;
        const value = await row(page, ex.id, 0).locator('input[placeholder="kg"]').inputValue();
        if (value !== (pre == null ? '' : String(pre).replace('.', ','))) problems.push(`app: carico precompilato diverso per ${ex.id}`);
      }
      uiChecked++;
    }
  }

  console.log(`Controllati: ${afterSessions.length} sedute, ${afterLogs.length} serie, ${Object.keys(after.perExercise).length} esercizi, ${uiChecked} schede esercizio nell'app.`);
  console.log(`Differenze nei valori calcolati: ${diffs.length}. Altri problemi: ${problems.length}.`);
  for (const d of diffs) console.log(`  DIFFERENZA ${d}`);
  for (const p of problems) console.log(`  PROBLEMA ${p}`);
  // messaggio senza dati: i dettagli (solo percorsi) sono stampati sopra
  expect(diffs.length + problems.length, 'differenze trovate: vedi elenco sopra').toBe(0);
});
