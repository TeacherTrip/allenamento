# Punti aperti

Stato: app **pubblicata** su https://teachertrip.github.io/allenamento/ e installata sul telefono (versione con commit d66419b, Fase 7). **Fase 4-bis in corso sul ramo `fase-4bis`** (passi 1-5 fatti, non pubblicati). **Fase 7 chiusa il 20/11/2026**: checklist §10 completa (dettagli in `docs/storia.md`). Repository **pubblico**; protezioni GitHub attive (secret scanning + push protection, `main` protetto da force push e cancellazione, Issues/Projects/Wiki spenti).

## Da fare (utente)
- [ ] Lista privata di parole: risulta senza voci attive (solo vuoti/commenti), quindi il controllo delle parole personali non agisce. La compila l'utente; poi rilanciare il controllo su tutta la cronologia (stampa solo commit e file).
- [ ] Facoltativo: riattivare "Vibrazione tattile" sul telefono (senza, Chrome non vibra a fine recupero; restano i suoni). Se riattivata: una ✓ con recupero per controllare la vibrazione.

## Fase 4-bis + Modello 2 (piano approvato il 20/11/2026, ramo `fase-4bis`)
Piano: `docs/piano-4bis.md`. Rilascio: `docs/rilascio-4bis.md`.
- [x] Passo 1: catalogo + Modello 1 nel codice (app invariata)
- [x] Passo 2: logica pura (superset con serie diverse, recupero "–", 0 kg, mobilità, polpacci, valore di partenza)
- [x] Passo 3: database v2 + migrazione + schermata d'errore + backup v2 (prova di migrazione con confronto prima/dopo)
- [x] Passo 4: seduta guidata dalle schede del database
- [x] Passo 5 (20/11, commit 3c722d5 immagini + 52cd544 codice): primo avvio, Info, Ricarica un modello, Modello 2 anticipato, avviso Settimane 1-2, migrazione corretta (`phase1Since` vuoto senza sedute). Prove: 194 Vitest + 110 Playwright.
  - [ ] **Da decidere:** la prova «transazione fallita a metà» è in Playwright (F10, vero IndexedDB di Chrome). Per averla anche in Vitest serve il pacchetto `fake-indexeddb` (solo per le prove): installarlo?
  - [ ] **Prova sul telefono in Wi-Fi** (istruzioni sotto, «Prova del passo 5 sul telefono»), prima del passo 6.
  - Testo originale della voce: primo avvio + Info + Ricarica un modello, con le schede dei modelli illustrate (`immagini-originali/modelli/` → `public/modelli/*.webp`, in precache, testi neutri; prova con `naturalWidth > 0` e scelta del Modello 2; anteprima all'utente prima del commit)
  - **Aggiunte del 20/11 (da fare nel passo 5):**
  1. Togliere la soluzione provvisoria (`ensurePrograms()`): un'installazione nuova NON riceve più il Modello 1 automatico, compare il primo avvio. Prove: profilo pulito → primo avvio visibile → nessuna scheda creata finché non si preme «Inizia»; database v1 migrato → nessun primo avvio (M1 resta verde).
  2. Settimane 1-2:
     - su un'installazione nuova restano attive di serie; nel primo avvio una riga lo spiega: «Le prime 2 settimane: 2 serie per esercizio. Si cambia in Info.»;
     - `phase1Since` = data della prima seduta salvata, non del primo avvio;
     - 14 giorni dopo `phase1Since`, se sono ancora attive, nella seduta compare l'avviso «Settimane 1-2 attive da 2 settimane. Disattivarle?» con «Sì» (le spegne) e «Non ancora» (riappare dopo 7 giorni). Mai spegnimento automatico;
     - prove Vitest per la logica dell'avviso (date finte) + una prova Playwright per «Sì».
     - Se Settimane 1-2 viene riattivato da Info, `phase1Since` diventa la data della prima seduta salvata dopo la riattivazione, e il rinvio del «Non ancora» si azzera.
  3. Ricarica un modello: schede nuove sempre con id generati; bloccata se c'è un allenamento avviato; dopo la ricarica lo storico resta raggruppato sotto i nomi vecchi (prova già prevista).
  4. Immagini dei modelli: conversione a 800 px; anteprima e pesi mostrati all'utente prima del commit.
  5. Alla fine del passo 5, prima del 6: istruzioni per provare l'app sul telefono in Wi-Fi con il server locale (indirizzo, comando, cosa controllare), confermando che quell'indirizzo è diverso da quello dell'app installata, quindi i suoi dati non vengono toccati.
- [ ] Passo 6: editor delle schede (+ prova con un nome di 6 lettere larghe, es. «MMMMMM», nella barra a 360 px)
- [ ] Passo 7: prove e controllo del contenuto del Modello 2 (contenuto già nel codice dal passo 5)
- [ ] Passo 8: storico e grafici (togliere «Polpacci» dai grafici quando nessuna scheda lo allena: oggi barra a 0 per il Modello 1). Il menu dei grafici raggruppa ancora gli esercizi secondo il Modello 1 scritto nel codice: con il Modello 2 gli esercizi nuovi non ci sono ancora (nessun errore).
- [ ] Da decidere (passo 6 o 7): in Info «Settimana tipo», «Ogni giorno», alcune «Regole» e la scala dei push-up sono scritte per il Modello 1 (giorni A/B/C, RIR 2, 14 kg). Con il Modello 2 vanno adattate o legate al modello.
- [ ] Passo 9: segnaposto immagini
- [ ] Passo 10: rilascio (merge in `main` solo con conferma esplicita)
- [ ] Prima di aggiornare il telefono attuale: **backup esportato e verificato**, poi prova a secco (`dati-locali/` → `npm run prova-a-secco` → 0 differenze; se lo storico è vuoto basta il backup). Rinviata il 20/11: storico del telefono ancora vuoto.

## Prova del passo 5 sul telefono (Wi-Fi, server locale)
1. Sul PC, nella cartella del progetto: `npm run dev -- --host` (il server si apre anche alla rete di casa).
2. Sul telefono, in Chrome (stessa rete Wi-Fi): `http://<indirizzo del PC>:5173/allenamento/`. L'indirizzo del PC lo mostra Vite nella riga «Network» (può cambiare da un giorno all'altro).
3. È un indirizzo **diverso** da quello dell'app installata (`https://teachertrip.github.io/allenamento/`): ogni indirizzo ha i suoi dati, quindi l'app installata e il suo storico **non vengono toccati**. Qui si parte da zero: compare il primo avvio.
4. **Limiti di http in rete locale**: niente service worker (quindi niente installazione, uso offline e avviso di aggiornamento) e niente Wake Lock (lo schermo si può spegnere, anche col circuito). La prova riguarda **solo l'interfaccia**.
5. Cosa controllare:
   - primo avvio: tre passi, le due immagini nitide, testi leggibili a schermo stretto, «Indietro» funziona;
   - chiudere Chrome a metà del primo avvio e riaprire: si riparte da «Passo 1 di 3»;
   - Modello 2: barra A, B, C, D; nella seduta A goblet squat con 6 kg in grigio;
   - Info: nome, lato (i tasti Sx/Dx nella seduta cambiano ordine), interruttore Settimane 1-2 («La data parte dalla prima seduta salvata»);
   - salvare una seduta: in Info compare «Attive dal gg/mm»;
   - Info → «Ricarica un modello» → Modello 1: tre pulsanti; con «Annulla» non cambia niente; con «Sostituisci» la barra torna A, B, C e lo Storico tiene la seduta di prima;
   - con un allenamento avviato, «Ricarica un modello» mostra il blocco con il nome della scheda.
6. Se Windows chiede il permesso del firewall per Node.js: solo reti **private**.

## Da decidere
- [ ] Stringere il firewall: una sola regola Allow per node.exe (profilo Private, solo TCP 5173). I comandi li esegue l'utente come amministratore.
- [ ] Valutare la notifica di fine recupero (vibra/suona anche a telefono bloccato).

## Limiti noti (nessuna azione prevista)
- "Ultimo backup" si aggiorna al tocco di "Esporta" anche se il download fallisce: l'app non può sapere se il file è stato salvato.
- La vibrazione richiede "Vibrazione tattile" attiva nelle impostazioni del telefono.
- Import del prototipo provato solo con dati inventati: l'utente non ha un backup vero.
