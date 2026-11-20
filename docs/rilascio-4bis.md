# Rilascio Fase 4-bis (passo 10) — checklist

La migrazione del database sul telefono **non si può annullare**: l'unica rete di sicurezza è il backup. Non saltare nessun punto.

## Prima (sul PC)
- [ ] Ramo `fase-4bis`: `npx tsc --noEmit`, `npm test`, `npx playwright test` tutti verdi (compresa `migrazione.spec.ts`).
- [ ] Controllo: niente riferimenti a condizioni di salute né dati personali in `CLAUDE.md`, `docs/` e codice.
- [ ] `git log --format="%an <%ae>"` sul ramo: solo l'indirizzo noreply.
- [ ] Annotare l'ultimo commit di `main` già pubblicato (serve per tornare indietro).

## Backup dal telefono attuale (con la versione VECCHIA ancora installata)
- [ ] Nessun allenamento in corso, nessun recupero attivo.
- [ ] Info → **Esporta backup** → file `teachergym-backup-AAAA-MM-GG.json` nella cartella Download.
- [ ] Copiare il file sul PC **fuori dal progetto** (mai dentro `Allenamento`).
- [ ] Verificare il file: si apre come JSON, `app` = `TeacherGym`, il numero di sedute corrisponde allo Storico del telefono, ci sono le serie (`setLogs`) e le impostazioni.
- [ ] Prova di lettura: importarlo in un profilo pulito della versione nuova (Chrome del PC, `npm run dev`) e controllare che lo storico sia completo.

## Aggiornamento
- [ ] Conferma esplicita dell'utente per il merge di `fase-4bis` in `main`.
- [ ] Merge e push di `main` → il workflow pubblica; controllare che l'esecuzione su GitHub Actions sia verde.
- [ ] Sul telefono: aprire l'app, attendere l'avviso di aggiornamento, toccare "Aggiorna" (solo fuori da allenamento, recupero e circuito).
- [ ] Info → la versione mostrata corrisponde al nuovo commit.

## Controlli dopo l'aggiornamento (telefono attuale)
- [ ] **Nessun primo avvio** mostrato.
- [ ] Barra in basso: schede **A, B, C** (Modello 1), con gli stessi esercizi, serie, range e recuperi di prima.
- [ ] Info: lato di partenza = **sinistro**; "Settimane 1-2" nello stato di prima.
- [ ] **Storico**: stesso numero di sedute, stesse serie, stesse note e durate.
- [ ] **Precompilazione**: in ogni scheda i valori grigi sono quelli dell'ultima seduta.
- [ ] **Grafici**: e1RM, carico, ripetizioni e serie settimanali uguali a prima (confronto con screenshot presi PRIMA dell'aggiornamento).
- [ ] Una seduta di prova salvata e poi cancellata dallo Storico.

## Secondo telefono
- [ ] Aprire `https://teachertrip.github.io/allenamento/` in Chrome → installare l'app.
- [ ] Primo avvio: nome → Modello 2 → lato di partenza.
- [ ] Controllare le schede A-D, le immagini (o i segnaposto) e il recupero.
- [ ] Spiegare il backup manuale (Info → Esporta backup, promemoria ogni 6 sedute).

## Se qualcosa non torna
- **Schermata d'errore della migrazione**: toccare "Scarica backup grezzo", salvare il file, NON reinstallare l'app; avvisare e analizzare il file sul PC.
- **Dati sbagliati ma app funzionante**: Info → Importa backup → il file preso prima dell'aggiornamento (sostituisce tutti i dati).
- **App inutilizzabile**: rollback del deploy, cioè `git revert` del merge su `main` (mai `--force`) e push, con conferma dell'utente. Attenzione: la versione vecchia **non sa aprire** il database v2. Dopo il rollback serve cancellare i dati dell'app dal telefono (Impostazioni di Chrome → Siti → dati del sito) e poi importare il backup preso prima.
- Annotare in `docs/storia.md` cosa è successo e aggiungere una prova automatica per il caso.
