# Punti aperti

## Da provare (utente, sul telefono)
- [ ] Fase 5 · Circuito (seduta C): Avvia → 5 s di preparazione con bip 3-2-1 → lavoro/pausa con immagine grande, suoni e vibrazione; Pausa/Riprendi; Interrompi (registra i round fatti); tasto Indietro chiede conferma; schermo sempre acceso; telefono bloccato a metà → al ritorno il timer è al punto giusto.
- [ ] Fase 5 · Grafici: leggibilità su schermo piccolo (tema chiaro e scuro), tocco su un punto mostra il valore, tabella dei valori.

## Da decidere
- [ ] Stringere il firewall: una sola regola Allow per node.exe (profilo Private, solo TCP 5173). I comandi li esegue l'utente come amministratore.

## Prossime fasi
- [x] Fase 5: timer del circuito (immagine grande, commit 1aa0679) e grafici Chart.js (commit 6a3cf8e). Manca solo la prova sul telefono, poi push.
- [ ] Fase 6: PWA (vite-plugin-pwa, icona), protezioni del repo (branch protection), repo pubblico con conferma, GitHub Actions + Pages. Valutare la notifica di fine recupero (vibra anche a telefono bloccato).
  - [ ] Pacchetto JS ~181 KB compressi (Chart.js compreso): valutare il caricamento della schermata Grafici solo quando serve.
  - [ ] `globPatterns` deve includere `webp`; verificare che le 28 immagini (`public/esercizi/`, ~0,7 MB) entrino nel precache.
- [ ] Fase 7: verifica finale con checklist.

## A fine lavori sul telefono
- [ ] (Si può fare già ora, Fase 4 chiusa; da riattivare per le prove della Fase 5.) Spegnere "Debug USB", revocare le autorizzazioni di debug USB ("Consenti sempre da questo computer") e spegnere "Rimani attivo" nelle Opzioni sviluppatore.
- [ ] Facoltativo: riattivare o lasciare spenta "Vibrazione tattile".
- [ ] Cancellare dallo Storico eventuali sedute salvate durante le prove, prima dei grafici della Fase 5.
