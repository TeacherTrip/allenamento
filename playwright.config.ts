import { defineConfig, devices } from '@playwright/test';

// Prove end-to-end: Chrome installato sul PC, emulazione Pixel 7, profilo temporaneo pulito per ogni test.
// E2E_BASE_URL permette di provare su un'origine NON sicura (es. http://192.168.1.10:5173/allenamento/),
// come sul telefono in Wi-Fi: lì wakeLock e navigator.storage non esistono.
const external = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: 'e2e',
  // prova a secco sui dati reali: solo a mano con `npm run prova-a-secco` (mai nelle prove normali)
  testIgnore: process.env.PROVA_A_SECCO === '1' ? [] : ['**/prova-a-secco.spec.ts'],
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  use: {
    ...devices['Pixel 7'],
    channel: 'chrome',
    baseURL: external ?? 'http://localhost:5174/allenamento/',
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
  },
  // 5174 = sviluppo; 4174 = versione costruita (service worker, offline: e2e/pwa.spec.ts)
  webServer: external
    ? undefined
    : [
        {
          command: 'npx vite --port 5174 --strictPort',
          url: 'http://localhost:5174/allenamento/',
          reuseExistingServer: false,
        },
        {
          command: 'npx vite build --logLevel warn && npx vite preview --port 4174 --strictPort',
          url: 'http://localhost:4174/allenamento/',
          reuseExistingServer: false,
          timeout: 180_000,
        },
      ],
});
