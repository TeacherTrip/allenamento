# Punti aperti

## Da provare (utente, sul telefono)
- [ ] Fase 5 · Circuito (seduta C): Avvia → 5 s di preparazione con bip 3-2-1 → lavoro/pausa con immagine grande, suoni e vibrazione; Pausa/Riprendi; Interrompi (registra i round fatti); tasto Indietro chiede conferma; schermo sempre acceso; telefono bloccato a metà → al ritorno il timer è al punto giusto.
- [ ] Fase 5 · Grafici: leggibilità su schermo piccolo (tema chiaro e scuro), tocco su un punto mostra il valore, tabella dei valori.

## Da decidere
- [ ] Stringere il firewall: una sola regola Allow per node.exe (profilo Private, solo TCP 5173). I comandi li esegue l'utente come amministratore.

## Prossime fasi
- [ ] Fase 5: codice completato (commit 1aa0679, 6a3cf8e, 6ab96ff, 76ee1b3). Manca la prova sul telefono, poi push (nessun push prima della conferma dell'utente).
- [ ] Fase 6: PWA (vite-plugin-pwa, icona), protezioni del repo (branch protection), repo pubblico con conferma, GitHub Actions + Pages. Valutare la notifica di fine recupero (vibra anche a telefono bloccato).
  - [ ] Prima della pubblicazione: export delle sedute registrate su localhost → import su teachertrip.github.io/allenamento.
  - [ ] Pacchetto JS ~181 KB compressi (Chart.js compreso): valutare il caricamento della schermata Grafici solo quando serve.
  - [ ] `globPatterns` deve includere `webp`; verificare che le 28 immagini (`public/esercizi/`, ~0,7 MB) entrino nel precache.
- [ ] Fase 7: verifica finale con checklist.

## A fine lavori sul telefono
- [ ] (Dopo le prove della Fase 5.) Spegnere "Debug USB", revocare le autorizzazioni di debug USB ("Consenti sempre da questo computer") e spegnere "Rimani attivo" nelle Opzioni sviluppatore.
- [ ] Facoltativo: riattivare o lasciare spenta "Vibrazione tattile".
- [ ] Cancellare dallo Storico le sedute salvate durante le prove (anche quelle col circuito), così i grafici partono da dati veri.
