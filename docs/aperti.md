# Punti aperti

Stato: app **pubblicata** su https://teachertrip.github.io/allenamento/ e installata sul telefono (versione con commit d66419b). **Fase 7 chiusa il 20/11/2026**: checklist §10 completa (dettagli in `docs/storia.md`). Repository **pubblico**; protezioni GitHub attive (secret scanning + push protection, `main` protetto da force push e cancellazione, Issues/Projects/Wiki spenti).

## Da fare (utente)
- [ ] Lista privata di parole: risulta senza voci attive (solo vuoti/commenti), quindi il controllo delle parole personali non agisce. La compila l'utente; poi rilanciare il controllo su tutta la cronologia (stampa solo commit e file).
- [ ] Facoltativo: riattivare "Vibrazione tattile" sul telefono (senza, Chrome non vibra a fine recupero; restano i suoni). Se riattivata: una ✓ con recupero per controllare la vibrazione.

## Fase 4-bis + Modello 2 (piano approvato il 20/11/2026, ramo `fase-4bis`)
Piano: `docs/piano-4bis.md`. Rilascio: `docs/rilascio-4bis.md`.
- [ ] Passo 1: catalogo + Modello 1 nel codice (app invariata)
- [ ] Passo 2: logica pura (superset con serie diverse, recupero "–", 0 kg, mobilità, polpacci, valore di partenza)
- [ ] Passo 3: database v2 + migrazione + schermata d'errore + backup v2 (prova di migrazione con confronto prima/dopo)
- [ ] Passo 4: seduta guidata dalle schede del database
- [ ] Passo 5: primo avvio + Info + Ricarica un modello
- [ ] Passo 6: editor delle schede
- [ ] Passo 7: Modello 2
- [ ] Passo 8: storico e grafici
- [ ] Passo 9: segnaposto immagini
- [ ] Passo 10: rilascio (merge in `main` solo con conferma esplicita)
- [ ] **Utente: approvare la riscrittura generica delle note del Modello 2** (elenco prima/dopo proposto il 20/11) prima che vadano nel codice.
- [ ] Utente: immagini `ss`, `bdog`, `hfs`, `cr`, `cls` in `immagini-originali/` (JPG/PNG, 1200 × 896), poi `npm run immagini`. Più avanti `gb.jpg` dedicata (con il manubrio); fino ad allora `gb` usa `wu-bridge`.
- [ ] Prima di aggiornare il telefono attuale: **backup esportato e verificato** (checklist di rilascio).

## Da decidere
- [ ] Stringere il firewall: una sola regola Allow per node.exe (profilo Private, solo TCP 5173). I comandi li esegue l'utente come amministratore.
- [ ] Valutare la notifica di fine recupero (vibra/suona anche a telefono bloccato).

## Limiti noti (nessuna azione prevista)
- "Ultimo backup" si aggiorna al tocco di "Esporta" anche se il download fallisce: l'app non può sapere se il file è stato salvato.
- La vibrazione richiede "Vibrazione tattile" attiva nelle impostazioni del telefono.
- Import del prototipo provato solo con dati inventati: l'utente non ha un backup vero.
