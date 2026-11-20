import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { InfoScreen } from '../src/screens/InfoScreen';
import { MODEL_INFO, modelInfo } from '../src/catalog/infoTexts';
import { CATALOG } from '../src/catalog/exercises';
import { TEMPLATE_BY_ID } from '../src/catalog/templates';
import { WARMUP } from '../src/program/program';
import { CARDIO_INTENSITY } from '../src/program/cardio';
import { DEFAULT_SETTINGS, type Settings } from '../src/db/models';
import type { TemplateId } from '../src/program/types';

/** Testo visibile di Info per un modello (HTML statico, spazi non separabili come spazi normali). */
function infoText(templateId: TemplateId | null): string {
  const settings: Settings = { ...DEFAULT_SETTINGS, templateId };
  const html = renderToStaticMarkup(
    createElement(InfoScreen, { sessions: [], logs: [], settings, programs: [], persist: null, toast: () => {} }),
  );
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/ /g, ' ');
}

/** Tutte le frasi di un modello (settimana, ogni giorno, regole, push-up). */
const phrases = (id: TemplateId): string[] => {
  const m = MODEL_INFO[id];
  return [
    ...(m.weekIntro ? [m.weekIntro] : []),
    ...m.week.filter(([, a]) => a.length > 10).map(([, a]) => a), // le celle brevi («A», «Riposo») sono comuni
    ...(typeof m.daily === 'string' ? [m.daily] : m.daily),
    ...m.rules.map((r) => `${r.b ?? ''}${r.t}`),
    m.pushupRule,
  ];
};

describe('Info: testi del modello scelto', () => {
  it.each([
    ['m1', 'm2'],
    ['m2', 'm1'],
  ] as const)('%s: tutti i suoi testi, nessun testo dell’altro modello', (mine, other) => {
    const text = infoText(mine);
    for (const p of phrases(mine)) expect(text, p).toContain(p);
    for (const p of phrases(other)) expect(text, p).not.toContain(p);
  });

  it('Modello 1 invariato: giorni fissi, 48 ore, RIR 2, 14 kg, lati, scala con «3 × 12 a RIR 2»', () => {
    const t = infoText('m1');
    expect(t).toContain('Seduta A — full body');
    expect(t).toContain('Tra A e B almeno 48 ore.');
    expect(t).toContain('Gambe senza carico extra (quando 14 kg diventa leggero)');
    expect(t).toContain('Esercizi a un arto: ripetizioni e kg per lato');
    expect(t).toContain('Passi al livello successivo quando fai 3 × 12 a RIR 2.');
    expect(t).not.toContain('Esempio');
  });

  it('Modello 2: «Esempio», niente 48 ore, zona 2, camminata veloce, lati del Modello 1, 14 kg', () => {
    const t = infoText('m2');
    expect(t).toContain('Esempio');
    expect(t).toContain("3 sedute a settimana, mai due giorni di fila, nell'ordine A → B → C.");
    for (const no of ['48 ore', 'zona 2', 'Camminata veloce', 'stesse reps con l’altro lato', '14 kg', 'Gambe senza carico extra', 'Seduta A']) {
      expect(t, no).not.toContain(no);
    }
    expect(t).toContain('Push-up: scala degli appoggi1 Piano cucina');
    expect(t).toContain('A 3 × 12 pulite si scende di un livello.');
  });

  it('Modello 2: regole nell’ordine approvato (12 voci)', () => {
    expect(MODEL_INFO.m2.rules.map((r) => r.t.split(':')[0])).toEqual([
      'RIR (ripetizioni di riserva)',
      'Settimana 1',
      'kg',
      'Elastico',
      'Push-up',
      'Side plank',
      'Split squat',
      'Calf raise',
      'Clamshell',
      'Superset',
      'Dolore',
      'Stop',
    ]);
    expect(MODEL_INFO.m2.week).toEqual([
      ['Lun', 'A'], ['Mar', 'Camminata'], ['Mer', 'B'], ['Gio', 'Riposo'], ['Ven', 'C'], ['Sab', 'Camminata'], ['Dom', 'Riposo'],
    ]);
  });

  it('senza modello (backup vecchio): testi del Modello 1', () => {
    expect(modelInfo(null)).toBe(MODEL_INFO.m1);
    expect(modelInfo(undefined)).toBe(MODEL_INFO.m1);
  });
});

