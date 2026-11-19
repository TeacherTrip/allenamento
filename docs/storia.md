# Diario del progetto TeacherGym

## 2026-11-19

**Fatto**
- Fase 0: domande e decisioni (Android/Chrome, backup manuale, grafici e1RM, tema automatico, icona manubrio + "TG", immagini rimandate).
- Fase 1: ambiente (Node, Git, gh con login).
- Fase 2: repo git, identità noreply locale "TeacherGym", `.gitignore`, `.gitattributes`, hook di pre-commit (gitleaks + backup + email + lista privata di parole), comando `/chiudi`.
- Fase 3: piano approvato (`docs/piano.md`), con elastici "assistenza"/"resistenza" e indice di progressione.
- Fase 4 (MVP): scheda nel codice, database Dexie, sedute A/B/C con precompilazione, storico modificabile, backup/import (anche dal prototipo), cronometro della seduta, recupero automatico e manuale, schermo sempre acceso (dove supportato).
- Prove automatiche: 35 Vitest + 57 Playwright, anche sull'indirizzo di rete non sicuro (`E2E_BASE_URL`).
- Diagnosi sul telefono (Xiaomi 15 Ultra, Chrome) via adb + DevTools:
  - a schermo bloccato la pagina è nascosta e "Via!" si chiudeva prima dello sblocco;
  - in sviluppo, allo sblocco il server ricarica la pagina;
  - la vibrazione funziona solo con "Vibrazione tattile" attiva (limite di HyperOS).
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

**Commit:** 6b0dec7, 204bff9, c5b28fa, c60db2a (+ precache senza doppioni e note).
