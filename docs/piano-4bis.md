# Piano Fase 4-bis + Modello 2 (approvato il 2026-11-20, con correzioni)

Obiettivo: l'app va anche su un secondo telefono Android con un'altra scheda. Niente profili né account: ogni dispositivo ha i suoi dati.

**Cambio di piano (20/11/2026) — obiettivo unico:** l'app si avvia, fa scegliere Modello 1 o Modello 2 con le immagini e trova le schede pronte, con esercizi, immagini, sedute, recuperi, pesi, ripetizioni, storico e grafici funzionanti. **Niente funzioni in più.**

## Ramo e pubblicazione
- Tutto lo sviluppo sul ramo **`fase-4bis`**. Merge in `main` **solo al passo 10**, dopo conferma esplicita dell'utente.
- `.github/workflows/pubblica.yml` parte solo con `push` su `main` (e a mano con "Run workflow"). In più l'ambiente `github-pages` accetta pubblicazioni **solo da `main`** (regola del ramo impostata su GitHub). Quindi il push di `fase-4bis` non pubblica nulla: il workflow non viene modificato.
- `/chiudi` durante la Fase 4-bis: commit + push del ramo `fase-4bis`, mai di `main`.

## Modello dati
**Catalogo** (`src/catalog/exercises.ts`, nel codice): `id` stabile, `name`, `image?`, `equipment` generico, `notes` generali (niente istruzioni personali, niente lato di partenza), `metric`, `bandDirection?`, `unilateral`, `confirmSides?`, `kind?: 'mobility'`, `muscles`, `defaults { sets, repRange, restSec: number | null }`, `retired?`. Gli id esistenti non cambiano. Nuovo gruppo muscolare `polpacci`.

**Modelli** (`src/catalog/templates.ts`, nel codice): "Modello 1" (= schede A/B/C di oggi) e "Modello 2". «Schede vuote» tolte il 20/11 (senza editor non si potrebbero riempire).

**Schede** (IndexedDB, tabella `programs`):
- `Program { id, order, name (max 6 caratteri), subtitle?, notes?, notesPosition, warmup, circuit: 'no'|'yes'|'optional', items }`
- `ProgramItem { key, exerciseId, sets, repRange, restSec: number|null, supersetNext, startValue?, equipment?, notes? }`
- Lo stesso esercizio non può comparire due volte nella stessa scheda.
- **Id delle schede**: `A`, `B`, `C` li assegna **solo la migrazione** delle schede esistenti. Ogni scheda creata dopo (primo avvio, Ricarica un modello, Modello 2, schede vuote, «+ Scheda») riceve un id univoco generato, mai riusato, anche se si chiama «A». Così le sedute vecchie (`day = 'A'`) non finiscono mai, nello storico o nei grafici, insieme a una scheda diversa con lo stesso nome. Lo storico raggruppa per id della scheda e mostra `programName`. (`crypto.randomUUID` non esiste su http in Wi-Fi: si usa `newId()` del progetto, che è univoco allo stesso modo.)

**Sedute**: il campo `day` resta (stesso indice) e contiene l'**id della scheda** (`A`/`B`/`C` per tutte le sedute di oggi). Si aggiungono `programName` (copia del nome) e `plan` (copia delle voci previste al salvataggio).

**Bozze** (decisione, correzione 2): si tiene la tabella `drafts` con la chiave `day`, il cui valore diventa l'id della scheda. Gli id del Modello 1 sono proprio `A`/`B`/`C`, quindi la bozza in corso resta valida **senza copiare né cancellare nulla**. Niente tabella `drafts2`: meno passaggi e nessuna cancellazione da provare.

**Impostazioni** nuove: `userName` (dal 20/11 non più usato: resta nei dati solo per i backup già fatti), `startSide` (`left`/`right`, conta solo con i lati separati), `separateSides` («Separa i lati»), `templateId`, `onboarded`, `phase1Since` (data della prima seduta salvata con "Settimane 1-2" attive; vuota finché non ce n'è una), `phase1SnoozedUntil` (rinvio dell'avviso «Disattivarle?»).

