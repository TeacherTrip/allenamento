Chiudiamo la sessione di lavoro sul progetto Allenamento.

1. `git status`: elenca i file modificati. Se ci sono file di backup (`*backup*.json`, `export/`, `backup/`), `.env` o qualunque file con dati personali, FERMATI e dimmelo prima del commit (non aggiungerli).
2. In CLAUDE.md, sezione «Stato per ripartire»: rileggi il file subito prima di scrivere e SOSTITUISCI solo quel blocco (fase in corso, cosa è fatto, cosa devo provare io sul telefono, prossimo passo; max 8 righe). Non modificare altro in CLAUDE.md.
3. In docs\storia.md AGGIUNGI in fondo il diario di oggi (data, cosa è stato fatto, decisioni prese, id dei commit). Se il file non esiste, crealo.
4. In docs\aperti.md aggiorna l'elenco dei punti aperti (togli quelli chiusi, aggiungi i nuovi). Se non esiste, crealo.
5. Controlli di sicurezza (sezione 6-bis di PROMPT.md):
   - `git config user.email` deve essere l'indirizzo `@users.noreply.github.com`; se no, FERMATI;
   - `git diff --staged` non deve contenere nomi reali, email, misure, peso, dati di salute, chiavi o token.
6. Commit con un messaggio in italiano che descrive la sessione, aggiungendo i file nominati uno per uno (mai `git add -A` né `git add .`, mai `--no-verify`). Se il pre-commit blocca il commit, FERMATI e spiegami il motivo. Dimmi l'id del commit.
7. Poi `git push` su GitHub, solo se il remote `origin` è già configurato: lanciare /chiudi vale come richiesta esplicita di push. Prima del push verifica con `git log --format="%an <%ae>"` che tutti i commit da inviare abbiano l'email noreply. Se il push fallisce (login scaduto, conflitto) fermati e dimmelo, senza forzare nulla (mai --force).
8. Chiudi con un riepilogo di 3 righe: cosa è stato fatto, cosa devo provare io, da dove ripartiamo.
