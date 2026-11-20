# Piano Fase 5 — Salvataggio automatico su Google Drive (PRELIMINARE, da approvare)

Scritto il 2026-11-20. **Nessun codice finché l'utente non approva.** Ramo di lavoro: `fase-5-drive` (commit e push solo del ramo; `main` solo al rilascio, con conferma esplicita: ogni push su `main` pubblica il sito e fa comparire l'avviso di aggiornamento sui telefoni).

## Obiettivo
Il backup si salva da solo su Google Drive, così non serve esportarlo a mano. Ognuno usa **un solo telefono**: serve a **non perdere i dati**, non a sincronizzarli tra dispositivi.

## Scelte già fatte (dall'utente)
- Google Drive, **cartella nascosta dell'app** (`appDataFolder`, permesso `drive.appdata`): l'app vede solo i propri file, non quelli dell'utente. Niente server proprio, niente database esterno.
- Si carica il **backup v2 attuale**, lo stesso formato dell'export manuale.
- Il backup manuale (Esporta/Importa) **resta**.
- Repository pubblico: nel codice **solo l'ID client OAuth** (pubblico per natura). **Mai** segreti del client, token o email.

## Fonti verificate il 20/11/2026 (documentazione ufficiale Google)
- [GIS-T] Token model: https://developers.google.com/identity/oauth2/web/guides/use-token-model
- [GIS-C] Scelta del modello: https://developers.google.com/identity/oauth2/web/guides/choose-authorization-model
- [GIS-R] Riferimento JS: https://developers.google.com/identity/oauth2/web/reference/js-reference
- [GIS-M] Migrazione a GIS: https://developers.google.com/identity/oauth2/web/guides/migration-to-gis
- [GIS-B] Browser supportati: https://developers.google.com/identity/gsi/web/guides/supported-browsers
- [D-AD] Cartella dei dati dell'app: https://developers.google.com/workspace/drive/api/guides/appdata
- [D-SC] Permessi Drive: https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- [D-UP] Caricamenti: https://developers.google.com/workspace/drive/api/guides/manage-uploads
- [D-LI] Limiti d'uso: https://developers.google.com/workspace/drive/api/guides/limits
- [D-RV] Revisioni: https://developers.google.com/workspace/drive/api/guides/manage-revisions
- [C-AU] Pubblico dell'app / stato di pubblicazione: https://support.google.com/cloud/answer/15549945
- [C-VE] Verifica dell'app: https://support.google.com/cloud/answer/13463073
- [C-BV] Verifica del marchio: https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification
- [C-ID] ID client: https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid

Legenda della sicurezza: **verificato** = scritto nella documentazione; **dedotto** = ragionamento su frasi della documentazione, non scritto esplicitamente; **da provare** = la documentazione non ne parla, va provato sul telefono vero.

---

## a) Accesso: Google Identity Services, modello a token
**Cosa dice Google**
- Il modello a token (`initTokenClient` / `requestAccessToken`) gira tutto nel browser, senza server; quello a codice richiede un backend per ricevere il codice e conservare i refresh token [GIS-C]. → Per noi **solo modello a token** (verificato).
- Il consenso si mostra in una **finestra di dialogo** (popup), unica modalità ammessa [GIS-T] (verificato).
- **Serve un gesto dell'utente** (tocco su un pulsante) per chiedere il token, «anche se c'era una richiesta precedente» [GIS-M] (verificato).
- Finestre bloccate: `error_callback` riceve `popup_failed_to_open` o `popup_closed` [GIS-R]; l'esempio di Google mostra «Failed to open popup. Please disable popup blockers.» [GIS-M] (verificato).
- Browser: Chrome su Android è supportato; le **WebView** Android **non** sono supportate per l'accesso [GIS-B] (verificato). La **PWA installata** (finestra «standalone») **non è citata** (da provare).
- L'autorizzazione non richiede cookie [GIS-M]; FedCM e cookie di terze parti riguardano «Accedi con Google»/One Tap, non il modello a token (dedotto).