## Migrazione (Dexie versione 2)
1. Crea le schede A/B/C del Modello 1.
2. Sedute: `programName` = `A`/`B`/`C`; `plan` ricostruito dal Modello 1 (tutte le sedute di oggi sono della versione 1 della scheda).
3. Bozze: nessuna modifica.
4. Impostazioni: `onboarded = true`, `templateId = 'm1'`, `startSide = 'left'`, `separateSides = true` (aggiunto il 20/11: prima i lati erano sempre separati). Se "Settimane 1-2" è attivo, `phase1Since` = data della prima seduta; **senza sedute resta vuota** (correzione del 20/11, passo 5: si scrive al salvataggio della prima seduta, così l'avviso non compare su uno storico vuoto).
5. Un'installazione nuova non ha il database vecchio, quindi la migrazione non parte e compare il primo avvio.

**Errori** (correzione 4):
- Se l'apertura del database o la migrazione falliscono, compare una schermata d'errore con il messaggio e il pulsante **"Scarica backup grezzo"**, che esporta tutto quello che si riesce a leggere con IndexedDB "nudo" (le API del browser usate direttamente, senza Dexie).
- Con l'evento `versionchange`/`blocked` (un'altra scheda del browser tiene aperta la versione vecchia) compare l'avviso **"Chiudi le altre schede dell'app"**.

