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