**Proposta**
- Caricare lo script `https://accounts.google.com/gsi/client` **solo quando serve** (interruttore acceso o ripristino), mai all'avvio: l'app resta leggera e funziona offline.
- Ogni richiesta di token parte **dentro il tocco** di un pulsante, senza `await` prima della chiamata.
- Permesso richiesto: **solo** `drive.appdata` (vedi c per l'account mostrato in Info).
- Se la finestra non si apre: messaggio in chiaro («Il telefono ha bloccato la finestra di Google: riprova»), nessun blocco dell'app.

**Sicurezza: media.** Il funzionamento dentro la PWA installata su Android va **provato per primo** (passo 1 della suddivisione): è il punto che può far cadere il piano (vedi j).

## b) Durata del token e riaccesso
**Cosa dice Google**
- Il modello a token **non dà refresh token** [GIS-C]; il token d'accesso dura poco: `expires_in` è indicato dalla risposta, la durata esatta «può variare» [GIS-R], negli esempi 3599 s (~1 ora) [GIS-M] (verificato).
- Nessun rinnovo automatico: quando un'API risponde 401 si richiama `requestAccessToken()`, sempre con un gesto dell'utente [GIS-M] (verificato).
- `prompt: ''` → il consenso compare solo la prima volta; `login_hint` → salta la scelta dell'account [GIS-R] (verificato). Se con `prompt: ''` la finestra si apra e si chiuda da sola senza tocchi: **non scritto** (da provare).
- Il token non va conservato: si ottiene di nuovo quando serve [GIS-T] (verificato).

**Proposta**
- Token **solo in memoria** (mai in IndexedDB/localStorage): chiudendo l'app si perde, ed è voluto.
- Il gesto c'è già: **«Termina e salva»**. Nello stesso tocco: (1) la seduta si salva nel database come oggi, **sempre e per prima**; (2) se il token manca o è scaduto, parte `requestAccessToken({ prompt: '', login_hint })`; (3) col token arriva il caricamento.
- Se l'accesso scade o fallisce a metà seduta: **non succede niente durante l'allenamento** (nessuna chiamata a Drive prima di «Termina e salva»). Se fallisce al salvataggio: la seduta è comunque salvata sul telefono, il backup resta «in attesa» (vedi d).
- Da provare sul telefono: quanto disturba la finestra di Google a fine seduta. Se disturba, alternativa: chiedere il token a «Inizia» (stesso gesto, ~1 ora di validità, una seduta dura ~45 min).

**Sicurezza: media** (dipende da come appare la finestra nella PWA).

## c) Google Cloud: progetto, consenso, ID client, Test o Produzione
**Cosa dice Google**
- `drive.appdata` è un permesso **non sensibile** [D-AD, D-SC] (verificato).
- Con soli permessi non sensibili la verifica dell'app **non è obbligatoria** [C-VE] (verificato); l'avviso «app non verificata» compare per permessi sensibili o con restrizioni [C-AU] → con solo `drive.appdata` non dovrebbe comparire (dedotto). Il limite di 100 utenti vale solo per permessi sensibili non approvati [C-AU] (verificato).
- **Verifica del marchio** (nome e logo sulla schermata di consenso) solo se l'app è Esterna e Pubblicata e si vuole mostrare logo o nome [C-BV] (verificato); richiede home page e privacy su un **dominio verificato di proprietà** [C-BV]. Se `github.io` sia accettato: **non scritto** (da provare; probabilmente no, perché il dominio non è nostro).
- **Modalità Test**: massimo 100 utenti di prova aggiunti a mano; **avviso** prima dell'autorizzazione; **le autorizzazioni scadono dopo 7 giorni** dal consenso [C-AU] (verificato). Effetto sul modello a token: nuovo consenso ogni settimana (dedotto).
- **Modalità Personale**: niente verifica, niente scadenza di 7 giorni, ma **solo l'account Google che ha creato il progetto** e scelta definitiva alla creazione [C-AU] (verificato) → non va bene se il secondo telefono usa un altro account.
- ID client «Applicazione web»: origini JavaScript autorizzate = schema + nome host, **senza percorso**; per lo sviluppo `http://localhost` e `http://localhost:<porta>` [C-ID] (verificato). Tempi di attivazione delle modifiche: non scritti (da provare).

**Proposta: Esterna, «In produzione», solo `drive.appdata`, senza logo** (niente verifica del marchio). Limiti da accettare: la schermata di consenso potrebbe non mostrare il nome «TeacherGym» ma un riferimento generico/al dominio (da vedere). Alternativa: modalità Test con i due account come utenti di prova, accettando avviso e nuovo consenso ogni 7 giorni.
- Account mostrato in Info: il token con solo `drive.appdata` non dà l'email. Opzioni: aggiungere `openid email` (non sensibili, l'email resta **solo sul telefono**, mai nel backup né nel codice), oppure mostrare solo «Collegato». Decisione dell'utente.

