import { defineConfig, devices } from '@playwright/test';

// Prove end-to-end: Chrome installato sul PC, emulazione Pixel 7, profilo temporaneo pulito per ogni test.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  use: {
    ...devices['Pixel 7'],
    channel: 'chrome',
    baseURL: 'http://localhost:5174/allenamento/',
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
  },
  webServer: {
    command: 'npx vite --port 5174 --strictPort',
    url: 'http://localhost:5174/allenamento/',
    reuseExistingServer: false,
  },
});
