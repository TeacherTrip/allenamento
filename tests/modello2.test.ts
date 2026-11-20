import { describe, expect, it } from 'vitest';
import { CATALOG_BY_ID } from '../src/catalog/exercises';
import { TEMPLATES, TEMPLATE_BY_ID, supersetBadges } from '../src/catalog/templates';
import { programsFromTemplate } from '../src/db/db';
import type { ProgramItem } from '../src/program/types';

/** Voce in forma compatta, come nel piano: id · serie×min-max · recupero · superset · partenza · attrezzo. */
const line = (it: ProgramItem) =>
  [
    it.exerciseId,
    `${it.sets}×${it.repRange[0]}-${it.repRange[1]}`,
    it.restSec == null ? '–' : `${it.restSec}`,
    it.supersetNext ? 'SS' : '',
    it.startValue ?? '',
    it.equipment ?? '',
  ].join(' · ');

// docs/piano-4bis.md, «Modello 2 — contenuto» (testi approvati il 20/11/2026)
const EXPECTED: Record<string, string[]> = {
  A: [
    'gsq · 3×10-12 · – · SS · 6 · Kettlebell',
    'cr · 2×15-20 · 90 ·  ·  · ',
    'row · 3×10-12 · – · SS · 6 · Manubrio',
    'pu · 3×8-12 · 75 ·  · 1 · ',
    'gb · 2×12-15 · 75 ·  · 6 · Manubrio',
    'db · 3×6-8 · – · SS ·  · ',
    'pa · 3×12-15 · 60 ·  · 10 · ',
    'hfs · 2×30-40 · – ·  ·  · ',
  ],
  B: [
    'rdl · 3×10-12 · 90 ·  · 6 · Manubri',
    'lpd · 3×12-15 · – · SS · 10 · ',
    'fp · 3×10-12 · 75 ·  · 6 · Manubri',
    'ss · 3×8-10 · – · SS · 0 · ',
    'cls · 2×12-15 · 75 ·  ·  · ',
    'sp · 2×15-20 · – · SS ·  · ',
    'bdog · 2×6-8 · 60 ·  ·  · ',
    'hfs · 2×30-40 · – ·  ·  · ',
  ],
  C: [
    'ht · 3×10-12 · – · SS · 8 · Manubrio',
    'cr · 2×15-20 · 90 ·  ·  · ',
    'row · 3×10-12 · – · SS · 6 · Manubrio',
    'pu · 3×8-12 · 75 ·  · 1 · ',
    'lc · 2×6-8 · 75 ·  ·  · ',
    'db · 3×6-8 · – · SS ·  · ',
    'sp · 2×15-20 · 60 ·  ·  · ',
    'hfs · 2×30-40 · – ·  ·  · ',
  ],
  D: [
    'gb · 2×12-12 · 45 ·  · 0 · 0 o 6 kg',
    'cls · 2×12-12 · 45 ·  ·  · ',
    'db · 2×6-6 · 45 ·  ·  · ',
    'pa · 2×15-15 · 45 ·  · 10 · ',
    'bdog · 2×6-6 · 45 ·  ·  · ',
    'hfs · 2×40-40 · – ·  ·  · ',
  ],
};

const m2 = TEMPLATE_BY_ID.m2;

describe('Modello 2 = contenuto approvato nel piano', () => {
  it('schede A, B, C, D in ordine', () => {
    expect(m2.programs.map((p) => p.name)).toEqual(['A', 'B', 'C', 'D']);
  });

  it.each(Object.keys(EXPECTED))('scheda %s: voci, serie, recuperi, superset, partenza, attrezzo', (name) => {
    const p = m2.programs.find((x) => x.name === name)!;
    expect(p.items.map(line)).toEqual(EXPECTED[name]);
  });

  it('superset numerati per blocchi (scheda A: 1a/1b, 2a/2b, gb = 3, 4a/4b, hfs = 5)', () => {
    const a = m2.programs[0];
    expect(supersetBadges(a.items)).toEqual(['1a', '1b', '2a', '2b', undefined, '4a', '4b', undefined]);
  });

  it('riscaldamento ovunque; circuito facoltativo in A, B, C e assente in D', () => {
    expect(m2.programs.map((p) => [p.warmup, p.circuit])).toEqual([
      [true, 'optional'],
      [true, 'optional'],
      [true, 'optional'],
      [true, 'no'],
    ]);
  });

  it('scheda D: «leggera (~25 min)», note in fondo con il testo approvato', () => {
    const d = m2.programs[3];
    expect(d.description).toBe('leggera (~25 min)');
    expect(d.notesPosition).toBe('bottom');
    expect(d.notes).toBe(
      'Più 10-15 min di camminata o circuito leggero. Alla fine 5 min di defaticamento sdraiati, gambe appoggiate al muro.',
    );
  });

  it('note ripetute scritte per esteso, identiche alla prima volta', () => {
    const note = (scheda: number, id: string) => m2.programs[scheda].items.find((i) => i.exerciseId === id)?.notes;
    expect(note(2, 'cr')).toBe(note(0, 'cr'));
    expect(note(2, 'row')).toBe(note(0, 'row'));
    expect(note(2, 'pu')).toBe(note(0, 'pu'));
    expect(note(2, 'db')).toBe(note(0, 'db'));
    expect(note(2, 'sp')).toBe(note(1, 'sp'));
    expect(note(1, 'hfs')).toBe(note(0, 'hfs'));
    expect(note(2, 'hfs')).toBe(note(0, 'hfs'));
    expect(note(0, 'cr')).toMatch(/^Mano a un mobile per l'equilibrio/);
  });
});

describe('modelli: regole comuni', () => {
  it.each(TEMPLATES.map((t) => [t.id, t] as const))('%s: esercizi del catalogo, mai due volte nella stessa scheda, nomi ≤ 6', (_id, t) => {
    for (const p of t.programs) {
      expect(p.name.length).toBeLessThanOrEqual(6);
      const ids = p.items.map((i) => i.exerciseId);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) {
        expect(CATALOG_BY_ID[id], id).toBeDefined();
        expect(CATALOG_BY_ID[id].retired, id).toBeFalsy();
      }
    }
  });

  it('titoli neutri e immagini dei modelli in public/modelli', () => {
    expect(TEMPLATES.map((t) => [t.id, t.label, t.image])).toEqual([
      ['m1', 'Modello 1', 'modelli/modello-1.webp'],
      ['m2', 'Modello 2', 'modelli/modello-2.webp'],
      ['empty', 'Schede vuote', undefined],
    ]);
  });

  it('schede create da un modello: id generati e univoci, mai A/B/C/D; contenuto copiato', () => {
    const a = programsFromTemplate('m2');
    const b = programsFromTemplate('m2');
    const ids = [...a, ...b].map((p) => p.id);
    expect(new Set(ids).size).toBe(8);
    for (const id of ids) expect(['A', 'B', 'C', 'D']).not.toContain(id);
    expect(a.map((p) => p.name)).toEqual(['A', 'B', 'C', 'D']);
    expect(a.map((p) => p.order)).toEqual([1, 2, 3, 4]);
    // copia: modificarla non tocca il modello nel codice
    a[0].items[0].sets = 99;
    expect(m2.programs[0].items[0].sets).toBe(3);
  });
});