**Passaggi a mano dell'utente nella console Google** (li guiderò passo passo):
1. https://console.cloud.google.com → nuovo progetto (nome neutro, es. «teachergym»).
2. «API e servizi» → Libreria → abilitare **Google Drive API**.
3. «Google Auth Platform» → Branding: nome app, email di assistenza e contatto dello sviluppatore (restano in Google, **mai** nel repository).
4. Pubblico: tipo **Esterno**; stato **In produzione** (o Test + i due account come utenti di prova).
5. Accesso ai dati: aggiungere il permesso `.../auth/drive.appdata` (e `openid`, `email` se scelti).
6. Client → «Crea client» → **Applicazione web**; origini: `https://teachertrip.github.io`, `http://localhost`, `http://localhost:5173`. Nessun URI di reindirizzamento.
7. Copiare **solo l'ID client** e darlo a Claude (è pubblico). Il «client secret», se mostrato, **non serve e non va copiato da nessuna parte**.

**Sicurezza: alta** sui fatti verificati; **media** sull'aspetto della schermata di consenso senza verifica del marchio.

## d) Quando salvare
- Dopo **ogni seduta salvata** («Termina e salva») e **a mano** da Info («Salva ora su Google Drive»).
- **Senza rete**: la seduta è salvata sul telefono; il backup segna «in attesa» (voce nelle impostazioni). Quando torna la rete: se il token è ancora valido riparte **da solo** (evento `online`); altrimenti serve un tocco (avviso breve in basso «Backup su Drive in attesa — Salva ora», chiudibile, e voce in Info). Motivo: senza gesto Google non dà un token nuovo (b).
- Mai durante allenamento, recupero o circuito: niente rete, niente finestre.
- Errori Drive 403/429/5xx: nuovi tentativi con attesa crescente (1, 2, 4… s, massimo 32 s), come raccomanda Google [D-LI] (verificato).

**Sicurezza: alta** per la logica; **media** per l'«automatico» (spesso servirà un tocco).

## e) Versioni
- Google conserva da sé le vecchie revisioni dei file, ma le può cancellare (in genere dopo 30 giorni o oltre 100 revisioni) [D-RV] (verificato): **non è una garanzia**.
- **Proposta: file separati, gli ultimi N = 10**, nome `teachergym-backup-AAAA-MM-GG-HHMMSS.json` nella cartella nascosta; dopo un caricamento riuscito si cancellano i più vecchi oltre i 10. Peso: pochi kB a file; costo in quota trascurabile (creazione 50 unità, elenco 100, su 325.000 al minuto per utente [D-LI], verificato). Se lo spazio della cartella nascosta conti nello spazio Google dell'utente: **non scritto** (da provare; comunque pochi kB).
- **Due salvataggi ravvicinati**: una sola coda; se ne arriva un secondo mentre il primo è in corso, si fa **un solo** caricamento successivo con i dati più recenti. Il backup contiene sempre **tutto** lo storico, quindi l'ultimo file basta da solo.
- Caricamento «multipart» (file e nome insieme, fino a 5 MB) [D-UP] (verificato): il backup è molto più piccolo.

**Sicurezza: alta.**

## f) Ripristino
- **Primo avvio** di un telefono nuovo: sotto la scelta del modello, pulsante «**Ripristina da Google Drive**» → accesso → elenco dei backup (data e ora, numero di sedute) → conferma → stesso import del backup manuale (sostituisce tutti i dati) → app pronta, **niente scelta del modello** (è nel backup). Se non ci sono backup: messaggio, si torna alla scelta del modello.
- **Info** → «Ripristina da Google Drive» con conferma esplicita («Sostituisce tutti i dati di questo telefono»), bloccato con un allenamento avviato (come «Ricarica un modello»).
- Prima di sostituire, il ripristino da Info offre di **esportare** il backup attuale (rete di sicurezza).

**Sicurezza: alta** (riusa l'import v2 già provato).

## g) Info
- Interruttore «**Salvataggio su Google Drive**» (spento di serie). Acceso → accesso a Google (gesto) → primo salvataggio subito.
- «Account collegato» (email o «Collegato», vedi c), «**Ultimo salvataggio riuscito**: gg/mm/aaaa hh:mm», eventuale **errore in chiaro** («Nessuna rete: il backup aspetta», «Accesso scaduto: tocca Salva ora», «Finestra di Google bloccata»…), «Salva ora», «Ripristina», «**Scollega**» (revoca con `google.accounts.oauth2.revoke` [GIS-R], verificato; i file su Drive restano, con una riga che lo dice).
- **Promemoria ogni 6 sedute**: si spegne solo se il salvataggio su Drive è attivo **e** l'ultimo salvataggio riuscito è recente (proposta: ≤ 7 giorni e dopo l'ultima seduta salvata). Altrimenti resta come oggi.
- Database: solo voci nuove nella tabella delle impostazioni (chiave-valore) → **nessun cambio di versione** del database (dedotto dal modello attuale, da confermare al passo 2).

