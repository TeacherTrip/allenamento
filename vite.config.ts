import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// L'app viene pubblicata su https://teachertrip.github.io/allenamento/
export default defineConfig({
  base: '/allenamento/',
  plugins: [
    react(),
    VitePWA({
      // aggiornamento SOLO a richiesta: compare un avviso, l'app si ricarica quando lo decide l'utente
      registerType: 'prompt',
      injectRegister: false,
      // favicon e icone entrano già in cache con globPatterns: niente doppioni nell'elenco
      includeManifestIcons: false,
      manifest: {
        name: 'TeacherGym',
        short_name: 'TeacherGym',
        description: 'Scheda di allenamento a casa: sedute, storico, grafici.',
        lang: 'it',
        start_url: '/allenamento/',
        scope: '/allenamento/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#111214',
        theme_color: '#111214',
        icons: [
          { src: 'icone/icona-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone/icona-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icone/icona-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // tutto in cache al primo avvio, immagini degli esercizi comprese: l'app funziona senza rete
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ico,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
