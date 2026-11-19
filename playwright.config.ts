import { defineConfig, devices } from '@playwright/test';

// Prove end-to-end: Chrome installato sul PC, emulazione Pixel 7, profilo temporaneo pulito per ogni test.
// E2E_BASE_URL permette di provare su un'origine NON sicura (es. http://192.168.1.10:5173/allenamento/),
// come sul telefono in Wi-Fi: lì wakeLock e navigator.storage non esistono.
const external = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: 'e2e',
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
  webServer: external
    ? undefined
    : {
        command: 'npx vite --port 5174 --strictPort',
        url: 'http://localhost:5174/allenamento/',
        reuseExistingServer: false,
      },
});
