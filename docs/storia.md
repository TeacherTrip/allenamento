# Diario del progetto TeacherGym

## 2026-11-19

**Fatto**
- Fase 0: domande e decisioni (Android/Chrome, backup manuale, grafici e1RM, tema automatico, icona manubrio + "TG", immagini rimandate).
- Fase 1: ambiente (Node, Git, gh con login).
- Fase 2: repo git, identità noreply locale "TeacherGym", `.gitignore`, `.gitattributes`, hook di pre-commit (gitleaks + backup + email + lista privata di parole), comando `/chiudi`.
- Fase 3: piano approvato (`docs/piano.md`), con elastici "assistenza"/"resistenza" e indice di progressione.
- Fase 4 (MVP): scheda nel codice, database Dexie, sedute A/B/C con precompilazione, storico modificabile, backup/import (anche dal prototipo), cronometro della seduta, recupero automatico e manuale, schermo sempre acceso (dove supportato).
- Prove automatiche: 35 Vitest + 57 Playwright, anche sull'indirizzo di rete non sicuro (`E2E_BASE_URL`).
- Diagnosi sul telefono (Xiaomi 15 Ultra, Chrome) via adb + DevTools:
  - a schermo bloccato la pagina è nascosta e "Via!" si chiudeva prima dello sblocco;
  - in sviluppo, allo sblocco il server ricarica la pagina;
  - la vibrazione funziona solo con "Vibrazione tattile" attiva (limite di HyperOS).
- Correzioni dal telefono:
  - "Via!" grande e centrato, per 4 s dopo lo sblocco;
  - 4 bip;
  - due tasti [Sx] [Dx] per gli esercizi a lati separati;
  - "+ Serie" (serie extra);
  - avviso unico se lo schermo può spegnersi;
  - corretto lo sfarfallio al cambio di scheda.

**Decisioni**
- Dead bug e curl alternato: un solo ✓ "reps per lato"; [Sx][Dx] solo per bulgarian, rematore, stacco a una gamba, military press e side plank.
- Serie extra: salvate solo se confermate, segnate "extra", escluse dal suggerimento di progressione.
- Vibrazione: si lascia spenta "Vibrazione tattile"; bastano 4 bip + "Via!". La notifica di fine recupero va valutata in Fase 6 (HTTPS).
- Repo GitHub collegato ma ancora privato.

**Commit:** cd7714b, 45b9ff5, 616387d, 08496f6, 80aa5e2 (+ commit di chiusura sessione).

## 2026-11-19 (seconda sessione)

- Immagini di riferimento per i 20 esercizi della scheda, i 5 del riscaldamento e i 4 del circuito (generate dall'utente con Google Flow).
  - `immagini-originali/` esclusa da Git (prima di ogni altra operazione).
  - `scripts/ottimizza-immagini.mjs` (`npm run immagini`, sharp come devDependency): WebP qualità 80, senza metadati (C2PA/EXIF/XMP tolti, verificato), nessun ritaglio.
  - Risultato: da 8,7 MB a 0,70 MB in totale, 25,7 KB di media, massimo 47 KB (`cx-climber`).
- Riscaldamento e circuito diventano elenchi con id (`wu-*`, `cx-*`); `wu-pa` riusa l'immagine `pa`.
- Interfaccia:
  - miniatura accanto al nome, su "cartoncino" bianco con bordo (leggibile anche in tema scuro);
  - tap → tutto schermo; chiusura con tap o Indietro attraverso la cronologia (`pushState` + `popstate`, senza passi vuoti);
  - immagine mancante: nessun riquadro rotto.
- Prove nuove: Vitest (ogni voce ha il suo `.webp`, nessun file orfano) e Playwright I01-I06. Totale 67 Vitest + 63 Playwright, tutte verdi. Build e preview verificate sotto `/allenamento/`.
- Prove sul telefono tutte superate: recupero a schermo acceso e bloccato, Sx/Dx, "+ Serie", immagini. **Fase 4 chiusa.**

**Decisioni**
- Immagini a 1200×896 senza ridimensionare (a 800 px sarebbero sfocate a tutto schermo). Soglie di avviso: 150 KB per file, 4 MB in totale.
- Immagine grande durante il timer del circuito → Fase 5.
- Precache delle immagini (`globPatterns` con `webp`) → Fase 6, con vite-plugin-pwa.
- Prova Vitest con `import.meta.glob` invece di `node:fs`, per non installare `@types/node`.

**Commit:** 7e2dd83, 1555f6e (+ commit di chiusura sessione).