## Regole della seduta
- **Superset con serie diverse**: dopo ✓ del primo alla serie *i*: se il secondo ha la serie *i* → «Passa a…», senza recupero; altrimenti parte il recupero del blocco (quello dell'ultima voce del superset). Dopo ✓ del secondo parte il suo recupero.
- **Recupero "–"** (`null`): nessun timer automatico dopo quella voce. Il pulsante manuale resta (recupero del blocco o 60 s).
- **0 kg**: accettato. L'e1RM ignora le serie a 0 kg (buco nel grafico) e il grafico Carico mostra 0. Per gli esercizi `kg` con sedute a 0 kg si aggiunge il grafico "Ripetizioni totali". A pari punteggio vince la serie con più ripetizioni. Nel riepilogo nessuna % se si parte da 0.
- **Mobilità** (`kind: 'mobility'`): esclusa da serie settimanali e indice per gruppo; nessun suggerimento di progressione; il grafico dell'esercizio resta.
- **Valore di partenza**: precompila in grigio (da confermare con ✓) solo se l'esercizio non ha storico. Ciò che non è un numero (es. "sulle ginocchia") va nelle note della voce.
- **Note**: nel riquadro "Esecuzione" prima quelle del catalogo, poi «Nota della scheda: …». «Come nella scheda A» si scrive per esteso.
- **Superset numerati per blocchi** (1a/1b, 2…), calcolati dall'ordine.
- **Lati degli esercizi a un arto (regola del 20/11)**: interruttore «Separa i lati» in Info.
  - **Spento** (di serie sulle installazioni nuove, tutti e due i modelli): un solo ✓ per serie, ripetizioni e kg «per lato» (scritto accanto alle ripetizioni), nessuna indicazione di sinistro/destro nella seduta.
  - **Acceso**: compare in Info la scelta del lato di partenza; la seduta mostra i tasti [Sx] [Dx] (esercizi con `confirmSides`) e i testi «Parti dal lato…», dal lato scelto. La migrazione lo accende sulle installazioni esistenti, con `startSide` attuale (sinistro): l'app resta com'era.
  - **Dati invariati**: una riga `SetLog` per serie con i valori per lato, uguali per i due lati; storico, e1RM, grafici e serie settimanali (1 serie = 1) identici nei due modi. Backup: `separateSides` incluso, «spento» se manca; backup v1 e prototipo validi.
  - Bloccato con un allenamento avviato (cronometro o circuito), come la ricarica di un modello. Spento con un «primo lato fatto» in bozza: quella serie torna «da confermare».
- **Settimane 1-2**: interruttore in Info. Nella seduta compare solo la riga «Settimane 1-2 attive dal gg/mm» (senza data finché non c'è una seduta salvata).
  - `phase1Since` si scrive al salvataggio di una seduta **solo** se Settimane 1-2 sono attive e la data è vuota.
  - 14 giorni dopo `phase1Since`, se ancora attive, nella seduta: «Settimane 1-2 attive da 2 settimane. Disattivarle?» → «Sì» (le spegne) / «Non ancora» (riappare dopo 7 giorni). Mai spegnimento automatico. Con `phase1Since` vuoto l'avviso non compare mai.
  - Riattivate da Info → `phase1Since` e rinvio azzerati: la data diventa quella della prima seduta salvata dopo.
- **Circuito facoltativo**: riquadro chiuso che si apre con un tocco.
- **Scheda senza voci** (possibile solo da un backup): la seduta mostra «Questa scheda non ha esercizi.» e il pulsante Inizia è disattivato. Nessun testo rimanda a un editor.
- **Carico in kg = per manubrio** (verificato: l'import del prototipo legge «2 x 10» come 10, prova in `tests/dataio.test.ts`). Nel Modello 2 rdl e fp partono da 6.

## Schermate
- **Primo avvio** (una sola volta, semplificato il 20/11): **una sola schermata** con le schede dei due modelli, la riga sulle Settimane 1-2 e «Inizia». Niente nome, niente lato.
- **Scelta del modello** (richiesta del 20/11, da fare al passo 5): ogni modello è una scheda toccabile con l'immagine grande in alto, il titolo «Modello 1» / «Modello 2» e sotto l'elenco delle schede con il numero di esercizi. Le stesse schede, con le immagini, anche in Info → «Ricarica un modello». **Titoli, testi e `alt` neutri**: nessuna parola che indichi il genere, né nel codice né nei testi.
  - Immagini: originali in `immagini-originali/modelli/` (`modello-1.jpg`, `modello-2.jpg`, esclusi da Git) (JPEG 1200 × 896) → `npm run immagini`, con un secondo passaggio in fondo allo script → `public/modelli/modello-1.webp`, `public/modelli/modello-2.webp`, **800 × 597** (proporzioni mantenute, mai ingrandite). `vite.config.ts` non cambia. Conversione al passo 5, con anteprima all'utente prima del commit. Il resto dello script resta uguale: le immagini degli esercizi devono rigenerarsi identiche.
  - Precache: le due immagini sono incluse, così il primo avvio funziona anche offline.
- **Primo avvio, regole (20/11)**: compare solo su un'installazione nuova = nessuna scheda e `onboarded` assente (un database v1 migrato ha le schede e `onboarded = true`). Mai usare il numero di sedute. Le scelte restano in memoria fino a «Inizia» (una transazione): se l'app si chiude prima, riparte dalla prima schermata senza dati parziali. Riga sulle Settimane 1-2: «Le prime 2 settimane: 2 serie per esercizio e più margine (RIR 3, cioè 3 ripetizioni di riserva). Si cambia in Info.»
- **Info**: Settimane 1-2, recupero automatico, «Separa i lati» (con il lato di partenza solo se acceso), «Ricarica un modello». Niente nome, niente editor.
- **Ricarica un modello (approvata il 20/11)**: le schede attuali vengono **cancellate** e sostituite da quelle del modello, con id nuovi. Lo storico resta perché ogni seduta ha la sua copia (`day` = id vecchio, `programName`, `plan`). Finestra con tre pulsanti «Scarica backup», «Sostituisci», «Annulla» e il testo «Le schede attuali verranno sostituite. Lo storico resta.». Bloccata se c'è un allenamento avviato (cronometro o circuito): il messaggio dice quale scheda. Un'unica transazione: schede, `templateId` e bozze non avviate (appartengono a schede che spariscono). Riferimenti all'id di una scheda fuori dalla tabella: `drafts` (bloccata o svuotata), `settings.templateId` (aggiornato), `localStorage tg.tab` (la ricarica parte da Info, quindi vale `I`; un id che non esiste più viene comunque ignorato), `sessions.day` (storico, non si tocca).
- **Editor delle schede**: eliminato il 20/11 (vedi «Idea futura» in `docs/aperti.md`). Nessuna schermata, pulsante o testo deve portare a un editor o farne capire l'esistenza.
- **Barra in basso**: nomi delle schede di massimo 6 caratteri. Prova a 360 px: pulsanti ≥ 48 px, nessun testo tagliato.

## Passi (un commit per passo; `tsc`, Vitest e Playwright verdi a ogni passo)
1. **Catalogo + Modello 1** nel codice; app invariata. Prove: confronto campo per campo Modello 1 = scheda di oggi; id invariati; note del catalogo senza «sinistro/destro».
2. **Logica pura**: superset, recupero null, 0 kg, mobilità, polpacci, valore di partenza (Vitest).
3. **Database v2 + migrazione + errori + backup v2** (+ prova a secco sui dati reali, solo a mano: `npm run prova-a-secco` con il backup in `dati-locali/`). Prova `migrazione.spec.ts`:
   - database v1 fittizio con sedute, serie, bozza in corso e impostazioni → dati presenti, cronometro attivo, Modello 1 presente, nessun primo avvio;
   - **confronto PRIMA/DOPO** sullo stesso database: e1RM e carico per esercizio, ripetizioni, serie settimanali, indice per gruppo, precompilazione di ogni esercizio, tutti identici;
   - migrazione forzata a fallire → schermata d'errore + backup grezzo;
   - avviso con la versione `blocked`.
   - Vitest per l'import dei backup v1, v2 e del prototipo.
4. **Seduta dalle schede del database** (barra dinamica, copia delle voci, lato, note, superset, scheda vuota, prova a 360 px).
5. **Primo avvio + Info + Ricarica un modello** (con le schede dei modelli illustrate). Prova Playwright: profilo pulito → primo avvio → le due immagini sono visibili e caricate (`naturalWidth > 0`) → scelta del Modello 2. Prova: migrazione → Ricarica Modello 2 → le sedute vecchie restano raggruppate sotto il loro `programName` e non si mescolano con le nuove (anche con una nuova scheda chiamata «A»). **Rifatto il 20/11** (cambio di piano): primo avvio in una schermata, via nome e lato, «Separa i lati» in Info, via «Schede vuote».
6. ~~Editor delle schede~~ **eliminato** il 20/11 (cambio di piano: obiettivo unico = l'app si avvia, fa scegliere Modello 1 o 2 e trova le schede pronte). Spostato in `docs/aperti.md` come idea futura.
7. ✅ (20/11, testi qui sopra) **Prove e controllo del contenuto del Modello 2** (il contenuto è stato anticipato al passo 5, strada A del 20/11, con i soli testi approvati) **+ in Info «Settimana tipo» e «Regole» dipendenti dal modello scelto**: per il Modello 2 solo testi già approvati in questo piano; se mancano, fermarsi e chiedere i testi all'utente.
8. **Storico e grafici** (raggruppamento per scheda, polpacci, esercizi fuori scheda).
9. **Ridotto il 20/11 a una prova automatica**: ogni esercizio del Modello 1 e del Modello 2 ha un file in `public/esercizi/` e l'immagine si carica nel browser (`naturalWidth > 0`). Se ne manca una: fermarsi e dire quale. (Controllo del 20/11 sui file: 26 esercizi, nessuna immagine mancante.)
10. **Rilascio**: checklist in `docs/rilascio-4bis.md`; merge in `main` solo dopo conferma esplicita.

## Controllo prima di ogni commit (correzione 9)
`CLAUDE.md`, `docs/` e il codice non devono contenere riferimenti a condizioni di salute: niente dolori o fastidi localizzati, patologie, infortuni. Restano ammesse le indicazioni tecniche generiche da manuale (es. «schiena neutra», «se un esercizio fa male, fermati»).

## Modello 2 — contenuto
Formato: id · serie × ripetizioni · recupero · superset · partenza · attrezzo della voce · note. Note riscritte in forma generica e approvate dall'utente il 20/11/2026.

Descrizioni e sottotitoli (approvati il 20/11): A «Full body», B «Full body — catena posteriore», C «Full body — glutei e core», D «leggera (~25 min)»; sottotitolo solo con la durata, nessun giorno: A, B, C «~60 min», D «~25 min».

Scheda A
- gsq · 3 × 10-12 · – · A1 · 6 kg · Kettlebell · Costole giù, schiena non inarcata; scendere fino a toccare il divano.
- cr · 2 × 15-20 · 90 s · A1 · corpo libero · – · Mano a un mobile per l'equilibrio; salita e discesa lente, 1 s di tenuta in alto. Progressione: a 2 × 20 pulite su un gradino (talloni sotto il livello del gradino), poi un manubrio in mano.
- row · 3 × 10-12 /lato · – · A2 · 6 kg · Manubrio · Mano libera sul divano, schiena piatta.
- pu · 3 × 8-12 · 75 s · A2 · livello 1 · – · Corpo dritto, glutei contratti. A 3 × 12 pulite si scende di un livello.
- gb · 2 × 12-15 · 75 s · – · 6 kg · Manubrio · Manubrio sul bacino con un asciugamano; prima retroversione del bacino, poi salire; si devono sentire i glutei, non la schiena.
- db · 3 × 6-8 /lato · – · A3 · – · – · Lombare appoggiata al materassino; se si stacca, accorciare il movimento.
- pa · 3 × 12-15 · 60 s · A3 · elastico 10 · – · Spalle basse, collo rilassato.
- hfs · 2 × 30-40 s /lato · – · – · – · – · In ginocchio su una gamba; gluteo contratto e bacino in retroversione, senza inarcarsi.

Scheda B
- rdl · 3 × 10-12 · 90 s · – · 6 kg · Manubri · Schiena neutra, manubri vicini alle gambe; scendere finché il bacino va indietro. Se l'esercizio fa male, fermarsi e ripetere solo il gesto senza carico.
- lpd · 3 × 12-15 · – · B1 · elastico 10 · – · Da seduti o in ginocchio; gomiti verso i fianchi, spalle lontane dalle orecchie. Elastico 20 se facile.
- fp · 3 × 10-12 · 75 s · B1 · 6 kg · Manubri · Ginocchia piegate, piedi a terra.
- ss · 3 × 8-10 /lato · – · B2 · 0 kg · – · Discesa verticale, appoggio a un mobile se serve. Progressione: 2 × 2 kg in mano dopo 3 × 10 per lato.
- cls · 2 × 12-15 /lato · 75 s · B2 · – · – · Fascia sopra le ginocchia; sdraiati sul fianco, ginocchia piegate, talloni uniti; bacino fermo, non ruotare indietro. Progressione: a 2 × 15 pulite fascia più in alto sulle cosce, poi 2 s di tenuta in apertura.
- sp · 2 × 15-20 s /lato · – · B3 · – · – · Partenza: sulle ginocchia, nessuna gamba sollevata. +5 s quando tutte le serie sono pulite; versione sui piedi a 30 s pulite.
- bdog · 2 × 6-8 /lato · 60 s · B3 · – · – · Lento, 2 s di tenuta; bacino fermo, schiena non inarcata.
- hfs · 2 × 30-40 s /lato · – · – · – · – · (come scheda A, per esteso)

Scheda C
- ht · 3 × 10-12 · – · C1 · 8 kg · Manubrio · Scapole sulla seduta del divano, mento verso il petto, bacino in retroversione in alto. Se l'esercizio fa male, passare al ponte glutei (gb).
- cr · 2 × 15-20 · 90 s · C1 · corpo libero · – · (come scheda A)
- row · 3 × 10-12 /lato · – · C2 · 6 kg · Manubrio · (come scheda A)
- pu · 3 × 8-12 · 75 s · C2 · livello 1 · – · (come scheda A)
- lc · 2 × 6-8 · 75 s · – · – · – · Ponte sui talloni, piedi sull'asciugamano. Settimane 1-2: solo fase eccentrica (piedi che si allontanano), ritorno con il bacino a terra.
- db · 3 × 6-8 /lato · – · C3 · – · – · (come scheda A)
- sp · 2 × 15-20 s /lato · 60 s · C3 · – · – · (come scheda B)
- hfs · 2 × 30-40 s /lato · – · – · – · – · (come scheda A)

Scheda D — leggera (~25 min). Note della scheda (in fondo): «Più 10-15 min di camminata o circuito leggero. Alla fine 5 min di defaticamento sdraiati, gambe appoggiate al muro.» Recupero 45 s, nessun superset, niente circuito.
- gb · 2 × 12 · 45 s · 0 kg · 0 o 6 kg.
- cls · 2 × 12 /lato · 45 s · nota della voce: Fascia sopra le ginocchia.
- db · 2 × 6 /lato · 45 s
- pa · 2 × 15 · 45 s · elastico 10
- bdog · 2 × 6 /lato · 45 s
- hfs · 2 × 40 s /lato · –

Riscaldamento: in tutte le schede del Modello 2, uguale a quello del Modello 1. Voce della barra (20/11, uguale nei due modelli): «2 hang alla barra da 15-20 s (anche con i piedi appoggiati, se serve)». Circuito: facoltativo in A, B e C, assente in D.

## Modello 2 — testi di Info (approvati il 20/11/2026, passo 7)
Nel codice: `src/catalog/infoTexts.ts` (Info sceglie i testi con `settings.templateId`; senza modello quelli del Modello 1, invariati).

**Settimana tipo**, sopra la tabella: «3 sedute a settimana, mai due giorni di fila, nell'ordine A → B → C. Se ne salti una, riprendi dalla successiva. Nei giorni “no” (molta stanchezza o poca energia) la seduta prevista diventa la D.»
Tabella «Esempio»: Lun A · Mar Camminata · Mer B · Gio Riposo · Ven C · Sab Camminata · Dom Riposo.

**Ogni giorno**:
- Passi: 6.000-8.000 al giorno.
- Al mattino: riscaldamento completo di 10 minuti; niente Romanian deadlift appena alzati.
- Alla sera: dopo una giornata pesante, 10 minuti sdraiati con le gambe appoggiate al muro prima di iniziare; se la stanchezza resta, fare la D.
- Scarpe da ginnastica con suola piatta e aderente; niente calze sul pavimento liscio (tranne nel leg curl con asciugamano).
- Per rialzarsi da terra passare da seduti. Bere prima e durante. Se ci si sente poco bene: sedersi e chiudere la serie.

Nel Modello 2 non compaiono «Tra A e B almeno 48 ore», la zona 2 e la camminata veloce.

**Regole**:
- RIR (ripetizioni di riserva): a fine serie devono restare 2-3 ripetizioni pulite.
- Settimana 1: 2 serie, RIR 3-4, si cura la tecnica. Settimana 2: 2-3 serie, RIR 3, si aggiustano i carichi. Dalla 3: serie della scheda e progressione.
- kg: prima si sale di ripetizioni nel range. Quando tutte le serie arrivano al massimo con RIR 2 o più, alla seduta dopo +1-2 kg e si riparte dal minimo.
- Elastico: stessa regola, 10 → 20 → 30 (combinabili).
- Push-up: a 3 × 12 pulite si scende di un livello.
- Side plank: +5 s quando tutte le serie sono pulite; sui piedi da 30 s pulite sulle ginocchia.
- Split squat: 2 × 2 kg in mano dopo 3 × 10 per lato.
- Calf raise: a 2 × 20 pulite si passa su un gradino, poi con un manubrio in mano.
- Clamshell: a 2 × 15 pulite la fascia sale sulle cosce, poi 2 s di tenuta in apertura.
- Superset: due esercizi alternati, recupero dopo la coppia. Se uno dei due ha una serie in più, l'ultima si fa da sola.
- Dolore: se un esercizio fa male, si torna alla versione o al carico precedente.
- Stop: dolore al petto, fiato corto insolito, capogiri o svenimento → fermarsi; se si ripete, sentire il medico.

Nel Modello 2 non compaiono la regola sui lati del Modello 1 né «Gambe senza carico extra (quando 14 kg diventa leggero)».

**Scala dei push-up**: in tutti e due i modelli, stessi livelli 1-5. Modello 1: «Passi al livello successivo quando fai 3 × 12 a RIR 2.» Modello 2: «A 3 × 12 pulite si scende di un livello.»

## Catalogo neutro (20/11/2026, passo 7)
Nel catalogo solo tecnica valida per chiunque; le parti legate al Modello 1 sono nella nota della voce del Modello 1, con testo identico (mostrate dopo la nota del catalogo come «Nota della scheda: …»):
- pu: «Scegli l'appoggio che ti tiene in 8-12 reps a RIR 2.»
- pull: «Rigorose, zero slancio (corridoio stretto). Se non ne completi 3: negative, discesa in 5 s.»
- ht: «Spingi le ginocchia contro la fascia.» (attrezzo del catalogo: «Manubrio»)
- lpd: «In ginocchio sotto la barra.»
- cls: «fascia in stoffa sopra le ginocchia» tolto dal catalogo (nel Modello 2 è nelle note delle voci di B e D).

Forme neutre: «Sdraiati sulla schiena» (lc, gb) al posto di «Supino/Supini», «Arnold press (da seduti)», circuito «Respiro affannoso, ma riesci a dire una frase breve.» al posto di «Affannato ma…».

## Esercizi nuovi
| id | nome | metrica | unilaterale | primari | secondari | immagine |
|---|---|---|---|---|---|---|
| gb | Ponte glutei | kg (0 ammesso) | no | glutei | femorali | `immagini-originali/gb.jpg` (immagine dedicata col manubrio, commit 9e16dfb) |
| ss | Split squat statico | kg (0 ammesso) | sì | quadricipiti, glutei | femorali | `immagini-originali/ss.jpg` |
| bdog | Bird dog | bodyweight | sì (alternati) | core | glutei, schiena | `immagini-originali/bdog.jpg` |
| hfs | Allungamento flessori dell'anca | time, mobilità | sì | quadricipiti | – | `immagini-originali/hfs.jpg` |
| cr | Calf raise in piedi | bodyweight | no | polpacci | – | `immagini-originali/cr.jpg` |
| cls | Clamshell con fascia | bodyweight | sì | glutei | – | `immagini-originali/cls.jpg` |

Immagini: JPG o PNG, consigliato 1200 × 896, poi `npm run immagini` → `public/esercizi/<id>.webp`.
