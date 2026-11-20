import { defineConfig } from '@playwright/test';
import * as os from 'node:os';
import * as path from 'node:path';

/*
 * Prove sul TELEFONO VERO collegato via USB. Solo a mano: `npm run prova-usb` (scripts/prova-usb.mjs).
 * Escluse dalle prove normali (`npx playwright test` usa solo e2e/), da `npm test` (solo tests/) e dalla CI.
 *
 * Cosa serve: telefono Android con il debug USB attivo e autorizzato, Chrome aperto, adb nel PATH
 * (oppure la variabile d'ambiente ADB col percorso di adb). Nessun numero di serie, percorso o indirizzo IP nei file.
 *
 * Cosa fa lo script, in ordine:
 *   adb forward tcp:9222 localabstract:chrome_devtools_remote   canale di debug di Chrome (come chrome://inspect)
 *   adb reverse tcp:5173 tcp:5173                               il telefono raggiunge il PC come http://localhost:5173
 *   vite build + vite preview --port 5173 --host 127.0.0.1      versione costruita: il service worker c'è solo lì
 *   prove; alla fine toglie gli inoltri e ferma il server.
 * Sul telefono si usa SOLO http://localhost:5173/allenamento/: origine sicura (service worker e Wake Lock funzionano)
 * e DIVERSA da quella dell'app installata, i cui dati non si toccano. Si cancellano solo i dati di localhost:5173.
 * Nessuna app installata, nessuna impostazione cambiata: solo schede di Chrome aperte e chiuse.
 * Schermate, misure e risultati: nella cartella temporanea di sistema (teachergym-usb), mai nel progetto né in Git.
 */
export default defineConfig({
  testDir: 'e2e-usb',
  outputDir: path.join(os.tmpdir(), 'teachergym-usb', 'risultati'),
  fullyParallel: false,
  workers: 1, // un solo Chrome sul telefono; le prove girano nell'ordine del file (quella offline per ultima)
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
});
