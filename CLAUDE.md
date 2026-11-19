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
- `/chiudi` (`.claude/commands/chiudi.md`): chiusura sessione (stato, diario in `docs/storia.md`, punti aperti in `docs/aperti.md`, controlli, commit, push).

## Stato per ripartire
- Fasi 0-3 completate (piano in `docs/piano.md`). **Fase 4 (MVP) quasi chiusa**: sedute A/B/C, storico, backup/import, cronometro, recupero automatico, "Via!" centrato + 4 bip, [Sx][Dx], "+ Serie". Ultimo commit funzionale `80aa5e2`.
- Prove: 35 Vitest + 57 Playwright, verdi su localhost e su `E2E_BASE_URL=http://192.168.1.10:5173/allenamento/`.
- Repo `TeacherTrip/allenamento` collegato e **privato** (diventa pubblico in Fase 6, con conferma).
- Prove sul telefono (Xiaomi, `adb reverse tcp:5173 tcp:5173`) **superate il 2026-11-19**: recupero a schermo acceso e bloccato, Sx/Dx, "+ Serie", immagini. Vibrazione solo con "Vibrazione tattile" attiva (limite HyperOS).
- Immagini esercizi: originali in `immagini-originali/` (esclusa da Git); `npm run immagini` crea i WebP in `public/esercizi/<id>.webp`. Percorso sempre con `imageUrl()` (BASE_URL).
- Prossimo passo: **Fase 5** (timer circuito con immagine grande dell'esercizio in corso, grafici Chart.js).
- Nota: se `gitleaks` non viene trovato dall'hook, aggiungere al PATH la cartella WinGet di Gitleaks o riavviare il terminale.
