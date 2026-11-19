# Punti aperti

## Da decidere
- [ ] Stringere il firewall: una sola regola Allow per node.exe (profilo Private, solo TCP 5173). I comandi li esegue l'utente come amministratore.

## Prossime fasi
- [ ] Fase 6: PWA (vite-plugin-pwa, icona), protezioni del repo (branch protection), repo pubblico con conferma, GitHub Actions + Pages. Valutare la notifica di fine recupero (vibra anche a telefono bloccato).
  - [ ] Prima della pubblicazione: export delle sedute registrate su localhost → import su teachertrip.github.io/allenamento.
  - [ ] Pacchetto JS ~181 KB compressi (Chart.js compreso): valutare il caricamento della schermata Grafici solo quando serve.
  - [ ] `globPatterns` deve includere `webp`; verificare che le 28 immagini (`public/esercizi/`, ~0,7 MB) entrino nel precache.
- [ ] Fase 7: verifica finale con checklist.

## A fine lavori sul telefono
- [ ] (Dopo le prove della Fase 5.) Spegnere "Debug USB", revocare le autorizzazioni di debug USB ("Consenti sempre da questo computer") e spegnere "Rimani attivo" nelle Opzioni sviluppatore.
- [ ] Facoltativo: riattivare o lasciare spenta "Vibrazione tattile".
- [ ] Cancellare dallo Storico le sedute salvate durante le prove (anche quelle col circuito), così i grafici partono da dati veri.
