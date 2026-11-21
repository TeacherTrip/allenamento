# Diario del progetto TeacherGym

## 2026-11-19

**Fatto**
- Fase 0: domande e decisioni (Android/Chrome, backup manuale, grafici e1RM, tema automatico, icona manubrio + "TG", immagini rimandate).
- Fase 1: ambiente (Node, Git, gh con login).
- Fase 2: repo git, identità noreply locale "TeacherGym", `.gitignore`, `.gitattributes`, hook di pre-commit (gitleaks + backup + email + lista privata di parole), comando `/chiudi`.
- Fase 3: piano approvato (`docs/piano.md`), con elastici "assistenza"/"resistenza" e indice di progressione.
- Fase 4 (MVP): scheda nel codice, database Dexie, sedute A/B/C con precompilazione, storico modificabile, backup/import (anche dal prototipo), cronometro della seduta, recupero automatico e manuale, schermo sempre acceso (dove supportato).
- Prove automatiche: 35 Vitest + 57 Playwright, anche sull'indirizzo di rete non sicuro (`E2E_BASE_URL`).
- Diagnosi sul telefono Android (Chrome) via adb + DevTools:
  - a schermo bloccato la pagina è nascosta e "Via!" si chiudeva prima dello sblocco;
  - in sviluppo, allo sblocco il server ricarica la pagina;
  - la vibrazione funziona solo con "Vibrazione tattile" attiva (limite del sistema del telefono).
- Correzioni dal telefono:
  - "Via!" grande e centrato, per 4 s dopo lo sblocco;
  - 4 bip;
  - due tasti [Sx] [Dx] per gli esercizi a lati separati;
  - "+ Serie" (serie extra);
  - avviso unico se lo schermo può spegnersi;
  - corretto lo sfarfallio al cambio di scheda.

**Decisioni**
- Dead bug e curl alternato: un solo ✓ "reps per lato"; [Sx][Dx] solo per bulgarian, rematore, stacco a una gamba, military press e side plank.
- Serie extra: salvate solo se confermate, segnate "extra", escluse dal suggerimento di progressione.
- Vibrazione: si lascia spenta "Vibrazione tattile"; bastano 4 bip + "Via!". La notifica di fine recupero va valutata in Fase 6 (HTTPS).
- Repo GitHub collegato ma ancora privato.

**Commit:** cd7714b, 45b9ff5, 616387d, 08496f6, 80aa5e2 (+ commit di chiusura sessione).

## 2026-11-19 (seconda sessione)