describe('Modello 2: descrizioni e sottotitoli delle schede', () => {
  it('A, B, C «~60 min», D «~25 min», nessun giorno della settimana', () => {
    expect(TEMPLATE_BY_ID.m2.programs.map((p) => [p.name, p.description, p.subtitle])).toEqual([
      ['A', 'Full body', '~60 min'],
      ['B', 'Full body — catena posteriore', '~60 min'],
      ['C', 'Full body — glutei e core', '~60 min'],
      ['D', 'leggera (~25 min)', '~25 min'],
    ]);
  });
});

describe('catalogo neutro', () => {
  it('nessuna nota del catalogo contiene «RIR 2», «fascia», «corridoio» o «14 kg»', () => {
    for (const e of CATALOG) expect(e.notes, e.id).not.toMatch(/RIR 2|fascia|corridoio|14 kg/i);
  });

  it('le parti del Modello 1 sono nelle note delle voci del Modello 1, con testo identico', () => {
    const notes = Object.fromEntries(TEMPLATE_BY_ID.m1.programs.flatMap((p) => p.items).map((i) => [i.exerciseId, i.notes]));
    expect(notes.pu).toBe("Scegli l'appoggio che ti tiene in 8-12 reps a RIR 2.");
    expect(notes.ht).toBe('Spingi le ginocchia contro la fascia.');
    expect(notes.pull).toBe('Rigorose, zero slancio (corridoio stretto). Se non ne completi 3: negative, discesa in 5 s.');
    expect(notes.lpd).toBe('In ginocchio sotto la barra.');
  });
});

describe('testi del 20/11 (seconda revisione)', () => {
  const m2Item = (scheda: string, id: string) =>
    TEMPLATE_BY_ID.m2.programs.find((p) => p.name === scheda)!.items.find((i) => i.exerciseId === id)!;

  it('forme neutre: niente «Supino/Supini», «(seduto)», «Affannato»', () => {
    const all = [...CATALOG.flatMap((e) => [e.name, e.notes]), CARDIO_INTENSITY, ...WARMUP.map((w) => w.name)];
    for (const t of all) expect(t).not.toMatch(/Supin[oi]|\(seduto\)|Affannato/);
    expect(CATALOG.find((e) => e.id === 'ap')!.name).toBe('Arnold press (da seduti)');
    expect(CATALOG.find((e) => e.id === 'lc')!.notes).toMatch(/^Sdraiati sulla schiena, talloni/);
    expect(CATALOG.find((e) => e.id === 'gb')!.notes).toMatch(/^Sdraiati sulla schiena, piedi/);
  });

  it('Modello 2: note di rdl e ht generiche, cls della D con la sua nota', () => {
    expect(m2Item('B', 'rdl').notes).toBe(
      "Schiena neutra, manubri vicini alle gambe; scendere finché il bacino va indietro. Se l'esercizio fa male, fermarsi e ripetere solo il gesto senza carico.",
    );
    expect(m2Item('C', 'ht').notes).toMatch(/Se l'esercizio fa male, passare al ponte glutei \(gb\)\.$/);
    expect(m2Item('D', 'cls').notes).toBe('Fascia sopra le ginocchia.');
    const m2Texts = [...TEMPLATE_BY_ID.m2.programs.flatMap((p) => [p.notes ?? '', ...p.items.map((i) => i.notes ?? '')]), ...phrases('m2')];
    for (const t of m2Texts) expect(t).not.toMatch(/risveglio|compare dolore|capogiri o vista|annebbiat|ginocchio peggior|gambe pesanti/);
  });

  it('Info Modello 2: riga «Al mattino» invariata, nuova riga sul sentirsi poco bene', () => {
    expect(MODEL_INFO.m2.daily).toContain('Al mattino: riscaldamento completo di 10 minuti; niente Romanian deadlift appena alzati.');
    expect(MODEL_INFO.m2.daily).toContain('Per rialzarsi da terra passare da seduti. Bere prima e durante. Se ci si sente poco bene: sedersi e chiudere la serie.');
  });

  it('riscaldamento uguale per i due modelli, voce della barra aggiornata', () => {
    expect(WARMUP.map((w) => w.name)).toContain('2 hang alla barra da 15-20 s (anche con i piedi appoggiati, se serve)');
  });
});
