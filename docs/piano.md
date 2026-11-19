# Piano TeacherGym (approvato il 2026-11-19)

## Stack
- Vite + React + TypeScript; CSS semplice con variabili, tema chiaro/scuro automatico.
- Dexie.js (IndexedDB) + dexie-react-hooks.
- vite-plugin-pwa con aggiornamento **a richiesta** (avviso "Nuova versione: aggiorna"), mai ricarica a metà seduta.
- Chart.js per i grafici.
- Vitest per i test della logica.
- GitHub Actions → GitHub Pages, `base: '/allenamento/'`.

## Struttura
```
src/program/   scheda versionata (program.ts, cardio.ts, muscles.ts, types.ts)
src/db/        schema Dexie, migrazioni, letture/scritture
src/logic/     funzioni pure: precompilazione, difficoltà, progressione, e1RM, indici, backup, import prototipo
src/hooks/     timer, wake lock, suono/vibrazione
src/screens/   Seduta, Storico, Grafici, Info
src/components/
tests/
docs/          piano, storia, punti aperti, prototipo
```

## Schermate
Barra di navigazione in basso: **A · B · C · Storico · Grafici · Info**.
- **Seduta**: interruttore Settimane 1-2 (max 2 serie), riscaldamento, schede esercizio (badge superset, attrezzo, serie × range, recupero, note apribili, spazio immagine, "Parti dal sinistro" per gli unilaterali, suggerimento di progressione). Righe serie con campi per metrica; precompilate in grigio, confermate con ✓ o modifica. Bozza salvata di continuo. Salvataggio con avviso sulle serie non confermate (non vengono registrate). Seduta C: circuito cardio, registrato nello storico.
- **Timer di recupero** (Fase 5): +15 s, Stop, suono + vibrazione, basato sull'orario di fine.
- **Storico**: elenco per data, dettaglio, modifica (valori, data, note), eliminazione con conferma.
- **Grafici** (Fase 5): per esercizio (Partenza → Attuale, Δ assoluta e %) e per gruppo muscolare (indice normalizzato 100 = prima seduta; serie settimanali primario 1 / secondario 0,5).
- **Info**: settimana tipo, regole, stato archiviazione persistente, export/import JSON, import prototipo, data ultimo backup, avviso "disinstallare = perdere i dati". Promemoria backup ogni 6 sedute.

## Elastici: direzione (decisione del 2026-11-19)
Ogni esercizio `band` ha `bandDirection`:
- **assistance** (trazioni): elastico più leggero = più difficile. Valori: 30 → 20 → 10 → 0 (nessuno).
- **resistance** (lat pulldown, band pull-apart): elastico più pesante = più difficile. Valori: 10 → 20 → 30 → 40 (10+30) → 50 (20+30) → 60 (tutti). Il carico salvato è il totale.

La direzione determina: gradini dell'indice, orientamento dei grafici, testo del suggerimento di progressione. Test dedicati per entrambe le direzioni.

## Indice di progressione (decisione A)
Punteggio della serie migliore di ogni seduta:
- `kg`: e1RM di Epley = kg × (1 + reps/30).
- `band` / `level`: reps × (1 + 0,15 × gradino). Gradino: livello 1→5 = 0→4; assistance 30/20/10/0 = 0/1/2/3; resistance 10/20/30/40/50/60 = 0/1/2/3/4/5.
- `bodyweight`: reps; `time`: secondi.
Indice esercizio = punteggio / punteggio della prima seduta × 100. Indice di gruppo = media degli indici degli esercizi in cui il gruppo è primario (ultimo valore noto di ciascuno).

## Circuito (decisione B)
La seduta C registra il circuito: protocollo scelto e round completati.

## Modello dati
- **Scheda** (codice): modello di PROMPT.md §9 + `bandDirection?`, `image?`, `retired?` (esercizi tolti: ritirati, mai cancellati, così lo storico resta). `PROGRAM_VERSION` salvato in ogni seduta.
- **IndexedDB**: `sessions`, `setLogs` (solo serie confermate), `drafts` (seduta in corso), `settings`. Carico sempre numerico. Schema versionato con migrazioni Dexie.
- **Import prototipo**: conversione del testo libero dove possibile; ciò che non è interpretabile va nelle note della seduta, mai inventato. Re-import idempotente (id `proto-<id>`).

## Ordine di sviluppo
**Fase 4 — MVP**: progetto Vite e layout → scheda in `program.ts` → database + persist() → schermata Seduta con bozza → precompilazione/conferma/progressione (+ test) → salvataggio e Storico → backup, import prototipo, promemoria (+ test) → prova su PC e su telefono in Wi-Fi.
**Fase 5**: timer di recupero, circuito, suono/vibrazione, wake lock, grafici.
**Fase 6**: PWA (icone, offline), controlli 6-bis, repo pubblico, Actions, Pages, installazione.
**Fase 7**: checklist di PROMPT.md §10.

## Limiti noti
- Wake lock rilasciato quando si esce dall'app: viene richiesto di nuovo al rientro.
- Con l'app in background il suono del timer può arrivare in ritardo (il tempo resta corretto).
- Il suono si sblocca al primo tocco; in modalità silenziosa resta la vibrazione.
- I dati esistono solo sul telefono: il backup manuale è l'unica copia.
