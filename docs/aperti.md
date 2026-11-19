# Punti aperti

Stato: app **pubblicata il 19/11/2026** su https://teachertrip.github.io/allenamento/ e installata sul telefono. Repository **pubblico**; protezioni GitHub attive (secret scanning + push protection, `main` protetto da force push e cancellazione, Issues/Projects/Wiki spenti).

## Da decidere
- [ ] Stringere il firewall: una sola regola Allow per node.exe (profilo Private, solo TCP 5173). I comandi li esegue l'utente come amministratore.

## Prossime fasi
- [ ] Fase 7: verifica finale con la checklist (PROMPT.md §10), test sul telefono uno per uno.
  - Checklist §10:
    - [ ] 1 seduta registrata → app chiusa → telefono riavviato: storico presente
    - [ ] 2 riapertura della seduta: serie precompilate e riconoscibili
    - [ ] 3 serie non confermate non salvate
    - [ ] 4 modalità aereo: l'app si apre e salva
    - [ ] 5 grafico esercizio: partenza, attuale, differenza kg e %
    - [ ] 6 grafico gruppo muscolare: indice normalizzato e serie settimanali
    - [ ] 7 export → cancello i dati → import: tutto come prima
    - [ ] 8 import del backup del prototipo
    - [ ] 9 timer di recupero e del circuito: suono e vibrazione
    - [ ] 10 app installata, a schermo intero
    - [x] 11 solo email noreply (19/11/2026: 24 commit locali, 23 su GitHub, autore e committer)
    - [x] 12 il pre-commit blocca `test-backup.json` (bloccato anche da `.gitignore`; file cancellato)
    - [x] 13 nessun backup/`.env`/dato personale su GitHub (file attuali e cronologia; gitleaks ok; tolto il modello del telefono dai file attuali)
    - [x] 14 secret scanning e push protection attivi
  - [ ] Lista privata di parole: risulta senza voci attive (solo vuoti/commenti), quindi il controllo delle parole personali non agisce. La compila l'utente; poi rilanciare il controllo su tutta la cronologia (stampa solo commit e file).
  - [x] avviso "Nuova versione disponibile" (19/11/2026, telefono, versioni 2 e 3): "Aggiorna" funziona; con allenamento avviato compare l'avviso senza pulsante, dopo averlo terminato si aggiorna;
  - [ ] app installata aperta senza rete (modalità aereo): si apre con immagini e grafici.
- [ ] Valutare la notifica di fine recupero (vibra anche a telefono bloccato).

## A fine lavori sul telefono
- [ ] Spegnere "Debug USB", revocare le autorizzazioni di debug USB ("Consenti sempre da questo computer") e spegnere "Rimani attivo" nelle Opzioni sviluppatore.
- [ ] Facoltativo: riattivare o lasciare spenta "Vibrazione tattile".
