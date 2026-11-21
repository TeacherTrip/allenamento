import { expect, test } from '@playwright/test';
import { goTab, openApp } from './helpers';

// Fase 4-bis passo 7: testi che dipendono dal modello (descrizioni delle schede, sottotitoli, Info). Dati inventati.

const DAYS = /Lunedì|Martedì|Mercoledì|Giovedì|Venerdì|Sabato|Domenica/;

test('IM01 primo avvio: descrizioni delle schede A-D del Modello 2', async ({ page }) => {
  await page.goto('./');
  const m2 = page.getByTestId('model-m2');
  await expect(m2).toContainText('Scheda A — Full body · 8 esercizi');
  await expect(m2).toContainText('Scheda B — Full body — catena posteriore · 8 esercizi');
  await expect(m2).toContainText('Scheda C — Full body — glutei e core · 8 esercizi');
  await expect(m2).toContainText('Scheda D — leggera (~25 min) · 6 esercizi');
  // Modello 1 invariato
  await expect(page.getByTestId('model-m1')).toContainText('Scheda C — Braccia, spalle, femorali + cardio · 7 esercizi');
});

test('IM02 Modello 2: titoli e sottotitoli delle sedute senza giorni fissi; Info con «Esempio» e i suoi testi', async ({ page }) => {
  await openApp(page, 'A', 'm2');
  for (const [tab, title, sub] of [
    ['A', 'Seduta A — Full body', '~60 min'],
    ['B', 'Seduta B — Full body — catena posteriore', '~60 min'],
    ['C', 'Seduta C — Full body — glutei e core', '~60 min'],
    ['D', 'Seduta D — leggera (~25 min)', '~25 min'],
  ]) {
    await goTab(page, tab);
    await expect(page.locator('h2').first()).toHaveText(title);
    await expect(page.getByTestId('program-subtitle')).toHaveText(sub);
    await expect(page.getByTestId('program-subtitle')).not.toHaveText(DAYS);
  }

  // scheda D: riscaldamento con la voce della barra aggiornata (uguale nei due modelli)
  await expect(page.getByTestId('warmup')).toContainText('2 hang alla barra da 15-20 s (anche con i piedi appoggiati, se serve)');

  await goTab(page, 'Info');
  await expect(page.getByTestId('week-intro')).toContainText('3 sedute a settimana, mai due giorni di fila');
  await expect(page.getByTestId('week-intro')).toContainText('(molta stanchezza o poca energia)');
  await expect(page.getByTestId('daily')).toContainText('Se ci si sente poco bene: sedersi e chiudere la serie.');
  await expect(page.getByText('Esempio', { exact: true })).toBeVisible();
  const week = page.getByTestId('week');
  await expect(week).toContainText('LunA');
  await expect(week).not.toContainText('Seduta');
  await expect(week).not.toContainText('Camminata veloce');
  await expect(page.getByTestId('daily').locator('li')).toHaveCount(5);
  await expect(page.getByTestId('daily')).not.toContainText('48 ore');
  const rules = page.getByTestId('rules');
  await expect(rules.locator('li')).toHaveCount(12);
  await expect(rules).not.toContainText('14 kg');
  await expect(rules).not.toContainText('stesse reps con l’altro lato');
  await expect(page.getByTestId('pushup-scale')).toContainText('5 Terra. A 3 × 12 pulite si scende di un livello.');
});

test('IM03 Modello 1: sottotitoli con i giorni e Info (con il circuito facoltativo in A e B)', async ({ page }) => {
  await openApp(page, 'A', 'm1');
  await expect(page.getByTestId('program-subtitle')).toHaveText('Lunedì · ~45 min');
  await goTab(page, 'Info');
  await expect(page.getByTestId('week-intro')).toHaveCount(0);
  await expect(page.getByText('Esempio', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('week')).toContainText('Seduta A — full body');
  await expect(page.getByTestId('daily')).toContainText('Tra A e B almeno 48 ore.');
  await expect(page.getByTestId('rules').locator('li')).toHaveCount(8); // 8 dal 21/11: circuito facoltativo in A e B
  await expect(page.getByTestId('rules')).toContainText('in A e B è facoltativo, si salta se stanco o poco recuperato');
  await expect(page.getByTestId('pushup-scale')).toContainText('Passi al livello successivo quando fai 3 × 12 a RIR 2.');
});
