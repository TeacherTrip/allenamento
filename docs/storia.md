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
