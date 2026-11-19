# Punti aperti

Stato: app **pubblicata il 19/11/2026** su https://teachertrip.github.io/allenamento/ e installata sul telefono. Repository **pubblico**; protezioni GitHub attive (secret scanning + push protection, `main` protetto da force push e cancellazione, Issues/Projects/Wiki spenti).

## Da decidere
- [ ] Stringere il firewall: una sola regola Allow per node.exe (profilo Private, solo TCP 5173). I comandi li esegue l'utente come amministratore.

## Prossime fasi
- [ ] Fase 7: verifica finale con la checklist (PROMPT.md §10), test sul telefono uno per uno. **Si riparte dalla prova 9.**
  - Prove 2-8 e 10 fatte dal PC comandando l'app sul telefono (debug USB + collegamento di debug di Chrome con Playwright; screenshot con adb, solo nella cartella temporanea).
  - Checklist §10:
    - [x] 1 seduta A: 2 serie con ✓ + 1 senza ✓ → Termina → telefono riavviato: storico con 2 serie (19/11/2026, verificato anche nel database)
    - [x] 2 riapertura della seduta: valori precompilati in corsivo grigio, ✓ tratteggiata, legenda e riga "Ultima volta"
    - [x] 3 serie non confermate non salvate (nel database solo le 2 confermate)
    - [x] 4 modalità aereo: app riaperta da zero senza rete, 11/11 immagini, grafico visibile, seduta salvata
    - [x] 5 grafico esercizio: partenza, attuale, differenza kg e %. **Bug trovato e corretto:** la % era calcolata sulla differenza arrotondata (+65% invece di +64%); nuova prova in `tests/charts.test.ts`
    - [x] 6 grafico gruppo muscolare: indice normalizzato (100 → 164,1) e serie settimanali corretti
    - [x] 7 export (file nei Download del telefono) → 3 sedute eliminate dallo Storico → import: dati identici a prima, precompilazione tornata
    - [x] 8 import di un backup del prototipo **inventato**: valori convertiti, "non interpretati" nelle note, doppione saltato al secondo import
    - [ ] 9 timer di recupero e del circuito: suono e vibrazione (serve l'utente: suono e vibrazione non si verificano dal PC)
    - [x] 10 app installata, a schermo intero (display-mode standalone, nessuna barra di Chrome)
  - Osservazioni dalle prove (da decidere):
    - [ ] Dopo "Termina e salva" il timer di recupero resta acceso (partito dall'ultima ✓): fermarlo al salvataggio?
    - [ ] Secondo import dello stesso backup del prototipo: "Importate 0 sedute" ma anche "1 valori non interpretati" (l'avviso conta pure le sedute saltate).
    - [ ] "Ultimo backup" si aggiorna al tocco di "Esporta" anche se il download fallisce (l'app non può saperlo; limite noto).
    - [ ] Import di un backup **vero** del prototipo: solo se l'utente ne ha uno.
    - [x] 11 solo email noreply (19/11/2026: 24 commit locali, 23 su GitHub, autore e committer)
    - [x] 12 il pre-commit blocca `test-backup.json` (bloccato anche da `.gitignore`; file cancellato)
    - [x] 13 nessun backup/`.env`/dato personale su GitHub (file attuali e cronologia; gitleaks ok; tolto il modello del telefono dai file attuali)
    - [x] 14 secret scanning e push protection attivi
  - [ ] Lista privata di parole: risulta senza voci attive (solo vuoti/commenti), quindi il controllo delle parole personali non agisce. La compila l'utente; poi rilanciare il controllo su tutta la cronologia (stampa solo commit e file).
  - [ ] app installata aperta senza rete (modalità aereo): si apre con immagini e grafici (insieme al punto 4).
  - Punto 9: la vibrazione richiede "Vibrazione tattile" attiva (limite noto); con l'impostazione spenta contano i suoni.- [ ] Valutare la notifica di fine recupero (vibra anche a telefono bloccato).

## A fine lavori sul telefono
- [ ] Cancellare dallo Storico tutte le sedute registrate durante le prove della Fase 7.
- [ ] Spegnere "Debug USB", revocare le autorizzazioni di debug USB ("Consenti sempre da questo computer") e spegnere "Rimani attivo" nelle Opzioni sviluppatore.
- [ ] Facoltativo: riattivare o lasciare spenta "Vibrazione tattile".
