# TeacherGym — app di allenamento a casa (PWA)

Specifica completa: `PROMPT.md` (fonte di verità per requisiti, fasi e regole; **non versionato**: contiene dati personali, resta solo sul PC). Contenuti della scheda: `scheda-casa.html` (prototipo, solo riferimento).

## Come lavorare con l'utente
- Rispondere sempre in **italiano**. Ogni termine tecnico (soprattutto inglese) va spiegato tra parentesi almeno la prima volta.
- L'utente non è uno sviluppatore ma è tecnicamente capace: vuole capire cosa succede.
- Prima di installare software o modificare il sistema (winget, npm -g, git config globale…): spiegare e chiedere conferma.
- Lavorare **solo dentro `Allenamento`**. Non leggere né toccare altre cartelle del PC. Non toccare altri repository dell'account GitHub (i nomi sono in `PROMPT.md`, non riportarli qui).
- Se una scelta ha limiti, dirlo e motivare. Se mancano dati o c'è ambiguità: fermarsi e chiedere.
- Struttura delle risposte: prima codice/azione, poi breve spiegazione dei punti chiave.
- Commit frequenti, messaggi in italiano; push a fine fase.
- Messaggi di commit **senza** riga `Co-Authored-By` né altre email (scelta dell'utente: nessuna email nei messaggi).

## Decisioni prese (Fase 0, 2026-11-19)
- Telefono **Android**, browser **Chrome**.
- Repo `TeacherTrip/allenamento` → **pubblico** + **GitHub Pages**: `https://teachertrip.github.io/allenamento/`, Vite `base: '/allenamento/'`.
- Backup **solo manuale** (export/import JSON) + import dal formato del prototipo (`schedaCasa_v1`). Promemoria ogni 6 sedute.
- Scheda modificata **solo nel codice** (file di configurazione versionato), niente editor in-app. Prevedere migrazioni: lo storico di esercizi rimossi non deve sparire.
- Grafici: **e1RM (Epley) + carico serie migliore** per `kg`.
- **Niente** peso corporeo / circonferenze.
- Nome app **TeacherGym**; icona **manubrio + "TG"** (SVG); tema **automatico** (segue il sistema).
- Timer: **suono + vibrazione**; **Wake Lock** durante la seduta.
- Nome autore commit: **TeacherGym**.
- Immagini di riferimento esercizi: **rimandate a dopo l'MVP**. Prevedere già un campo opzionale `image` nel modello `Exercise`. Mai immagini prese dal web (copyright, repo pubblico).
- Stack: Vite + React + TypeScript, Dexie (IndexedDB), vite-plugin-pwa, libreria grafici da definire in Fase 3, deploy con GitHub Actions.

## Regole di sicurezza VINCOLANTI (sintesi di PROMPT.md §6-bis)
Il repo è/diventerà **pubblico**. Queste regole hanno priorità su velocità e comodità.
1. **Identità:** `user.email` solo noreply `…@users.noreply.github.com`, configurata **solo locale** (mai `--global`). Prima di ogni push: `git log --format="%an <%ae>"` → solo noreply.
2. **Niente dati personali o segreti** in codice, commit, messaggi, file di esempio: nomi reali, email, telefono, indirizzi, peso, misure, salute, date di nascita, chiavi, token, password. Dati di test solo inventati.
3. **`.gitignore`** esclude backup (`*backup*.json`, `backup/`, `export/`), `.env*`, `*.local`, `node_modules/`, `dist/`, file di sistema.
4. **Pre-commit** (gitleaks + controllo backup/email) sempre attivo. **Mai `--no-verify`.**
5. Prima di ogni commit: `git status` + `git diff --staged --stat`, mostrare i file all'utente. **Mai `git add .` / `git add -A`** senza aver controllato `git status`; preferire aggiungere i file uno per uno.
6. **Mai `--force`** sul push. Branch protection su `main`.
7. Se sfugge qualcosa: non pubblicato → correggere e spiegare; già pubblicato → fermarsi e avvisare **subito** (segreto = compromesso, va revocato).
8. Eventuali segreti futuri solo in variabili d'ambiente / GitHub Secrets, previa richiesta.
9. **`.githooks/parole-vietate.local`** (lista privata di parole personali, esclusa da Git): **mai aprirla, leggerla, mostrarla o modificarla**, in nessun comando né output, in nessuna sessione. La compila solo l'utente. L'hook la usa senza mai stampare le parole trovate (solo file e riga).

## Comandi
- `npm run dev` (app su http://localhost:5173/allenamento/), `npm test` (test unitari Vitest), `npx playwright test` (prove nel browser: Chrome del PC, Pixel 7, profilo pulito; i download dei test vanno in una cartella temporanea di sistema, mai nel progetto), `npm run build`.
- Dopo ogni modifica: `npx tsc --noEmit`, `npm test`, `npx playwright test`. Ogni bug trovato → nuova prova automatica.
- `npm run prova-usb`: prove sul telefono vero via debug USB (`e2e-usb/`, `playwright.usb.config.ts`). Solo a mano, escluse da CI, `npm test` e `npx playwright test`. Usa SOLO `http://localhost:5173/allenamento/` (versione costruita), cancella solo i dati di quell'origine, mai l'app installata né il sito pubblicato; nessuna app installata, nessuna impostazione cambiata. adb dal PATH o dalla variabile `ADB`. Schermate e misure nella cartella temporanea di sistema (`teachergym-usb`).
- `npm run prova-a-secco`: migrazione provata sul backup reale messo in `dati-locali/` (esclusa da Git, bloccata dal pre-commit). Solo a mano; stampa solo conteggi e percorsi delle differenze, **mai i dati**. Se ci sono differenze: fermarsi e mostrarle, non correggerle da soli. Il file reale non va mai letto né mostrato.
- `/chiudi` (`.claude/commands/chiudi.md`): chiusura sessione (stato, diario in `docs/storia.md`, punti aperti in `docs/aperti.md`, controlli, commit, push).

## Stato per ripartire
- **Fase 4-bis IN CORSO sul ramo `fase-4bis`** (dettagli sotto e in `docs/piano-4bis.md`): passi 1-5 fatti (cambio di piano del 20/11: niente editor, primo avvio in una schermata, «Separa i lati»); prova sul telefono via USB fatta il 20/11, difetti D1-D4 corretti (418ba3e). `main` e il sito restano alla Fase 7 (d66419b, sul telefono); merge in `main` solo al passo 10, con conferma esplicita.
- Regole dell'app: la serie si conferma **solo con ✓**, la ✓ avvia il recupero; "Termina e salva" ferma il recupero. PWA: aggiornamento solo a richiesta. Avvisi brevi in basso sopra la barra, chiudibili; «App pronta» dopo il primo avvio.
- GitHub: repo **pubblico**, `main` protetto, Pages solo da `main`. **Conferma dell'utente prima di ogni modifica su GitHub** (push del ramo `fase-4bis` autorizzato; /chiudi = push del ramo).
- Prove: 202 Vitest + 122 Playwright, verdi; `npm run prova-usb` (6 prove sul telefono via USB, solo a mano) verde il 20/11. Prova a secco sui dati reali rinviata (storico del telefono vuoto): obbligatoria al rilascio.
- Da provare a mano (utente): niente di obbligatorio ora. Al passo 10, col telefono scollegato: schermo acceso durante il circuito e modalità aereo (`docs/rilascio-4bis.md`). L'app installata non si tocca fino al passo 10.
- Lista privata di parole: **nessuna voce attiva** (la compila l'utente). Hook: eccezione esatta solo per `i@izs.me`. Per gitleaks/adb/gh ricaricare il PATH o riavviare Claude Code.
- **Prossimo passo: passo 7** (controllo del Modello 2 + «Settimana tipo» e «Regole» in Info dipendenti dal modello, solo testi approvati: se mancano, chiedere), **solo con l'OK dell'utente**. `fake-indexeddb`: NON si installa.
- **PROMEMORIA nuova sessione:** leggere `CLAUDE.md`, `docs/aperti.md` e `docs/piano-4bis.md`; confermare ramo, ultimo commit, prove e prossimo passo; **non scrivere codice del passo 7 finché l'utente non approva**.
## Fase 4-bis + Modello 2 — IN CORSO (piano approvato il 20/11/2026)
- Piano completo: **`docs/piano-4bis.md`** (fonte di verità della fase). Rilascio: **`docs/rilascio-4bis.md`** (checklist).
- Secondo telefono Android con un'altra scheda; niente profili/account, ogni dispositivo ha i suoi dati.
- **Cambio di piano (20/11) — obiettivo unico:** l'app si avvia, fa scegliere Modello 1 o 2 con le immagini e trova le schede pronte (esercizi, immagini, sedute, recuperi, pesi, ripetizioni, storico, grafici). **Niente funzioni in più.** Editor delle schede eliminato (idea futura in `docs/aperti.md`): nessun testo o pulsante deve farne capire l'esistenza. Niente «Schede vuote», niente nome.
- Catalogo esercizi + modelli (solo Modello 1 e Modello 2) nel codice; schede in IndexedDB; primo avvio una sola volta, una schermata; impostazioni in Info; migrazione Dexie v2 senza perdite (installazione esistente = Modello 1, nessun primo avvio).
- **Ramo `fase-4bis`**: tutto lo sviluppo lì. Il push del ramo NON pubblica (workflow solo su `main` + ambiente Pages limitato a `main`). **Merge in `main` solo al passo 10, dopo conferma esplicita.** `/chiudi` in questa fase: commit + push del ramo, mai di `main`.
- Bozze: tabella `drafts` invariata, la chiave `day` contiene l'id della scheda (Modello 1 = `A`/`B`/`C`). Anche `Session.day` contiene l'id della scheda.
- Id `A`/`B`/`C` assegnati **solo dalla migrazione**; ogni scheda creata dopo ha un id generato univoco (`newId()`), anche se si chiama «A».
- Settimane 1-2: `phase1Since` = data della prima seduta salvata (non del primo avvio). Se Settimane 1-2 vengono riattivate da Info: `phase1Since` = data della prima seduta salvata dopo la riattivazione; rinvio dell'avviso azzerato. Con `phase1Since` vuoto l'avviso «Disattivarle?» non compare mai.
- **Lati** (20/11): «Separa i lati» in Info (`separateSides`). Spento sulle installazioni nuove: un ✓ per serie, «per lato», nessun sinistro/destro. Acceso dalla migrazione sulle esistenti (con `startSide` sinistro). Dati invariati (una riga per serie, valori per lato, uguali per i due lati). Bloccato con un allenamento avviato. `userName` resta nei dati ma non è usato.
- Carico `kg` = **per manubrio** (come l'import del prototipo: «2 x 10» → 10).
- **Prima di ogni commit**: controllare che `CLAUDE.md`, `docs/` e codice non contengano riferimenti a condizioni di salute (dolori/fastidi localizzati, patologie, infortuni). Ammesse solo indicazioni tecniche generiche da manuale.
- Note del Modello 2: testi definitivi approvati il 20/11 (in `docs/piano-4bis.md`). `gb` ha la sua immagine dedicata (`gb.webp`, commit 9e16dfb), non più una copia di `wu-bridge`.
- Prove all'inizio della fase: 94 Vitest + 86 Playwright. Dopo il passo 3: 172 + 91. Dopo il passo 4: 172 + 100. Dopo il passo 5: 194 + 110; dopo il cambio di piano: 200 Vitest + 115 Playwright; dopo le correzioni della prova USB (D1-D4: tasti 48 × 48, segnaposto «rip.», avviso breve in basso e chiudibile, spazi non separabili con `nb()`): 202 + 122.
- Passo 5: `ensurePrograms()` tolto. Installazione nuova (nessuna scheda e `onboarded` assente, mai il numero di sedute) → primo avvio (`src/screens/FirstRun.tsx`, una schermata), salvato solo con «Inizia». Nelle prove `openApp(page, tab, model)` passa il primo avvio (`passFirstRun`); le prove scritte per i lati separati li accendono con `separateSidesOn(page, tab)`; le prove passano il NOME della scheda (`goTab(page, 'A')`), mai l'id. Modello 2 già nel codice (strada A). «Ricarica un modello» = `reloadTemplate()` in `src/db/db.ts` (cancella e sostituisce le schede in una transazione; storico intatto). Regole Settimane 1-2 in `src/logic/phase1.ts`.
- Database: Dexie versione 2 (IndexedDB 20), tabella `programs`; upgrade in `src/db/db.ts` + regole pure in `src/db/migrate.ts`; errori/altre schede in `src/screens/DbGate.tsx`.