- Immagini di riferimento per i 20 esercizi della scheda, i 5 del riscaldamento e i 4 del circuito (generate dall'utente con Google Flow).
  - `immagini-originali/` esclusa da Git (prima di ogni altra operazione).
  - `scripts/ottimizza-immagini.mjs` (`npm run immagini`, sharp come devDependency): WebP qualità 80, senza metadati (C2PA/EXIF/XMP tolti, verificato), nessun ritaglio.
  - Risultato: da 8,7 MB a 0,70 MB in totale, 25,7 KB di media, massimo 47 KB (`cx-climber`).
- Riscaldamento e circuito diventano elenchi con id (`wu-*`, `cx-*`); `wu-pa` riusa l'immagine `pa`.
- Interfaccia:
  - miniatura accanto al nome, su "cartoncino" bianco con bordo (leggibile anche in tema scuro);
  - tap → tutto schermo; chiusura con tap o Indietro attraverso la cronologia (`pushState` + `popstate`, senza passi vuoti);
  - immagine mancante: nessun riquadro rotto.
- Prove nuove: Vitest (ogni voce ha il suo `.webp`, nessun file orfano) e Playwright I01-I06. Totale 67 Vitest + 63 Playwright, tutte verdi. Build e preview verificate sotto `/allenamento/`.
- Prove sul telefono tutte superate: recupero a schermo acceso e bloccato, Sx/Dx, "+ Serie", immagini. **Fase 4 chiusa.**

**Decisioni**
- Immagini a 1200×896 senza ridimensionare (a 800 px sarebbero sfocate a tutto schermo). Soglie di avviso: 150 KB per file, 4 MB in totale.
- Immagine grande durante il timer del circuito → Fase 5.
- Precache delle immagini (`globPatterns` con `webp`) → Fase 6, con vite-plugin-pwa.
- Prova Vitest con `import.meta.glob` invece di `node:fs`, per non installare `@types/node`.

**Commit:** 7e2dd83, 1555f6e (+ commit di chiusura sessione).

## 2026-11-19 (terza sessione) — Fase 5

- **Timer del circuito** (seduta C), a tutto schermo:
  - scelta del protocollo (Sett. 1-2 / 3-4 / 5-6 / 7+), ricordata;
  - 5 s di preparazione, lavoro/pausa, rotazione dei 4 esercizi con immagine grande (in pausa: il prossimo);
  - bip 3-2-1 a fine fase, suoni e vibrazione diversi per lavoro, pausa e fine;
  - Pausa/Riprendi, Interrompi con conferma, tasto Indietro gestito;
  - tempo calcolato dagli orari salvati nella bozza: sopravvive a ricaricamento e telefono bloccato;
  - round completati registrati nella seduta e nello storico.
- **Grafici** (Chart.js, installato nel progetto):
  - per esercizio: Partenza → Attuale con differenza e %; kg = e1RM + carico della serie migliore; elastici/livelli = gradino (orientato secondo la direzione) + ripetizioni totali in due grafici separati; corpo libero/tempo = totali;
  - per gruppo muscolare: serie della settimana, indice di progressione (100 = prima seduta), serie settimanali delle ultime 8 settimane;
  - tabella dei valori sotto ogni grafico; colori controllati con il validatore (chiaro e scuro); screenshot verificati.
- Hook pre-commit: già bloccava se gitleaks manca (provato in Git Bash e PowerShell); messaggio reso più chiaro. Prova con `test-backup.json`: bloccato.
- Avvisi: in Info "dati legati all'indirizzo dell'app" (esportare e importare il backup); nel circuito "non bloccare il telefono".
- Prove: 90 Vitest + 78 Playwright, tutte verdi.

**Decisioni**
- Circuito a tutto schermo, avvisi sonori completi, indipendente dal cronometro della seduta.
- Mai due scale sullo stesso grafico: livello e ripetizioni in grafici separati.
- gitleaks e adb sono già nel PATH utente: nessuna modifica al sistema; percorso esplicito nell'hook scartato (conterrebbe il nome della cartella utente).
- Push rimandato a dopo la prova sul telefono (richiesta dell'utente).

**Commit:** 1aa0679, 6a3cf8e, 29a0d1b, 6ab96ff, 76ee1b3 + chiusura a8fd679.

**Pubblicazione (correzione):** alla chiusura (a8fd679, ore 22:26) la Fase 5 era davvero solo in locale, come diceva il report. Il push è avvenuto **subito dopo, nella sessione successiva**:
1. 22:26 · commit di chiusura a8fd679 ("push in attesa della prova sul telefono");
2. nuova sessione: telefono collegato con adb, l'utente conferma "tutto ok" e chiede il push;
3. 22:28 · push dei 6 commit 1aa0679 → a8fd679 (repo ancora **privato**), dopo il controllo noreply;
4. 22:28 · push di e4252cb (note aggiornate: Fase 5 provata e pubblicata).
Orari presi da `git reflog show origin/main`.

## 2026-11-19 (quarta sessione) — Fase 6: pubblicazione

- **PWA** (vite-plugin-pwa 2.0.0, nel progetto):
  - manifest (nome, `start_url`/`scope` `/allenamento/`, standalone, icone 192/512 + maskable);
  - icona manubrio + "TG" generata da un solo SVG (`npm run icone`), contenuto dentro la zona sicura della maskable;
  - precache di tutta l'app: 39 file, 1,28 MB, compresi i 28 `.webp` degli esercizi (0,70 MB); tolti i doppioni di favicon e icone;
  - aggiornamento solo a richiesta ("Nuova versione disponibile" → Aggiorna / Dopo), **mai** durante allenamento, recupero o circuito;
  - schermata Grafici caricata a parte: JS iniziale da ~181 a ~118 KB compressi.
- Prove: 4 Playwright sulla versione costruita (manifest e icone, offline con immagini e grafici, precache completo senza doppioni, nessun avviso al primo avvio). Totale 90 Vitest + 82 Playwright.
- Hook pre-commit: bloccato un commit per `i@izs.me` (email pubblica dell'autore di `glob`, scritta da npm in package-lock). Con l'utente: eccezione **solo per quell'indirizzo intero** (`grep -x -F`). Provato con email inventate: un indirizzo qualunque, uno con una lettera in più davanti e uno con un dominio più lungo restano bloccati; passa solo l'indirizzo esatto (anche in maiuscolo).
- Controlli §6-bis su tutta la cronologia prima di renderla pubblica: 19 commit tutti noreply; gitleaks nessun segreto; nessun backup/`.env`; nessuna email esterna.
- **GitHub, un passo alla volta con conferma dell'utente:**
  1. repository reso **pubblico**;
  2. secret scanning + push protection attivi;
  3. Issues, Projects e Wiki spenti;
  4. `main` protetto: niente force push né cancellazione, anche per l'amministratore;
  5. Pages attivo con sorgente GitHub Actions;
  6. 22:52 · push di 6b0dec7, 204bff9, c5b28fa → workflow `pubblica.yml` (npm test + build + deploy) riuscito.
- **App pubblicata il 19/11/2026** su https://teachertrip.github.io/allenamento/. Verificata: pagina, manifest, service worker e 28/28 immagini sotto `/allenamento/esercizi/`; in Chrome (Pixel 7) si apre, funziona offline, nessun errore.
- L'utente ha installato l'app sul telefono; nessun dato da importare.

**Decisioni**
- Conferma dell'utente prima di ogni modifica su GitHub (visibilità, impostazioni, push).
- Nel workflow girano tipi + Vitest; Playwright solo sul PC.
- Eccezioni nell'hook solo per indirizzi interi e con l'utente.

**Commit:** 6b0dec7, 204bff9, c5b28fa, c60db2a, d458394, 02d7431.

## 2026-11-19 (quarta sessione, seguito) — avvio Fase 7

- **Versione in Info**: "TeacherGym · versione N (commit)", scritta da GitHub Actions (`VITE_BUILD_NUMBER`, `VITE_COMMIT`); in locale "sviluppo locale". Ogni pubblicazione cambia davvero l'app. Prova Playwright dedicata (83 in totale).
- **Prova dell'aggiornamento sul telefono, superata**: versione 2 → "Aggiorna" funziona; versione 3 pubblicata con allenamento avviato → avviso senza pulsante; dopo aver terminato → aggiornata; Info mostra "versione 3 (044f35a)". Seduta di prova eliminata dall'utente.
- **Fase 7, controlli dal PC (checklist §10, punti 11-14) superati**:
  - 11: autori e committer solo noreply (24 commit locali, 23 su GitHub via API);
  - 12: `test-backup.json` fermato da `.gitignore` e, forzato con `git add -f`, bloccato dall'hook; poi cancellato;
  - 13: nessun backup/`.env`/`.local`/`PROMPT.md` su GitHub, né oggi né nella cronologia; gitleaks ok; ricerca di indizi di dati personali: solo falsi allarmi;
  - 14: secret scanning e push protection `enabled`.
- Controllo con la lista privata di parole (con il consenso dell'utente, stessa pulizia dell'hook, parole mai stampate): la lista ha **0 voci attive**, quindi il controllo non è eseguibile e l'hook non ha mai bloccato parole.
- Modello del telefono tolto da tutti i file attuali (anche il nome del sistema), su richiesta dell'utente; resta nella cronologia già pubblicata (nessuna riscrittura: `main` protetto).

**Decisioni**
- Il modello del telefono non va scritto nei file versionati.
- Cronologia pubblicata non riscritta per il modello del telefono (non identifica una persona).
- Le sedute delle prove sul telefono si cancellano alla fine della Fase 7.

**Commit:** 044f35a, 95107d6, bbcbe5c (+ commit di chiusura sessione).

## 2026-11-19/20 (quinta sessione) — Fase 7 completata

- **Prova 1** fatta dall'utente (seduta A, riavvio del telefono, Storico ok). **Prove 2-8 e 10** fatte dal PC comandando l'app installata sul telefono: debug USB + collegamento di debug di Chrome (CDP) con Playwright, screenshot con adb. I tocchi via adb erano bloccati dal telefono (`INJECT_EVENTS`). Screenshot e copie dei file solo nella cartella temporanea, cancellati a fine sessione.
  - Effetti del collegamento da tenere presenti: Playwright forza il tema chiaro (risolto con `emulateMedia({ colorScheme: null })`) e dirotta i download verso il PC (risolto con `Browser.setDownloadBehavior: default`); la tastiera aperta sposta i clic (si chiude prima con `blur()`).
  - Esiti: 2 serie salvate e 1 non confermata scartata (anche nel database); offline con 11/11 immagini, grafico e salvataggio; grafici esercizio e gruppo corretti; export → cancellazione → import identico a prima; import di un backup del prototipo **inventato** con doppione saltato; app in modalità standalone.
- **Prova 9** fatta dall'utente (il PC non può dare un gesto reale, e senza Chrome blocca suoni e vibrazione): suoni ok a fine recupero, nel conto alla rovescia e al cambio esercizio del circuito; vibrazione assente perché "Vibrazione tattile" è spenta (letto via adb, non modificato).
- **Bug corretti** (ognuno con una prova automatica):
  - % del riepilogo grafici calcolata sulla differenza arrotondata (+65% invece di +64%);
  - "Termina e salva" lasciava acceso il recupero partito dall'ultima ✓ (prove R07-R08);
  - secondo import dello stesso backup del prototipo: "Importate 0 sedute" + "1 valori non interpretati". Verificato che anche il primo import segnalava lo stesso valore (lettura identica); l'avviso contava anche le sedute saltate. Ora avvisi solo per le sedute aggiunte e "Nessuna seduta nuova: 1 già presente, saltata." (3 test unitari + P20).
- **Cambio richiesto dall'utente**: scrivere kg/ripetizioni non conferma più la serie; conferma solo il tasto ✓, che avvia il recupero. Una serie già confermata resta confermata se si corregge un valore. Legenda e avviso di fine seduta aggiornati; aggiornata anche la riga 46 di PROMPT.md; 28 prove riscritte (helper `logSet` = scrivi + ✓).
- Push dopo il controllo delle email (solo noreply); workflow verde; nuova versione verificata sul sito e sul telefono dall'utente.
- Pulizia: sedute di prova, bozze, backup di prova nei Download e debug USB sistemati dall'utente sul telefono; collegamento di debug e file temporanei rimossi dal PC.
- Prove: 94 Vitest + 86 Playwright, verdi.

**Decisioni**
- La serie si conferma solo con ✓ (non scrivendo); la ✓ avvia il recupero.
- Il recupero si ferma al salvataggio della seduta (continua se il salvataggio viene annullato).
- Prova 9 sempre a mano dall'utente: un timer avviato via debug falserebbe suono e vibrazione.
- Nessun backup vero del prototipo da importare: punto chiuso.
- Le pulizie sul telefono le fa l'utente.

**Commit:** 69ab15a, 7a7f9b4, 1a70ca5, d66419b (+ commit di chiusura sessione).

## 2026-11-20 (pomeriggio) — Fase 4-bis: piano e passi 1-4 (ramo `fase-4bis`)
- **Nuovo requisito**: l'app va anche su un secondo telefono Android con un'altra scheda (niente profili: ogni dispositivo ha i suoi dati). Catalogo esercizi nel codice, schede componibili in IndexedDB, modelli (Modello 1 = schede di prima, Modello 2, schede vuote), primo avvio, impostazioni in Info. Piano approvato con correzioni → `docs/piano-4bis.md`; checklist di rilascio → `docs/rilascio-4bis.md`.
- **Ramo `fase-4bis`**: verificato che il push del ramo non pubblica (workflow solo su `main` + ambiente `github-pages` limitato a `main`); workflow non modificato. `/chiudi` in questa fase spinge solo il ramo.
- **Passo 1**: catalogo (20 esercizi di prima con id invariati + `gb`, `ss`, `bdog`, `hfs`, `cr`, `cls`; gruppo `polpacci`; `hfs` = mobilità) e Modello 1 nel codice. Copia della scheda di prima in `tests/fixtures/scheda-v1.json` e prova campo per campo. Note del catalogo senza lato di partenza. Immagini dei 6 nuovi esercizi (1200 × 896 → WebP); `gb.jpg` era inizialmente una copia identica di `wu-bridge.jpg` (stessa impronta), poi sostituita dall'utente con quella dedicata. Precache: 45 voci, ~1,43 MB.
- **Passo 2**: logica pura con prove — superset con serie diverse (recupero del blocco dopo il giro), recupero "–", 0 kg (e1RM vuoto, grafico ripetizioni, niente % da 0), mobilità esclusa da serie settimanali e indici, valore di partenza.
- **Passo 3**: Dexie versione 2 (tabella `programs`). Upgrade che solo aggiunge (schede A/B/C, `programName` e `plan` alle sedute, impostazioni mancanti), idempotente, in un'unica transazione (se fallisce il database resta v1). Schermata d'errore con "Scarica backup grezzo", avvisi "Chiudi le altre schede" / "Ricarica". Backup formato 2 (con le schede; i v1 restano importabili). Prova M1 con confronto PRIMA/DOPO dei valori calcolati, M3 con migrazione forzata a fallire. Prova a secco sui dati reali (`npm run prova-a-secco`, `dati-locali/` esclusa da Git e bloccata dal pre-commit): collaudata con dati inventati; quella reale è rinviata perché lo storico del telefono è vuoto.
- **Passo 4**: la seduta legge le schede dal database (barra dinamica, copia della scheda in ogni seduta salvata, superset per blocchi, recupero "–", valore di partenza, note della voce e della scheda, lato di partenza, scheda vuota, circuito facoltativo). Trovato e corretto: a 360 px con 4 schede i pulsanti della barra erano 46 × 42 px e "Gambe1" usciva dal bordo → margini più stretti, altezza minima 48 px, carattere 12 px con 7 pulsanti (prova D08).
- Prove: da 94 Vitest + 86 Playwright a **172 + 100**, tutte verdi.

**Decisioni**
- Bozze: tabella `drafts` invariata, la chiave `day` contiene l'id della scheda; anche `Session.day`. Id `A`/`B`/`C` solo dalla migrazione, ogni scheda nuova ha un id generato (anche se si chiama «A»).
- Carico `kg` = per manubrio (verificato nell'import del prototipo).
- Superset numerati per blocchi; attrezzo con i kg nella voce di scheda (Modello 1 come prima, Modello 2 senza kg); nomi delle schede max 6 caratteri; "Settimane 1-2" in Info con data; circuito facoltativo chiuso.
- Note del Modello 2 riscritte in forma generica (nessun riferimento a condizioni di salute) e approvate; forme neutre. Prima di ogni commit: controllo dei riferimenti alla salute.
- Primo avvio (passo 5): schede dei modelli con immagine (`immagini-originali/modelli/` → `public/modelli/*.webp` 800 × 597, in precache), testi neutri.
- Fino al passo 5 un'installazione nuova riceve il Modello 1 con id generati (provvisorio).

**Commit:** 2578150, e044ac5, da54c68, edd081e, 9e16dfb, 36cfd45, ccb0a9f (+ commit di chiusura sessione).

## 2026-11-20 (sera) — Fase 4-bis: requisiti aggiuntivi del passo 5 (solo documenti)
- Scritte in `docs/aperti.md`, alla voce del passo 5, le aggiunte 1-5 dell'utente: niente Modello 1 automatico (primo avvio su profilo pulito, nessuna scheda prima di «Inizia»); Settimane 1-2 attive di serie con riga di spiegazione, `phase1Since` = prima seduta salvata, avviso dopo 14 giorni con «Sì» / «Non ancora» (rinvio 7 giorni, mai spegnimento automatico); Ricarica un modello con id generati e blocco durante l'allenamento; immagini dei modelli a 800 px con anteprima e pesi; istruzioni per la prova sul telefono in Wi-Fi a fine passo 5.
- Corretta in `CLAUDE.md` la frase superata su `gb.jpg` (ora `gb.webp` dedicata, commit 9e16dfb).
- Nessun codice scritto: il passo 5 parte solo dopo l'approvazione dell'utente.

**Decisioni**
- Se Settimane 1-2 viene riattivato da Info, `phase1Since` diventa la data della prima seduta salvata dopo la riattivazione e il rinvio del «Non ancora» si azzera.

**Commit:** e3caed6 (+ commit di chiusura sessione).

## 2026-11-20 (notte) — Fase 4-bis: passo 5, cambio di piano, prova sul telefono via USB (ramo `fase-4bis`)
- **Passo 5**: immagini dei modelli (`public/modelli/*.webp`, 800 × 597); primo avvio al posto delle schede automatiche; Modello 2 (A, B, C, D leggera) con i testi approvati; Info con Settimane 1-2 e «Ricarica un modello» (finestra con «Scarica backup» / «Sostituisci» / «Annulla», bloccata con un allenamento avviato, un'unica transazione, storico intatto); avviso «Disattivarle?» dopo 14 giorni; `phase1Since` dalla prima seduta salvata (vuoto senza sedute, anche nella migrazione).
- **Cambio di piano**: obiettivo unico = l'app si avvia, fa scegliere Modello 1 o 2 e trova le schede pronte. Editor eliminato (idea futura in `docs/aperti.md`); primo avvio in una sola schermata (niente nome, niente lato, niente «Schede vuote»); «Separa i lati» in Info (spento sulle installazioni nuove, acceso dalla migrazione, bloccato con un allenamento avviato, dati invariati); passo 7 allargato a «Settimana tipo» e «Regole» per modello; passo 9 ridotto alla prova delle immagini.
- **Prova sul telefono via debug USB** (solo `http://localhost:5173/allenamento/`, versione costruita; app installata e sito pubblicato non toccati; nessuna app installata, nessuna impostazione cambiata). Schermo 384 px. Tutto funzionante: primo avvio, immagini, Modello 2, seduta, Storico, Grafici, lati, ricarica, primo avvio offline, Wake Lock concesso durante il circuito e rilasciato dopo «Interrompi». Trovati 4 difetti:
  - D1: ✓ 48 × 44 e [Sx] [Dx] 46 × 44 px;
  - D2: segnaposto «reps /lato» tagliato con i lati accesi;
  - D3: l'avviso «App pronta» copriva titoli e tasti;
  - D4: righe che andavano a capo male («· 7 / esercizi», «con / ✓»).
- **Correzioni** D1-D4: tasti 48 × 48; segnaposto «rip.» / «sec» e «per lato» anche nello Storico; avvisi brevi in basso sopra la barra (e sopra quella del recupero), con spazio riservato, chiudibili con un tocco, «App pronta» dopo «Inizia»; spazi non separabili con `nb()`. Nuove prove: `e2e/tasti.spec.ts` (360 e 384 px), `e2e/avviso.spec.ts`, prove di `nb()`.
- **Prove USB nei commit**: `npm run prova-usb` (`scripts/prova-usb.mjs`, `playwright.usb.config.ts`, `e2e-usb/`), solo a mano, escluse da CI e prove normali; adb dal PATH o da `ADB`; schermate fuori dal progetto.
- Lezioni dalla prova USB: una scheda aperta via debug resta dietro e non viene disegnata (si apre come un link con `am start`); col debug collegato Chrome tiene acceso lo schermo comunque (il Wake Lock si verifica dalla pagina); togliere l'inoltro USB non basta per l'offline (si ferma il server); `vite preview` senza `--host` ascoltava solo in IPv6.
- Prove: da 172 + 100 a **202 Vitest + 122 Playwright**, due passate verdi; prova USB 6 su 6. Una sola caduta di CI01 sotto carico, non ripetuta (10 ripetizioni + 2 passate).

**Decisioni**
- `fake-indexeddb` non si installa; la prova della transazione fallita resta in Playwright.
- Controlli a mano al passo 10, col telefono scollegato: schermo acceso durante il circuito, modalità aereo (`docs/rilascio-4bis.md`).
- Il passo 7 parte solo con l'OK dell'utente.

**Commit:** 3c722d5, 52cd544, dc7a7b9, 24e44ab, ab55e2c, 418ba3e, 026dac0 (+ commit di chiusura sessione).

## 2026-11-20 (pomeriggio e sera) — Fase 4-bis: passo 7 e preparazione del passo 8 (ramo `fase-4bis`)
- **Prima del passo 7**: ramo pulito, prove della migrazione e del primo avvio ripristinate; `.gitattributes` (LF) già presente, nessun file con CRLF nel repository; prova instabile CI01 annotata nei punti aperti.
- **Passo 7**: contenuto del Modello 2 confrontato voce per voce con il piano (nessuna differenza). Descrizioni e sottotitoli delle schede del Modello 2 (solo durata, nessun giorno). Info dipendente dal modello (`src/catalog/infoTexts.ts`): «Settimana tipo» con «Esempio», «Ogni giorno», «Regole», scala dei push-up; il Modello 1 resta invariato; senza modello salvato si usano i testi del Modello 1.
- **Testi rivisti con la regola sulla salute**: sostituiti dall'utente i testi con parti del corpo legate a dolore e sintomi (giorni «no», sera, Dolore, Stop, «Se ci si sente poco bene», note di rdl e ht generiche, tolto «Evitare nella prima ora dopo il risveglio» dalla nota del rdl).
- **Catalogo neutro**: parti legate al Modello 1 spostate nelle note delle voci del Modello 1 con testo identico (pu, pull, ht, lpd); tolto «fascia» dalla nota del clamshell (nota della voce «Fascia sopra le ginocchia» nella D); attrezzo di ht «Manubrio». Forme neutre: «Sdraiati sulla schiena», «Arnold press (da seduti)», «Respiro affannoso, ma riesci a dire una frase breve.». Riscaldamento: «2 hang alla barra da 15-20 s (anche con i piedi appoggiati, se serve)».
- **Backup v2**: include già il modello scelto; aggiunte le prove (Vitest + BK01: telefono vuoto → import → Modello 2 con i testi di Info).
- **Passo 8**: analisi di Storico e Grafici e proposta mostrata all'utente (dettagli in `docs/aperti.md`); trovati difetti nel menu dei Grafici e nel conteggio per gruppo col Modello 2. Nessun codice scritto.
- Prove: da 202 + 122 a **216 Vitest + 126 Playwright**, due passate verdi; build riuscita; gitleaks pulito.

**Decisioni**
- Testi del Modello 2 per Info e note approvati dall'utente (in `docs/piano-4bis.md`); regola salute applicata anche ai testi dell'app.
- Ordine delle note: catalogo, poi «Nota della scheda: …».
- Il passo 8 parte solo con l'OK dell'utente; l'idea dei Grafici caricati all'apertura resta in `docs/aperti.md`.

**Commit:** 1e8bcc4, 5c1a06b, eb5abc6, d42b81c (+ commit di chiusura sessione).

## 2026-11-20 (notte) — Fase 4-bis: passi 8 e 9, piano di rilascio (ramo `fase-4bis`)
- **Passo 8** (approvato con una modifica alle etichette dello Storico): Storico raggruppato per id della scheda, prima le schede attuali («Scheda A · n sedute»), poi quelle che non ci sono più («Scheda A — fino al gg/mm/aaaa», «dal … al …» se nome e data coincidono); menu dei Grafici per scheda attuale + «Altri esercizi con dati» (col Modello 2 la D non ha una voce propria: approvato); esercizi kg sempre a 0 kg → solo «Ripetizioni totali» con frase, sedute miste con nota in legenda, frase sotto l'indice; gruppi muscolari visibili solo se allenati; serie settimanali e indici su tutto il catalogo (`CATALOG_EXERCISES`). `nb()` tiene insieme «fino al» + data e «n sedute».
- **Difetto trovato guardando le schermate**: il grafico a barre orizzontale scartava etichette con pochi gruppi (Femorali, Polpacci). Corretto; prova ST05 che legge le etichette disegnate (`data-ticks` del canvas), verificata sul codice vecchio (falliva: «Quadricipiti|Glutei»).
- **Fine riga**: lo script Python della sessione aveva salvato 8 file con CRLF; riportati a LF prima del commit. Nuova regola in `CLAUDE.md`: gli script salvano con LF.
- **Passo 9**: `e2e/immagini-modelli.spec.ts` (IM01 file in `public/`, IM02 caricamento nel browser) per gli esercizi dei due modelli, le immagini dei modelli, riscaldamento e circuito; verificata togliendo per un momento `gb.webp` (falliscono e dicono quale file manca; file rimesso identico).
- **Passo 10**: piano di rilascio in 14 punti mostrato all'utente (sintesi in `docs/aperti.md`). Nessuna azione su `main`.
- Sessione interrotta una volta per il limite di utilizzo (passo 8 scritto ma non committato), ripresa senza perdite.
- Prove: da 216 + 126 a **230 Vitest + 133 Playwright**, due passate verdi; build riuscita; gitleaks pulito.

**Decisioni**
- Etichette dello Storico per le schede che non ci sono più: «fino al» con la data dell'ultima seduta; «dal … al …» solo se nome e data coincidono.
- Frasi per le sedute a 0 kg, «Altri esercizi con dati» e menu senza voce D approvati.
- Il passo 10 parte solo con l'OK dell'utente; il primo passo è il backup dal telefono.

**Commit:** e4289b8, 7e051bc, 974fdc4, 217d8f4 (+ commit di chiusura sessione).

## 2026-11-20 (sera) — Fase 4-bis: passo 10, rilascio
- **Piano cambiato dall'utente**: storico del telefono vuoto, quindi nessuna prova sul telefono; tutte le prove nel browser del PC; merge e pubblicazione autorizzati solo se tutto verde, fermandosi al primo problema.
- **Controlli sul ramo**: tsc, 230 Vitest, 133 Playwright verdi; nessun riferimento a salute oltre ai testi generici approvati; nessuna email o numero; autori e committer solo noreply.
- **Prova di aggiornamento reale** (`npm run prova-aggiornamento`, nuova, solo a mano): la versione pubblicata d66419b, costruita dai suoi sorgenti, si installa col service worker in un profilo pulito; allo stesso indirizzo e porta si serve la versione nuova; ricarica, avviso «Nuova versione disponibile», «Aggiorna». AG01 (seduta salvata nella A con la versione vecchia) e AG02 (storico vuoto, poi 30 giorni dopo con orologio finto): tutto come atteso. Verificata facendola fallire. Due passate verdi.
- **Fine riga**: controllati i byte con Python (0 CR); in questa shell il conteggio con `grep` dei CR non è affidabile (conta tutte le righe).
- **Merge** `--no-ff` in `main` (6f23f93), autori solo noreply, tsc + prove + build verdi su `main`, push, GitHub Actions n. 7 verde.
- **Sito pubblicato** (profilo pulito, come l'incognito): primo avvio → Modello 2 → seduta salvata → Storico e Grafici → Info con «Esempio», nessun errore in console. Lo script si era fermato sulle immagini degli esercizi: sono a caricamento differito (`loading="lazy"`), si caricano solo scorrendo; non è un difetto dell'app.
- Ramo `fase-4bis` conservato.

**Decisioni**
- La prova di aggiornamento reale sostituisce la prova a secco quando lo storico è vuoto.
- Restano da verificare a mano su un telefono vero: schermo acceso nel circuito col telefono scollegato; modalità aereo reale.

**Commit:** 536024f (prova di aggiornamento), 6f23f93 (merge) (+ commit della documentazione).

## 2026-11-21 — Correzione urgente: blocco su «Caricamento» (ramo `fix-recupero`)
**Segnalazione** (versione 8, secondo telefono, installazione nuova, Modello 2): dopo una ✓ sul goblet squat e un interruttore toccato in Info, ogni pagina restava bianca con «Caricamento…» (barra in basso visibile); l'app si bloccava anche riaperta.

**Diagnosi**
- La prova di regressione della sequenza (RG01-RG03) non riproduceva il bug, né in sviluppo né nella versione costruita.
- Telefono via debug USB, prima in sola lettura: database letto da `favicon.svg` (nessun codice dell'app); copia in `dati-locali/`. Database **sano** (versione 20, letture in pochi millisecondi). Bozza della A con 6 kg confermati senza ripetizioni e senza orario di inizio; Settimane 1-2 spente; «Recupero automatico» mai scritto: le ultime scritture dell'app installata non erano arrivate.
- C'era **una scheda di Chrome aperta sull'app**, oltre all'app installata. Ricaricata da Chrome, si apriva normalmente con gli stessi dati.
- Riprodotto il sintomo sul PC: un'altra pagina che tiene aperta una scrittura su `sessions`/`setLogs` dà esattamente «barra + Caricamento su ogni pagina».
- Nessuna transazione dell'app poteva tenere occupate sedute e serie con 0 sedute: innesco a monte non identificato con certezza (probabile attesa dentro Chrome, sparita col riavvio di Chrome).
- Scoperto: in Chrome una scrittura lasciata aperta su una tabella blocca le scritture su tutte le altre (anche da un'altra connessione).
- La ✓ non perde le ripetizioni (CV01-CV02); il ✓ però confermava una serie con i soli kg grigi, che poi non veniva salvata.

**Correzioni** (prove scritte prima)
- Avviso del superset: «Superset: ora Calf raise in piedi, poi recupero 90 s» (prima «→ Passa a 1b»).
- Messaggio dopo 8 s di caricamento con «Continua ad aspettare», «Scarica backup», «Ricarica»; error boundary; backup grezzo con tempo massimo (AT01-AT03, EB01).
- Una sola copia dell'app per volta con Web Locks; avviso «App già aperta» adatto al caso (app installata / scheda di Chrome); consiglio «Usa l'app dall'icona» (UC01-UC05).
- Transazioni ristrette: «Separa i lati» e importazione (TX01-TX02).
- Nota sotto «Recupero automatico» con un allenamento avviato (RG04); Settimane 1-2 accese al primo avvio (RG05).
- Dati non validi all'avvio: impostazioni al predefinito, bozze scartate con copia in memoria, sedute intatte (DV01-DV02 + Vitest).
- ✓ solo su serie complete, con l'avviso di cosa manca (CV03-CV04 + Vitest; P02 e P11 aggiornate).

**Prova sul secondo telefono** (versione del ramo su `localhost:5173` via `adb reverse`, tocchi veri via debug USB): primo avvio, superset, recupero, Info, salvataggio con ripetizioni, Storico, Grafici, backup, seconda scheda, secondo piano; poi app installata con la scheda di Chrome aperta («App già aperta» → chiusa la scheda → parte da sola), stessi passaggi, secondo piano, **senza rete** (17 immagini su 17 dalla cache), scheda di Chrome con l'app aperta (database identico). 15/15 OK, nessun errore in console. Note: `vite preview` va avviato con `--host 127.0.0.1` (altrimenti ascolta solo su IPv6 e `adb reverse` non arriva); lo strumento dei tocchi deve chiudere la tastiera prima di toccare un pulsante.

**Decisioni**
- Piano di correzione approvato con le aggiunte dell'utente (tempo massimo del backup, «Continua ad aspettare», copia dei dati scartati solo in memoria, avviso del lucchetto con i passaggi concreti).
- Al posto di «bozza riletta a ogni modifica»: il lucchetto impedisce la seconda copia.
- Le due migliorie (✓ solo su serie complete, avviso adatto al caso) incluse prima del merge.

**Prove:** da 230 + 133 a **239 Vitest + 155 Playwright**; `npm run prova-aggiornamento` 2/2; build riuscita; gitleaks pulito.

**Seguito (21/11, fine sessione)**
- Prova sul secondo telefono completata (passaggi 13-15: app installata in secondo piano, senza rete, scheda di Chrome con l'app aperta): tutto OK; server, registratore e `adb reverse`/`adb forward` chiusi.
- Due migliorie chieste dall'utente prima del merge: ✓ solo su serie complete (8c79634) e avviso «App già aperta» adatto al caso (51f68e1); provate sul PC, non ancora sul telefono.
- Documentazione (7382c72); controlli su ramo e su `main`: tsc, 239 Vitest, 155 Playwright (due passate), build, prova di aggiornamento 2/2; autori solo noreply.
- **Merge** `--no-ff` in `main` = **ce93e43**, push, GitHub Actions **n. 9 verde**; il sito pubblicato contiene il lucchetto e l'avviso «Mancano le ripetizioni».

**Decisioni**
- Merge e pubblicazione autorizzati dall'utente dopo le due migliorie.

**Commit:** 9858c3e, 0bce484, ba75f82, 8f8928f, e89d29e, 521fd49, 3ea9bb4, 036e023, 621279f, 8c79634, 51f68e1, 7382c72, ce93e43 (merge) (+ commit di chiusura sessione).

## 2026-11-21 (seconda sessione) — verifica della ✓ su serie complete (ramo `fix-spunta`)

Verifica chiesta dall'utente della regola «la ✓ conferma solo una serie completa» (8c79634), aggiunta dopo la prova sul telefono e provata solo sul PC.

**Campi richiesti perché la ✓ confermi** (stessa regola del salvataggio, `isComplete` / `missingText` in `src/logic/values.ts`)

| Tipo di esercizio | Campi mostrati | Campi richiesti | Prove |
|---|---|---|---|
| kg | kg + rip. | kg e ripetizioni | CV01-CV03, P11, SP01-SP04, Vitest |
| 0 kg (`ss`, `gb` della D nel Modello 2) | kg (precompilato «0») + rip. | come kg: 0 è un valore valido | SP03-SP04, Vitest |
| corpo libero | rip. | ripetizioni | SP01-SP05, Vitest |
| a tempo | sec | secondi | SP01-SP04, Vitest |
| a livello (push-up) | pulsanti livello + rip. | livello e ripetizioni | P02, SP01-SP05, Vitest |
| elastico | pulsanti elastico + rip. | elastico («Nessuno» = 0 vale) e ripetizioni | P02, SP01-SP04, Vitest |
| un arto, «Separa i lati» spento | una ✓ | come la sua metrica | SP01, SP03, L01 |
| un arto, «Separa i lati» acceso | [Sx] poi [Dx] (controllo su entrambi) | come la sua metrica | CV04, SP02, SP04 |

**Esito**
- Tutte le voci di Modello 1 e Modello 2 chiedono solo i campi che mostrano (SP01-SP04 passano anche sul codice di prima).
- Due problemi trovati e corretti (215ac91):
  - una serie confermata e poi svuotata restava verde e al salvataggio veniva scartata (in silenzio se svuotata del tutto);
  - una bozza di prima della n. 9 con serie confermate incomplete non veniva scartata in silenzio (avviso al salvataggio), ma le serie apparivano verdi e l'avviso diceva sempre «senza ripetizioni (o secondi)», anche quando mancavano kg, livello o elastico.
- Correzione: **verde = confermata e completa** (= verrà salvata); altrimenti grigia, e la ✓ dice cosa manca. Correggendo i valori la conferma nella bozza resta: completata di nuovo, la serie torna verde senza un'altra ✓ e senza ripartire il recupero. Avvisi: «N serie confermate ma incomplete (manca un valore) NON verranno salvate», «Serie incomplete (in grigio): completa i valori mancanti per salvarle.», «Mancano livello e ripetizioni», «Mancano elastico e ripetizioni».
- **Limite accettato:** una serie incompleta di una bozza di prima della n. 9 torna verde appena la si completa, senza un'altra ✓ (la ✓ era già stata toccata allora).
- Prove nuove: SP01-SP07 (`e2e/spunta.spec.ts`; SP05-SP07 falliscono sul codice di prima) e Vitest sulla coerenza tra avviso e salvataggio per ogni metrica e combinazione.

**Prove:** da 239 + 155 a **241 Vitest + 162 Playwright**.

**Decisioni**
- Commit 1385da5 (solo documenti) non inviato da solo: entra in `main` col merge di `fix-spunta` (scelta B dell'utente).
- Merge di `fix-spunta` in `main` e pubblicazione n. 10 approvati dall'utente.
