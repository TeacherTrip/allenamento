import type { TemplateId } from '../program/types';

/** Regola in Info: `b` in grassetto (facoltativo), poi il testo. */
export interface InfoRule {
  b?: string;
  t: string;
}

/** Testi di Info che dipendono dal modello scelto («Settimana tipo», «Ogni giorno», «Regole», scala dei push-up). */
export interface ModelInfo {
  /** Testo sopra la tabella della settimana. */
  weekIntro?: string;
  /** Titolo della tabella (es. «Esempio»). */
  weekTitle?: string;
  /** Righe [giorno, attività]. */
  week: [string, string][];
  /** «Ogni giorno»: un testo unico oppure un elenco. */
  daily: string | string[];
  rules: InfoRule[];
  /** Frase dopo la scala degli appoggi dei push-up. */
  pushupRule: string;
}

/*
 * Modello 1: testi di prima della Fase 4-bis; circuito facoltativo in A e B aggiunto il 21/11.
 * Modello 2: testi approvati dall'utente il 20/11/2026 (docs/piano-4bis.md, «Modello 2 — testi di Info»).
 * Solo testi generici: nessun dato personale.
 */
export const MODEL_INFO: Record<TemplateId, ModelInfo> = {
  m1: {
    week: [
      ['Lun', 'Seduta A — full body + circuito facoltativo'],
      ['Mar', 'Camminata veloce 30-40 min'],
      ['Mer', 'Seduta C — braccia, spalle, femorali + circuito'],
      ['Gio', 'Riposo (passi quotidiani)'],
      ['Ven', 'Seduta B — full body + circuito facoltativo'],
      ['Sab', 'Camminata veloce 30-40 min'],
      ['Dom', 'Riposo'],
    ],
    daily: '7.000-9.000 passi. Camminate in zona 2: riesci a parlare, non a cantare. Tra A e B almeno 48 ore.',
    rules: [
      { b: 'RIR 2', t: ' (Reps In Reserve): chiudi la serie quando ne avresti ancora 2.' },
      { b: 'Settimane 1-2', t: ': 2 serie, RIR 3 (interruttore qui sopra, in Impostazioni).' },
      {
        b: 'Doppia progressione',
        t: ': quando arrivi al massimo del range su tutte le serie, aumenta il carico o passa alla variante più difficile.',
      },
      { b: 'Esercizi a un arto', t: ': ripetizioni e kg per lato, stesse reps con l’altro lato.' },
      { b: 'Superset', t: ' (stessa lettera, es. 2a/2b): esercizi di seguito, recupero solo dopo la coppia.' },
      {
        b: 'Circuito cardio',
        t: ': in C fa parte della seduta; in A e B è facoltativo, si salta se stanco o poco recuperato. Stessa progressione in tutte le schede (Sett. 1-2, 3-4, 5-6, 7+).',
      },
      { b: 'Gambe senza carico extra', t: ' (quando 14 kg diventa leggero): discesa in 4-5 s, pausa 2 s in basso, 1,5 reps.' },
      { b: 'Dolore articolare', t: ' (non fatica muscolare): fermati e cambia esercizio.' },
    ],
    pushupRule: 'Passi al livello successivo quando fai 3 × 12 a RIR 2.',
  },
  m2: {
    weekIntro:
      "3 sedute a settimana, mai due giorni di fila, nell'ordine A → B → C. Se ne salti una, riprendi dalla successiva. Nei giorni “no” (molta stanchezza o poca energia) la seduta prevista diventa la D.",
    weekTitle: 'Esempio',
    week: [
      ['Lun', 'A'],
      ['Mar', 'Camminata'],
      ['Mer', 'B'],
      ['Gio', 'Riposo'],
      ['Ven', 'C'],
      ['Sab', 'Camminata'],
      ['Dom', 'Riposo'],
    ],
    daily: [
      'Passi: 6.000-8.000 al giorno.',
      'Al mattino: riscaldamento completo di 10 minuti; niente Romanian deadlift appena alzati.',
      'Alla sera: dopo una giornata pesante, 10 minuti sdraiati con le gambe appoggiate al muro prima di iniziare; se la stanchezza resta, fare la D.',
      'Scarpe da ginnastica con suola piatta e aderente; niente calze sul pavimento liscio (tranne nel leg curl con asciugamano).',
      'Per rialzarsi da terra passare da seduti. Bere prima e durante. Se ci si sente poco bene: sedersi e chiudere la serie.',
    ],
    rules: [
      { t: 'RIR (ripetizioni di riserva): a fine serie devono restare 2-3 ripetizioni pulite.' },
      { t: 'Settimana 1: 2 serie, RIR 3-4, si cura la tecnica. Settimana 2: 2-3 serie, RIR 3, si aggiustano i carichi. Dalla 3: serie della scheda e progressione.' },
      { t: 'kg: prima si sale di ripetizioni nel range. Quando tutte le serie arrivano al massimo con RIR 2 o più, alla seduta dopo +1-2 kg e si riparte dal minimo.' },
      { t: 'Elastico: stessa regola, 10 → 20 → 30 (combinabili).' },
      { t: 'Push-up: a 3 × 12 pulite si scende di un livello.' },
      { t: 'Side plank: +5 s quando tutte le serie sono pulite; sui piedi da 30 s pulite sulle ginocchia.' },
      { t: 'Split squat: 2 × 2 kg in mano dopo 3 × 10 per lato.' },
      { t: 'Calf raise: a 2 × 20 pulite si passa su un gradino, poi con un manubrio in mano.' },
      { t: 'Clamshell: a 2 × 15 pulite la fascia sale sulle cosce, poi 2 s di tenuta in apertura.' },
      { t: "Superset: due esercizi alternati, recupero dopo la coppia. Se uno dei due ha una serie in più, l'ultima si fa da sola." },
      { t: 'Dolore: se un esercizio fa male, si torna alla versione o al carico precedente.' },
      { t: 'Stop: dolore al petto, fiato corto insolito, capogiri o svenimento → fermarsi; se si ripete, sentire il medico.' },
    ],
    pushupRule: 'A 3 × 12 pulite si scende di un livello.',
  },
};

/** Testi di Info per il modello scelto; senza modello (es. backup vecchio) quelli del Modello 1. */
export const modelInfo = (templateId: TemplateId | null | undefined): ModelInfo =>
  (templateId && MODEL_INFO[templateId]) || MODEL_INFO.m1;
