# Punti aperti

Stato: app **pubblicata** su https://teachertrip.github.io/allenamento/ con la **pubblicazione n. 10** del 21/11/2026 (merge 971a364 di `fix-spunta` in `main`: verifica della ✓; prima: ce93e43, n. 9, correzione del blocco su «Caricamento»). Rami `fix-spunta`, `fix-recupero` e `fase-4bis` conservati. Commit di chiusura del 21/11 (seconda sessione) solo locale su `main`: parte con la prossima pubblicazione. Repository **pubblico**; protezioni GitHub attive (secret scanning + push protection, `main` protetto da force push e cancellazione, Issues/Projects/Wiki spenti).

## Dopo la pubblicazione n. 9 (correzione del blocco su «Caricamento», 21/11/2026)
- [ ] Secondo telefono: disinstallare l'app di prova di `localhost:5173` e cancellare solo i dati di `localhost:5173` (Chrome → Impostazioni sito → Tutti i siti → localhost:5173 → Elimina e reimposta); poi reinstallare l'app pubblicata e usarla **solo dall'icona**.
- [ ] Telefono principale: «Aggiorna» alla versione n. 10 (Info: «versione 10 (971a364)»; nel primo allenamento controllare l'avviso «Mancano le ripetizioni» col ✓ su una serie senza ripetizioni), poi chiudere eventuali schede di Chrome con l'app (il lucchetto vale solo tra copie della versione nuova).
- [ ] Causa a monte del blocco non identificata con certezza (nessuna transazione dell'app poteva tenere occupate sedute e serie con 0 sedute; probabile attesa dentro Chrome, sparita col riavvio di Chrome). Se si ripresenta: debug USB, `docs/storia.md` del 21/11.
- [ ] Fase 5 in una sessione nuova: prima aggiornare `fase-5-drive` con `main` (che ora contiene la n. 10), poi il piano da approvare.

## Dopo la pubblicazione n. 10 (verifica della ✓, 21/11/2026)
- [ ] Sul telefono, nel primo allenamento dopo «Aggiorna»: una serie svuotata dopo la ✓ torna grigia; ricompilata torna verde senza un'altra ✓; su un push-up senza livello la ✓ dice «Manca il livello».
- Limite accettato: una serie confermata in una bozza di prima della pubblicazione n. 9 e rimasta incompleta torna verde appena la si completa, senza un'altra ✓ (la ✓ era già stata toccata allora); il recupero non riparte.

## Circuito facoltativo in A e B del Modello 1 (ramo `circuito-ab`, 21/11/2026)
- [x] Catalogo: A e B con il circuito facoltativo in fondo (stessi esercizi e protocolli della C); C e Modello 2 invariati; nessuna migrazione. Prove CA01-CA05. Prove: 248 Vitest + 167 Playwright (due passate), build, `npm run prova-aggiornamento` 2/2.
- [ ] Merge in `main` (= pubblicazione n. 11) solo dopo l'autorizzazione dell'utente.
- [ ] Dopo l'aggiornamento, sul telefono: Info → «Ricarica un modello» → Modello 1 (cancella le bozze; impostazioni e storico restano), poi controllare il circuito in fondo ad A e B.
- Nota: un'installazione di prima della Fase 4-bis che si aggiorna riceve A e B già con il circuito (la migrazione copia il catalogo attuale). Le schede già in un database non cambiano senza «Ricarica un modello».

## Da verificare a mano su un telefono vero (non provabili sul PC)
- [ ] **Schermo acceso durante il circuito col telefono SCOLLEGATO** dal PC: avviare il timer del circuito e non toccare il telefono per più del tempo di spegnimento dello schermo; deve restare acceso fino alla fine o a «Interrompi».
- [ ] **Modalità aereo reale**: attivarla, chiudere l'app e riaprirla dall'icona: si apre con immagini, schede, Storico e Grafici; una seduta si salva. Poi disattivarla.

## Da fare (utente)
- [ ] Lista privata di parole: risulta senza voci attive (solo vuoti/commenti), quindi il controllo delle parole personali non agisce. La compila l'utente; poi rilanciare il controllo su tutta la cronologia (stampa solo commit e file).
- [ ] Facoltativo: riattivare "Vibrazione tattile" sul telefono (senza, Chrome non vibra a fine recupero; restano i suoni). Se riattivata: una ✓ con recupero per controllare la vibrazione.

## Fase 4-bis + Modello 2 (piano approvato il 20/11/2026, ramo `fase-4bis`)
Piano: `docs/piano-4bis.md`. Rilascio: `docs/rilascio-4bis.md`.
- [x] Passo 1: catalogo + Modello 1 nel codice (app invariata)
- [x] Passo 2: logica pura (superset con serie diverse, recupero "–", 0 kg, mobilità, polpacci, valore di partenza)
- [x] Passo 3: database v2 + migrazione + schermata d'errore + backup v2 (prova di migrazione con confronto prima/dopo)
- [x] Passo 4: seduta guidata dalle schede del database
- [x] Passo 5 (20/11): primo avvio, Info, Ricarica un modello, Modello 2 anticipato, avviso Settimane 1-2, migrazione corretta (`phase1Since` vuoto senza sedute). Commit 3c722d5 (immagini), 52cd544 (codice), poi **rifatto col cambio di piano del 20/11**:
  - primo avvio in **una sola schermata** (modelli con immagini, riga Settimane 1-2, «Inizia»); via nome e lato dal primo avvio, via il nome da Info;
  - **«Separa i lati»** in Info: spento sulle installazioni nuove (un ✓ per serie, «per lato»), acceso dalla migrazione sulle esistenti; lato di partenza visibile solo se acceso; bloccato con un allenamento avviato; dati invariati;
  - via «Schede vuote» e ogni testo che rimandi a un editor.
  - `fake-indexeddb` **non** si installa (decisione del 20/11): la prova della transazione fallita resta in Playwright (F10).
  - [x] **Prova sul telefono via debug USB** (20/11, `npm run prova-usb`): tutto funzionante; difetti D1-D4 (tasti, segnaposto, avviso, a capo) corretti in 418ba3e. Prove: 202 Vitest + 122 Playwright, due passate verdi.
  - Requisiti del 20/11 già applicati: niente Modello 1 automatico (`ensurePrograms()` tolto); Settimane 1-2 (`phase1Since` dalla prima seduta salvata, avviso dopo 14 giorni con «Sì»/«Non ancora» a 7 giorni, riattivazione che azzera data e rinvio, nessun avviso con data vuota); Ricarica un modello (id generati, bloccata con allenamento avviato, storico separato); immagini dei modelli a 800 px.
- Passo 6: **eliminato** (cambio di piano del 20/11) → vedi «Idea futura» qui sotto.
- [x] Passo 7 (20/11): contenuto del Modello 2 confrontato con il piano (nessuna differenza); descrizioni e sottotitoli di A-D; «Settimana tipo», «Ogni giorno», «Regole» e scala dei push-up in Info secondo il modello (`src/catalog/infoTexts.ts`); catalogo neutro (parti del Modello 1 nelle note delle voci); forme neutre; voce della barra nel riscaldamento. Testi approvati in `docs/piano-4bis.md`.
- [x] Passo 8 (20/11): storico e grafici con due modelli (codice e4289b8). Proposta approvata con una modifica (etichette dello Storico):
  - **Storico** raggruppato per id della scheda: prima le schede attuali («Scheda A · 2 sedute»), poi quelle che non ci sono più, dalla più recente: «Scheda A — fino al gg/mm/aaaa» (data dell'ultima seduta del gruppo); se due gruppi hanno nome e data uguali: «Scheda A — dal gg/mm/aaaa al gg/mm/aaaa». Testi con `nb()`. Logica in `src/logic/history.ts`;
  - **menu dei Grafici** per scheda attuale («Seduta A», ogni esercizio una volta, nella prima scheda in cui compare) + «Altri esercizi con dati». Col Modello 2 la D non ha una voce propria (ripete esercizi di A-C): approvato;
  - **0 kg**: esercizio `kg` sempre a 0 kg → solo «Ripetizioni totali» e la frase «Tutte le sedute sono a 0 kg: il grafico mostra le ripetizioni totali. Con un carico compariranno anche e1RM e carico.»; sedute miste → in legenda «Le sedute a 0 kg non hanno e1RM (buco nella linea): per quelle conta il grafico «Ripetizioni totali».»; sotto l'indice (solo se il gruppo ha serie a 0 kg) «Le sedute a 0 kg non entrano nell'indice.»;
  - **gruppi muscolari** visibili solo se allenati (anche come secondari); solo allungamenti → «Nessuna serie che conti per i gruppi muscolari (gli allungamenti non contano).»; conteggio su tutto il catalogo (`CATALOG_EXERCISES`: primario 1, secondario 0,5, extra comprese, un arto = 1, mobilità esclusa, settimana lun-dom);
  - difetto trovato e corretto: il grafico a barre orizzontale scartava etichette con pochi gruppi → prova ST05 (verificata: fallisce sul codice vecchio);
  - prove: 230 Vitest + 131 Playwright, due passate verdi; build e gitleaks puliti.
- [x] Passo 9 (20/11): prova automatica `e2e/immagini-modelli.spec.ts` (IM01 file in `public/`, IM02 caricamento nel browser con `naturalWidth > 0`) per ogni esercizio del Modello 1 e del Modello 2, le due immagini dei modelli (`public/modelli/`), riscaldamento e circuito. Verificata togliendo per un momento `gb.webp`: entrambe falliscono e dicono quale file manca. Nessuna immagine mancante. Prove: 230 Vitest + 133 Playwright, due passate verdi.
- [x] Passo 10 (20/11): rilascio con il piano cambiato dall'utente (niente prove sul telefono, storico vuoto; tutte le prove nel browser del PC, merge solo se tutto verde):
  - controlli sul ramo: tsc, 230 Vitest, 133 Playwright, salute e dati personali, autori solo noreply;
  - **prova di aggiornamento reale** al posto della prova a secco: `npm run prova-aggiornamento` (versione d66419b installata col service worker → stessa porta e indirizzo con la versione nuova → «Aggiorna»): AG01 con una seduta (nessun primo avvio, A-B-C, «Separa i lati» acceso dal sinistro, seduta sotto «Scheda A», Grafici senza errori, valori grigi), AG02 storico vuoto (nessun primo avvio, Modello 1, nessun «Disattivarle?» 30 giorni dopo). Verificata facendola fallire (data di Settimane 1-2 scritta a mano → l'avviso compare). Due passate verdi;
  - merge `--no-ff` in `main` = 6f23f93; autori solo noreply; tsc, prove e build verdi su `main`; push; Actions n. 7 verde;
  - sito pubblicato con profilo pulito: primo avvio con le due immagini, Modello 2, barra A-D, goblet squat a 6 kg in grigio, immagini della scheda A, seduta salvata, Storico «Scheda A · 1 seduta», Grafici, Info con «Esempio» e «versione 7 (6f23f93)», nessun errore in console.
  - Restano i controlli a mano sul telefono vero (sezione in cima) e il secondo telefono.
  - Piano di rilascio originale (sostituito dal piano dell'utente del 20/11, qui sopra), 14 punti: (1) prove e controlli sul ramo, annotare `main` = 01f7f1f; (2-3) utente: screenshot dei Grafici, Info → Esporta backup, file in `dati-locali/`; (4) `npm run prova-a-secco` → 0 differenze, conteggio sedute confrontato dall'utente; (5) facoltativo: import del backup in Chrome in incognito; (6) `git switch main`, `git pull --ff-only`, `git merge --no-ff fase-4bis`, controllo autori noreply, prove e build, `git push origin main`; (7) Actions verde (`gh run watch`); (8) controllo del sito in incognito; (9-10) aggiornamento del telefono: nessun primo avvio, A-B-C, «Separa i lati» acceso, lato sinistro, Storico intatto, Grafici uguali; (11) secondo telefono: installazione, Modello 2, «Inizia»; (12) controlli a telefono scollegato; (13) verifica della versione pubblicata e documenti; (14) ritorno indietro: backup grezzo / Importa backup / `git revert -m 1` del merge + cancellare i dati del sito e importare il backup.
  - Punto 13 chiarito dall'utente: documentazione, commit e push di `main`.
- [x] Telefono attuale: storico vuoto, quindi niente backup né prova a secco (sostituite dalla prova di aggiornamento reale). Se in futuro un aggiornamento del database trovasse dati veri: backup + `npm run prova-a-secco` prima.

## Idea futura: Grafici caricati solo quando si aprono
Caricare il codice dei Grafici (e la libreria dei grafici) solo all'apertura della scheda Grafici, per un avvio più leggero. Fuori dalla Fase 4-bis: nessuna funzione nuova.

## Idea futura: editor delle schede (solo se servirà)
Tolto dalla Fase 4-bis il 20/11. Era: da 1 a 4 schede (rinomina, aggiungi, elimina); per ogni scheda riscaldamento, circuito, note e posizione; voci con ↑ ↓ ✕, «superset con il successivo», serie, range, recupero, partenza, attrezzo e note; esercizi già presenti disattivati nel catalogo; bloccato per la scheda con un allenamento in corso; prova con un nome di 6 lettere larghe («MMMMMM») nella barra a 360 px. Fino ad allora nessuna schermata, pulsante o testo deve farne capire l'esistenza.

## Prova sul telefono in Wi-Fi (facoltativa: la prova del passo 5 è stata fatta via USB)
1. Sul PC, nella cartella del progetto: `npm run dev -- --host` (il server si apre anche alla rete di casa).
2. Sul telefono, in Chrome (stessa rete Wi-Fi): `http://<indirizzo del PC>:5173/allenamento/`. L'indirizzo del PC lo mostra Vite nella riga «Network» (può cambiare da un giorno all'altro).
3. È un indirizzo **diverso** da quello dell'app installata (`https://teachertrip.github.io/allenamento/`): ogni indirizzo ha i suoi dati, quindi l'app installata e il suo storico **non vengono toccati**. Qui si parte da zero: compare il primo avvio.
4. **Limiti di http in rete locale**: niente service worker (quindi niente installazione, uso offline e avviso di aggiornamento) e niente Wake Lock (lo schermo si può spegnere, anche col circuito). La prova riguarda **solo l'interfaccia**.
5. Cosa controllare:
   - primo avvio: **una sola schermata**, senza nome né lato; le due immagini nitide; «Inizia» spento finché non si tocca un modello; testi leggibili a schermo stretto;
   - chiudere Chrome dopo aver toccato un modello ma prima di «Inizia», e riaprire: nessun modello scelto, «Inizia» spento;
   - Modello 2: barra A, B, C, D; nella seduta A goblet squat con 6 kg in grigio;
   - lati, interruttore **spento** (di serie): rematore, split squat, side plank… con un solo ✓ per serie, «per lato» accanto alle ripetizioni, nessun «sinistro/destro»;
   - Info → accendere **«Separa i lati»**: compare «Lato di partenza»; scegliere Destro → nella seduta i tasti sono [Dx] [Sx] e il testo dice «Parti dal lato destro»; rispegnere → torna un solo ✓;
   - con un allenamento avviato, in Info «Separa i lati» è bloccato e il messaggio dice quale scheda;
   - Info: interruttore Settimane 1-2 («La data parte dalla prima seduta salvata»); salvare una seduta → «Attive dal gg/mm»;
   - Info → «Ricarica un modello»: solo Modello 1 e Modello 2; tre pulsanti; con «Annulla» non cambia niente; con «Sostituisci» la barra torna A, B, C e lo Storico tiene la seduta di prima;
   - con un allenamento avviato, «Ricarica un modello» mostra il blocco con il nome della scheda.
6. Se Windows chiede il permesso del firewall per Node.js: solo reti **private**.

## Da decidere
- [x] **Prova instabile CI01** (protocollo del circuito): rifallita il 21/11 (2 su 30 ripetizioni sotto carico). Causa: il pulsante si accende subito, la scrittura nel database arriva poco dopo e la prova ricaricava prima. Corretta la prova (aspetta il valore nel database): 0 su 60. App invariata.
- [ ] `docs/piano-4bis.md` usa ancora «/lato» come abbreviazione nella tabella dei modelli (solo documentazione; l'app dice «per lato»).
- [ ] Stringere il firewall: una sola regola Allow per node.exe (profilo Private, solo TCP 5173). I comandi li esegue l'utente come amministratore.
- [ ] Valutare la notifica di fine recupero (vibra/suona anche a telefono bloccato).

## Limiti noti (nessuna azione prevista)
- "Ultimo backup" si aggiorna al tocco di "Esporta" anche se il download fallisce: l'app non può sapere se il file è stato salvato.
- La vibrazione richiede "Vibrazione tattile" attiva nelle impostazioni del telefono.
- Import del prototipo provato solo con dati inventati: l'utente non ha un backup vero.
