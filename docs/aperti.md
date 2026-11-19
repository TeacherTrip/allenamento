# Punti aperti

## Da provare (utente, sul telefono) — tutto ok il 2026-11-19
- [x] Recupero a schermo acceso: "Via!" centrato per 4 s + 4 bip.
- [x] Recupero a schermo bloccato: allo sblocco "Via!" visibile per 4 s, senza suono.
- [x] Tasti [Sx] [Dx] (bulgarian, rematore, stacco a una gamba, military press, side plank).
- [x] "+ Serie": aggiunta, eliminazione, "(extra)" nello Storico.
- [x] Immagini: miniature, tutto schermo, chiusura con tap e con Indietro, circuito (2026-11-19).

## Da decidere
- [ ] Stringere il firewall: una sola regola Allow per node.exe (profilo Private, solo TCP 5173). I comandi li esegue l'utente come amministratore.

## Prossime fasi
- [ ] Fase 5: timer del circuito cardio (seduta C), grafici (Chart.js: e1RM + carico della serie migliore).
  - [ ] Timer circuito → immagine grande dell'esercizio in corso.
- [ ] Fase 6: PWA (vite-plugin-pwa, icona), protezioni del repo (branch protection), repo pubblico con conferma, GitHub Actions + Pages. Valutare la notifica di fine recupero (vibra anche a telefono bloccato).
  - [ ] `globPatterns` deve includere `webp`; verificare che le 28 immagini (`public/esercizi/`, ~0,7 MB) entrino nel precache.
- [ ] Fase 7: verifica finale con checklist.

## A fine lavori sul telefono
- [ ] Spegnere "Debug USB", revocare le autorizzazioni di debug USB ("Consenti sempre da questo computer") e spegnere "Rimani attivo" nelle Opzioni sviluppatore.
- [ ] Facoltativo: riattivare o lasciare spenta "Vibrazione tattile".
