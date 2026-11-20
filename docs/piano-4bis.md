# Piano Fase 4-bis + Modello 2 (approvato il 2026-11-20, con correzioni)

Obiettivo: l'app va anche su un secondo telefono Android con un'altra scheda. Niente profili né account: ogni dispositivo ha i suoi dati.

## Ramo e pubblicazione
- Tutto lo sviluppo sul ramo **`fase-4bis`**. Merge in `main` **solo al passo 10**, dopo conferma esplicita dell'utente.
- `.github/workflows/pubblica.yml` parte solo con `push` su `main` (e a mano con "Run workflow"). In più l'ambiente `github-pages` accetta pubblicazioni **solo da `main`** (regola del ramo impostata su GitHub). Quindi il push di `fase-4bis` non pubblica nulla: il workflow non viene modificato.
- `/chiudi` durante la Fase 4-bis: commit + push del ramo `fase-4bis`, mai di `main`.

## Modello dati
**Catalogo** (`src/catalog/exercises.ts`, nel codice): `id` stabile, `name`, `image?`, `equipment` generico, `notes` generali (niente istruzioni personali, niente lato di partenza), `metric`, `bandDirection?`, `unilateral`, `confirmSides?`, `kind?: 'mobility'`, `muscles`, `defaults { sets, repRange, restSec: number | null }`, `retired?`. Gli id esistenti non cambiano. Nuovo gruppo muscolare `polpacci`.

**Modelli** (`src/catalog/templates.ts`, nel codice): "Modello 1" (= schede A/B/C di oggi), "Modello 2", "Schede vuote" (= una scheda "A" vuota).

**Schede** (IndexedDB, tabella `programs`):
- `Program { id, order, name (max 6 caratteri), subtitle?, notes?, notesPosition, warmup, circuit: 'no'|'yes'|'optional', items }`
- `ProgramItem { key, exerciseId, sets, repRange, restSec: number|null, supersetNext, startValue?, equipment?, notes? }`
- Lo stesso esercizio non può comparire due volte nella stessa scheda.
- **Id delle schede**: `A`, `B`, `C` li assegna **solo la migrazione** delle schede esistenti. Ogni scheda creata dopo (primo avvio, Ricarica un modello, Modello 2, schede vuote, «+ Scheda») riceve un id univoco generato, mai riusato, anche se si chiama «A». Così le sedute vecchie (`day = 'A'`) non finiscono mai, nello storico o nei grafici, insieme a una scheda diversa con lo stesso nome. Lo storico raggruppa per id della scheda e mostra `programName`. (`crypto.randomUUID` non esiste su http in Wi-Fi: si usa `newId()` del progetto, che è univoco allo stesso modo.)

**Sedute**: il campo `day` resta (stesso indice) e contiene l'**id della scheda** (`A`/`B`/`C` per tutte le sedute di oggi). Si aggiungono `programName` (copia del nome) e `plan` (copia delle voci previste al salvataggio).

**Bozze** (decisione, correzione 2): si tiene la tabella `drafts` con la chiave `day`, il cui valore diventa l'id della scheda. Gli id del Modello 1 sono proprio `A`/`B`/`C`, quindi la bozza in corso resta valida **senza copiare né cancellare nulla**. Niente tabella `drafts2`: meno passaggi e nessuna cancellazione da provare.

**Impostazioni** nuove: `userName`, `startSide` (`left`/`right`), `templateId`, `onboarded`, `phase1Since` (data di attivazione di "Settimane 1-2").

