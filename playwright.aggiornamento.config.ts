import { defineConfig, devices } from '@playwright/test';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * Prova di aggiornamento reale (versione pubblicata → versione nuova). Solo a mano: `npm run prova-aggiornamento`
 * (scripts/prova-aggiornamento.mjs costruisce le due versioni e passa le cartelle in AGG_DIST_OLD / AGG_DIST_NEW).
 * Il server lo avvia la prova stessa (stessa porta per le due versioni). Esclusa da CI e da `npx playwright test`.
 * Risultati nella cartella temporanea di sistema (teachergym-aggiornamento), mai nel progetto.
 */
export default defineConfig({
  testDir: 'e2e-aggiornamento',
  outputDir: path.join(os.tmpdir(), 'teachergym-aggiornamento', 'risultati'),
  fullyParallel: false,
  workers: 1, // un solo server, che cambia versione durante la prova
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    ...devices['Pixel 7'],
    channel: 'chrome',
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
    serviceWorkers: 'allow',
  },
});
