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
- `npm run prova-a-secco`: migrazione provata sul backup reale messo in `dati-locali/` (esclusa da Git, bloccata dal pre-commit). Solo a mano; stampa solo conteggi e percorsi delle differenze, **mai i dati**. Se ci sono differenze: fermarsi e mostrarle, non correggerle da soli. Il file reale non va mai letto né mostrato.
- `/chiudi` (`.claude/commands/chiudi.md`): chiusura sessione (stato, diario in `docs/storia.md`, punti aperti in `docs/aperti.md`, controlli, commit, push).

## Stato per ripartire
- **Fase 7 chiusa il 20/11/2026** (checklist §10 completa). App pubblicata su `https://teachertrip.github.io/allenamento/`, versione d66419b installata e verificata sul telefono; sedute di prova cancellate, debug USB spento. PWA: aggiornamento solo a richiesta, mai durante allenamento/recupero/circuito.
- Regole dell'app decise il 19/11: la serie si conferma **solo con ✓** (scrivere non conferma) e la ✓ avvia il recupero; "Termina e salva" ferma il recupero.
- GitHub: repo **pubblico**, secret scanning + push protection, `main` protetto. Workflow `pubblica.yml`: push su main → `npm test` + build → Pages. **Conferma dell'utente prima di ogni modifica su GitHub** (push compresi, tranne /chiudi).
- Prove: 94 Vitest + 86 Playwright, verdi. Prove sul telefono dal PC: debug USB + CDP con Playwright (i tocchi adb sono bloccati); suono/vibrazione solo a mano dall'utente.
- Lista privata di parole: **nessuna voce attiva** → la compila l'utente, poi rilanciare il controllo sulla cronologia (stampa solo commit e file).
- Hook: eccezione esatta solo per `i@izs.me` (package-lock). Modello del telefono mai nei file versionati. Immagini: `npm run immagini`; icone: `npm run icone`.
- Shell partita prima del PATH aggiornato: per gitleaks/adb/gh ricaricare il PATH utente o riavviare Claude Code.
- Prossimo passo: Fase 4-bis (sotto); punti residui in `docs/aperti.md` (lista parole, firewall, notifica di fine recupero, "Vibrazione tattile" facoltativa).

## Fase 4-bis + Modello 2 — IN CORSO (piano approvato il 20/11/2026)
- Piano completo: **`docs/piano-4bis.md`** (fonte di verità della fase). Rilascio: **`docs/rilascio-4bis.md`** (checklist).
- Secondo telefono Android con un'altra scheda; niente profili/account, ogni dispositivo ha i suoi dati.
- Catalogo esercizi + modelli nel codice; schede (1-4) in IndexedDB; primo avvio una sola volta; impostazioni in Info; migrazione Dexie v2 senza perdite (installazione esistente = Modello 1, nessun primo avvio).
- **Ramo `fase-4bis`**: tutto lo sviluppo lì. Il push del ramo NON pubblica (workflow solo su `main` + ambiente Pages limitato a `main`). **Merge in `main` solo al passo 10, dopo conferma esplicita.** `/chiudi` in questa fase: commit + push del ramo, mai di `main`.
- Bozze: tabella `drafts` invariata, la chiave `day` contiene l'id della scheda (Modello 1 = `A`/`B`/`C`). Anche `Session.day` contiene l'id della scheda.
- Id `A`/`B`/`C` assegnati **solo dalla migrazione**; ogni scheda creata dopo ha un id generato univoco (`newId()`), anche se si chiama «A».
- Carico `kg` = **per manubrio** (come l'import del prototipo: «2 x 10» → 10).
- **Prima di ogni commit**: controllare che `CLAUDE.md`, `docs/` e codice non contengano riferimenti a condizioni di salute (dolori/fastidi localizzati, patologie, infortuni). Ammesse solo indicazioni tecniche generiche da manuale.
- Note del Modello 2: testi definitivi approvati il 20/11 (in `docs/piano-4bis.md`). `gb.jpg` è ancora una copia di `wu-bridge.jpg`: l'utente la sostituirà.
- Prove all'inizio della fase: 94 Vitest + 86 Playwright. Dopo il passo 3: 172 + 91. Dopo il passo 4: 172 Vitest + 100 Playwright.
- Passo 4: installazione nuova senza schede → `ensurePrograms()` (in `DbGate`) crea il Modello 1 con id generati. PROVVISORIO: al passo 5 lo sostituisce il primo avvio. Le prove passano il NOME della scheda (`goTab(page, 'A')`, `patchDraft(page, 'A', …)`), mai l'id.
- Database: Dexie versione 2 (IndexedDB 20), tabella `programs`; upgrade in `src/db/db.ts` + regole pure in `src/db/migrate.ts`; errori/altre schede in `src/screens/DbGate.tsx`.
