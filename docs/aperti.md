# Punti aperti

Stato: app **pubblicata** su https://teachertrip.github.io/allenamento/ e installata sul telefono (versione con commit d66419b, Fase 7). **Fase 4-bis in corso sul ramo `fase-4bis`** (passi 1-5 fatti e provati sul telefono via USB, non pubblicati; cambio di piano del 20/11: niente editor). **Fase 7 chiusa il 20/11/2026**: checklist §10 completa (dettagli in `docs/storia.md`). Repository **pubblico**; protezioni GitHub attive (secret scanning + push protection, `main` protetto da force push e cancellazione, Issues/Projects/Wiki spenti).

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
- [ ] Passo 8: storico e grafici con due modelli. **Proposta mostrata il 20/11, in attesa dell'OK** (nessun codice):
  - difetti trovati: il menu dei Grafici segue il Modello 1 scritto nel codice (col Modello 2 mancano gb, ss, bdog, hfs, cr, cls e compaiono esercizi del Modello 1 «nessun dato»); serie settimanali e indici contano solo gli esercizi del Modello 1 (gb, ss, cr, cls, bdog oggi non contano); «Polpacci» sempre visibile;
  - proposta: menu per scheda attuale (ogni esercizio una volta, nella prima scheda) + «Altri esercizi con dati»; conteggio su tutto il catalogo (primario 1, secondario 0,5, extra comprese, 1 serie = 1 anche a un arto, mobilità esclusa, settimana lun-dom); gruppi muscolari visibili solo se allenati; kg sempre a 0 → solo «Ripetizioni totali» con frase di spiegazione, sedute miste con nota in legenda; frase «Le sedute a 0 kg non entrano nell'indice»; Storico raggruppato per id della scheda, schede non più attive come «Scheda A (schede precedenti)»;
  - da confermare: la frase per le sedute a 0 kg, «Scheda A (schede precedenti)», «Altri esercizi con dati».
- [ ] Passo 9 (ridotto): prova automatica — ogni esercizio del Modello 1 e del Modello 2 ha un file in `public/esercizi/` e l'immagine si carica nel browser (`naturalWidth > 0`). Se ne manca una: fermarsi e dire quale. Controllo dei file del 20/11: 26 esercizi, nessuna immagine mancante.
- [ ] Passo 10: rilascio (merge in `main` solo con conferma esplicita). Controlli a mano col telefono scollegato: schermo acceso durante il circuito, modalità aereo (`docs/rilascio-4bis.md`).
- [ ] Prima di aggiornare il telefono attuale: **backup esportato e verificato**, poi prova a secco (`dati-locali/` → `npm run prova-a-secco` → 0 differenze; controlla anche che «Separa i lati» risulti acceso; se lo storico è vuoto basta il backup). Rinviata il 20/11: storico del telefono ancora vuoto.

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
- [ ] **Prova instabile CI01** (protocollo del circuito): fallita 1 volta sotto carico il 20/11, poi sempre verde. **Se si ripete, va corretta prima del rilascio** (passo 10).
- [ ] `docs/piano-4bis.md` usa ancora «/lato» come abbreviazione nella tabella dei modelli (solo documentazione; l'app dice «per lato»).
- [ ] Stringere il firewall: una sola regola Allow per node.exe (profilo Private, solo TCP 5173). I comandi li esegue l'utente come amministratore.
- [ ] Valutare la notifica di fine recupero (vibra/suona anche a telefono bloccato).

## Limiti noti (nessuna azione prevista)
- "Ultimo backup" si aggiorna al tocco di "Esporta" anche se il download fallisce: l'app non può sapere se il file è stato salvato.
- La vibrazione richiede "Vibrazione tattile" attiva nelle impostazioni del telefono.
- Import del prototipo provato solo con dati inventati: l'utente non ha un backup vero.