## h) Privacy
- Cosa: lo **stesso file** dell'export manuale (sedute, serie, note, impostazioni dell'app). Dove: nella **cartella nascosta dell'app** nel Drive di ciascuno; non visibile dall'interfaccia di Drive, accessibile solo a questa app [D-AD] (verificato). Nessun server nostro, nessuna copia altrove.
- L'utente può cancellare la cartella nascosta a mano; viene cancellata quando si rimuove l'app dal proprio Drive [D-AD] (verificato; il percorso preciso nelle impostazioni di Drive va controllato).
- Riga in Info (proposta): «Il backup va nella cartella nascosta di TeacherGym sul tuo Google Drive: la vede solo quest'app, non le altre né chi sviluppa l'app.»
- Email: se mostrata, solo sul telefono, **mai** nel backup, nel codice o nei log.

## i) Prove
- **Vitest**: logica pura (nomi dei file, scelta dei 10 da tenere, coda dei salvataggi ravvicinati, attesa crescente, regola del promemoria) con un Drive finto in memoria.
- **Playwright**: script finto di Google (`google.accounts.oauth2` sostituito con `addInitScript`) e risposte di Drive intercettate con `page.route` → **nessuna chiamata vera**. Casi: accesso riuscito/negato/finestra bloccata, token scaduto (401), senza rete → in attesa → rete tornata, salvataggi ravvicinati, ripristino al primo avvio e da Info, Scollega, promemoria.
- **Prova manuale con un account vero** (`npm run prova-drive` o checklist), fuori dalla CI: su `localhost` e poi sul telefono vero con la PWA installata.
- `npm run prova-aggiornamento` ripetuta al rilascio.

## j) Rischi e alternative
| Rischio | Probabilità | Alternativa |
|---|---|---|
| Finestra di Google non funziona nella PWA installata | da provare (passo 1) | Accesso dal sito in Chrome (non installato) solo per il collegamento; oppure **Web Share**: a fine seduta «Condividi backup» → Drive (manuale ma 2 tocchi) |
| Finestra a fine seduta troppo invasiva | media | Token chiesto a «Inizia»; oppure salvataggio solo da Info con promemoria |
| Schermata di consenso poco chiara senza verifica del marchio | media | Modalità Test con i due account (avviso + consenso ogni 7 giorni) |
| Google cambia regole o quote (cambio quote annunciato per il 2026 [D-LI]) | bassa per pochi kB | Il backup manuale resta sempre |
| Token rubato da script estranei | bassa (nessuno script di terzi oltre a Google) | Token solo in memoria, permesso minimo `drive.appdata` |

---

## Domande per l'utente (decisioni)
1. **Produzione** (senza verifica, nessuna scadenza settimanale, consenso forse meno «pulito») o **Test** (avviso + nuovo consenso ogni 7 giorni)?
2. Mostrare l'**email** dell'account in Info (permessi in più `openid email`, email solo sul telefono) o solo «Collegato»?
3. **N = 10** backup tenuti va bene?
4. Token chiesto a **«Termina e salva»** (proposta) o a **«Inizia»**?
5. Promemoria: «recente» = **7 giorni** e dopo l'ultima seduta: va bene?
6. Il secondo telefono userà un **altro account Google**? (Se usassero lo stesso account, i backup finirebbero nella stessa cartella: servirebbe un nome del dispositivo nel file.)
7. Se la prova nella PWA installata fallisce: preferisci l'alternativa «collegamento da Chrome» o «Condividi backup»?

## Suddivisione proposta (un commit per passo; `tsc`, Vitest e Playwright verdi a ogni passo)
1. **Prova di fattibilità** (prima di tutto il resto): utente → console Google (passaggi in c); Claude → pagina di prova minima, solo su `localhost` e solo nel ramo, che chiede il token e scrive/legge un file nella cartella nascosta; prova sul telefono vero con la PWA installata. Se fallisce → stop e scelta dell'alternativa (j).
2. Modulo Drive in logica pura (nomi, rotazione dei 10, coda, attesa crescente, promemoria) + Vitest; ID client in un file di configurazione versionato.
3. Accesso Google (caricamento dello script solo quando serve, token in memoria, errori in chiaro) + Playwright con Google finto.
4. Salvataggio dopo «Termina e salva» + «in attesa» senza rete + «Salva ora».
5. Info: interruttore, account, ultimo salvataggio, errore, Scollega, riga sulla privacy, regola del promemoria.
6. Ripristino: primo avvio e Info.
7. Prova manuale con account vero (localhost, poi telefono) + documentazione.
8. Rilascio: prove, `npm run prova-aggiornamento`, merge in `main` **solo con conferma esplicita**.