## Migrazione (Dexie versione 2)
1. Crea le schede A/B/C del Modello 1.
2. Sedute: `programName` = `A`/`B`/`C`; `plan` ricostruito dal Modello 1 (tutte le sedute di oggi sono della versione 1 della scheda).
3. Bozze: nessuna modifica.
4. Impostazioni: `onboarded = true`, `templateId = 'm1'`, `startSide = 'left'`. Se "Settimane 1-2" è attivo, `phase1Since` = data della prima seduta (oggi se non ce ne sono).
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
- **Lato di partenza** (Info): ordine dei tasti Sx/Dx e testi «Parti dal lato…».
- **Settimane 1-2**: interruttore in Info. Nella seduta compare solo la riga «Settimane 1-2 attive dal gg/mm».
- **Circuito facoltativo**: riquadro chiuso che si apre con un tocco.
- **Scheda senza voci**: la seduta mostra «Aggiungi esercizi da Info» e il pulsante Inizia è disattivato.
- **Carico in kg = per manubrio** (verificato: l'import del prototipo legge «2 x 10» come 10, prova in `tests/dataio.test.ts`). Nel Modello 2 rdl e fp partono da 6.

## Schermate
- **Primo avvio** (una sola volta): nome (solo sul dispositivo) → modello → lato di partenza.
- **Info**: nome, lato, Settimane 1-2, «Modifica le schede», «Ricarica un modello» (con conferma; non cancella lo storico; bloccato se c'è un allenamento in corso).
- **Editor**: da 1 a 4 schede (rinomina, aggiungi, elimina); per ogni scheda riscaldamento, circuito, note e posizione; voci con ↑ ↓ ✕, "superset con il successivo", serie, range, recupero, partenza, attrezzo e note. Nel catalogo gli esercizi già presenti nella scheda sono disattivati. L'editor è bloccato per la scheda con un allenamento in corso.
- **Barra in basso**: nomi delle schede di massimo 6 caratteri. Prova a 360 px: pulsanti ≥ 48 px, nessun testo tagliato.

## Passi (un commit per passo; `tsc`, Vitest e Playwright verdi a ogni passo)
1. **Catalogo + Modello 1** nel codice; app invariata. Prove: confronto campo per campo Modello 1 = scheda di oggi; id invariati; note del catalogo senza «sinistro/destro».
2. **Logica pura**: superset, recupero null, 0 kg, mobilità, polpacci, valore di partenza (Vitest).
3. **Database v2 + migrazione + errori + backup v2**. Prova `migrazione.spec.ts`:
   - database v1 fittizio con sedute, serie, bozza in corso e impostazioni → dati presenti, cronometro attivo, Modello 1 presente, nessun primo avvio;
   - **confronto PRIMA/DOPO** sullo stesso database: e1RM e carico per esercizio, ripetizioni, serie settimanali, indice per gruppo, precompilazione di ogni esercizio, tutti identici;
   - migrazione forzata a fallire → schermata d'errore + backup grezzo;
   - avviso con la versione `blocked`.
   - Vitest per l'import dei backup v1, v2 e del prototipo.
4. **Seduta dalle schede del database** (barra dinamica, copia delle voci, lato, note, superset, scheda vuota, prova a 360 px).
5. **Primo avvio + Info + Ricarica un modello**. Prova: migrazione → Ricarica Modello 2 → le sedute vecchie restano raggruppate sotto il loro `programName` e non si mescolano con le nuove (anche con una nuova scheda chiamata «A»).
6. **Editor delle schede**.
7. **Modello 2** (contenuto + prove).
8. **Storico e grafici** (raggruppamento per scheda, polpacci, esercizi fuori scheda).
9. **Segnaposto immagini**; immagini vere quando arrivano.
10. **Rilascio**: checklist in `docs/rilascio-4bis.md`; merge in `main` solo dopo conferma esplicita.

## Controllo prima di ogni commit (correzione 9)
`CLAUDE.md`, `docs/` e il codice non devono contenere riferimenti a condizioni di salute: niente dolori o fastidi localizzati, patologie, infortuni. Restano ammesse le indicazioni tecniche generiche da manuale (es. «schiena neutra», «se un esercizio fa male, fermati»).

## Modello 2 — contenuto
Formato: id · serie × ripetizioni · recupero · superset · partenza · attrezzo della voce · note. Note riscritte in forma generica e approvate dall'utente il 20/11/2026.

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
- rdl · 3 × 10-12 · 90 s · – · 6 kg · Manubri · Schiena neutra, manubri vicini alle gambe; scendere finché il bacino va indietro. Se compare dolore, fermarsi e ripetere solo il gesto senza carico. Evitare nella prima ora dopo il risveglio.
- lpd · 3 × 12-15 · – · B1 · elastico 10 · – · Da seduti o in ginocchio; gomiti verso i fianchi, spalle lontane dalle orecchie. Elastico 20 se facile.
- fp · 3 × 10-12 · 75 s · B1 · 6 kg · Manubri · Ginocchia piegate, piedi a terra.
- ss · 3 × 8-10 /lato · – · B2 · 0 kg · – · Discesa verticale, appoggio a un mobile se serve. Progressione: 2 × 2 kg in mano dopo 3 × 10 per lato.
- cls · 2 × 12-15 /lato · 75 s · B2 · – · – · Fascia sopra le ginocchia; sdraiati sul fianco, ginocchia piegate, talloni uniti; bacino fermo, non ruotare indietro. Progressione: a 2 × 15 pulite fascia più in alto sulle cosce, poi 2 s di tenuta in apertura.
- sp · 2 × 15-20 s /lato · – · B3 · – · – · Partenza: sulle ginocchia, nessuna gamba sollevata. +5 s quando tutte le serie sono pulite; versione sui piedi a 30 s pulite.
- bdog · 2 × 6-8 /lato · 60 s · B3 · – · – · Lento, 2 s di tenuta; bacino fermo, schiena non inarcata.
- hfs · 2 × 30-40 s /lato · – · – · – · – · (come scheda A, per esteso)

Scheda C
- ht · 3 × 10-12 · – · C1 · 8 kg · Manubrio · Scapole sulla seduta del divano, mento verso il petto, bacino in retroversione in alto. Se compare dolore, passare al ponte glutei (gb).
- cr · 2 × 15-20 · 90 s · C1 · corpo libero · – · (come scheda A)
- row · 3 × 10-12 /lato · – · C2 · 6 kg · Manubrio · (come scheda A)
- pu · 3 × 8-12 · 75 s · C2 · livello 1 · – · (come scheda A)
- lc · 2 × 6-8 · 75 s · – · – · – · Ponte sui talloni, piedi sull'asciugamano. Settimane 1-2: solo fase eccentrica (piedi che si allontanano), ritorno con il bacino a terra.
- db · 3 × 6-8 /lato · – · C3 · – · – · (come scheda A)
- sp · 2 × 15-20 s /lato · 60 s · C3 · – · – · (come scheda B)
- hfs · 2 × 30-40 s /lato · – · – · – · – · (come scheda A)

Scheda D — leggera (~25 min). Note della scheda (in fondo): «Più 10-15 min di camminata o circuito leggero. Alla fine 5 min di defaticamento sdraiati, gambe appoggiate al muro.» Recupero 45 s, nessun superset, niente circuito.
- gb · 2 × 12 · 45 s · 0 kg · 0 o 6 kg.
- cls · 2 × 12 /lato · 45 s
- db · 2 × 6 /lato · 45 s
- pa · 2 × 15 · 45 s · elastico 10
- bdog · 2 × 6 /lato · 45 s
- hfs · 2 × 40 s /lato · –

Riscaldamento: in tutte le schede del Modello 2, uguale a quello di oggi. Circuito: facoltativo in A, B e C, assente in D.

## Esercizi nuovi
| id | nome | metrica | unilaterale | primari | secondari | immagine |
|---|---|---|---|---|---|---|
| gb | Ponte glutei | kg (0 ammesso) | no | glutei | femorali | `immagini-originali/gb.jpg` (oggi è ancora una copia di `wu-bridge.jpg`: da sostituire con la foto col manubrio, senza toccare il codice) |
| ss | Split squat statico | kg (0 ammesso) | sì | quadricipiti, glutei | femorali | `immagini-originali/ss.jpg` |
| bdog | Bird dog | bodyweight | sì (alternati) | core | glutei, schiena | `immagini-originali/bdog.jpg` |
| hfs | Allungamento flessori dell'anca | time, mobilità | sì | quadricipiti | – | `immagini-originali/hfs.jpg` |
| cr | Calf raise in piedi | bodyweight | no | polpacci | – | `immagini-originali/cr.jpg` |
| cls | Clamshell con fascia | bodyweight | sì | glutei | – | `immagini-originali/cls.jpg` |

Immagini: JPG o PNG, consigliato 1200 × 896, poi `npm run immagini` → `public/esercizi/<id>.webp`.
