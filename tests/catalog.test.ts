import { describe, expect, it } from 'vitest';
import { CATALOG, CATALOG_BY_ID } from '../src/catalog/exercises';
import { TEMPLATE_BY_ID, supersetBadges } from '../src/catalog/templates';
import { DAYS, EXERCISES, PROGRAM_VERSION } from '../src/program/program';
import before from './fixtures/scheda-v1.json';

/** Le note di prima, senza le frasi sul lato di partenza (ora è un'impostazione in Info). */
const withoutSide = (notes: string) =>
  notes
    .split(/(?<=\.)\s+/)
    .filter((s) => !/sinistro/i.test(s))
    .join(' ');

describe('Modello 1 = scheda in uso prima della Fase 4-bis', () => {
  it('stessa versione e stessi giorni (titoli e sottotitoli)', () => {
    expect(PROGRAM_VERSION).toBe(before.PROGRAM_VERSION);
    expect(DAYS).toEqual(before.DAYS);
  });

  it('stessi esercizi nello stesso ordine', () => {
    expect(EXERCISES.map((e) => `${e.day}${e.order}:${e.id}`)).toEqual(before.EXERCISES.map((e) => `${e.day}${e.order}:${e.id}`));
  });

  it.each(before.EXERCISES.map((e) => [e.id, e] as const))('%s: tutti i campi uguali (note senza il lato di partenza)', (id, old) => {
    const now = EXERCISES.find((e) => e.id === id)!;
    const { notes: oldNotes, ...oldRest } = old;
    const { notes: newNotes, ...newRest } = now;
    expect(newRest).toEqual(oldRest);
    expect(newNotes).toBe(withoutSide(oldNotes));
  });
});

describe('catalogo', () => {
  it('id univoci', () => {
    expect(new Set(CATALOG.map((e) => e.id)).size).toBe(CATALOG.length);
  });

  it('gli id di prima ci sono tutti, invariati', () => {
    for (const e of before.EXERCISES) expect(CATALOG_BY_ID[e.id], e.id).toBeDefined();
  });

  it('note generali: niente lato di partenza', () => {
    for (const e of CATALOG) expect(e.notes, e.id).not.toMatch(/sinistr|destr/i);
  });

  it('ogni voce dei modelli usa un esercizio del catalogo, una sola volta per scheda', () => {
    for (const t of Object.values(TEMPLATE_BY_ID)) {
      for (const p of t.programs) {
        const ids = p.items.map((i) => i.exerciseId);
        expect(new Set(ids).size, `${t.id}/${p.id}`).toBe(ids.length);
        for (const id of ids) expect(CATALOG_BY_ID[id], `${t.id}/${p.id}/${id}`).toBeDefined();
      }
    }
  });

  it('nomi delle schede dei modelli al massimo 6 caratteri', () => {
    for (const t of Object.values(TEMPLATE_BY_ID)) for (const p of t.programs) expect(p.name.length).toBeLessThanOrEqual(6);
  });

  it('esercizi nuovi: metrica, lati, muscoli e mobilità', () => {
    const c = CATALOG_BY_ID;
    expect([c.gb.metric, c.gb.unilateral, c.gb.muscles]).toEqual(['kg', false, { primary: ['glutei'], secondary: ['femorali'] }]);
    expect([c.ss.metric, c.ss.unilateral, c.ss.muscles]).toEqual(['kg', true, { primary: ['quadricipiti', 'glutei'], secondary: ['femorali'] }]);
    expect([c.bdog.metric, c.bdog.unilateral, c.bdog.muscles]).toEqual(['bodyweight', true, { primary: ['core'], secondary: ['glutei', 'schiena'] }]);
    expect([c.hfs.metric, c.hfs.unilateral, c.hfs.kind, c.hfs.muscles.primary]).toEqual(['time', true, 'mobility', ['quadricipiti']]);
    expect([c.cr.metric, c.cr.unilateral, c.cr.muscles]).toEqual(['bodyweight', false, { primary: ['polpacci'], secondary: [] }]);
    expect([c.cls.metric, c.cls.unilateral, c.cls.muscles]).toEqual(['bodyweight', true, { primary: ['glutei'], secondary: [] }]);
    // la fascia in stoffa è un attrezzo/nota, non la metrica "elastico"
    expect(c.cls.bandDirection).toBeUndefined();
    // solo hfs è mobilità
    expect(CATALOG.filter((e) => e.kind === 'mobility').map((e) => e.id)).toEqual(['hfs']);
  });

  it('il ponte glutei ha la sua immagine (gb), non quella del riscaldamento', () => {
    expect(CATALOG_BY_ID.gb.image).toBe('gb');
  });
});

describe('badge dei superset per blocchi', () => {
  const s = (...flags: boolean[]) => supersetBadges(flags.map((supersetNext) => ({ supersetNext })));

  it('singoli senza badge, superset numerati col blocco', () => {
    expect(s(false, true, false, false)).toEqual([undefined, '2a', '2b', undefined]);
  });

  it('superset all\'inizio e in fondo; ultimo con supersetNext ignorato', () => {
    expect(s(true, false, false, true, false, true)).toEqual(['1a', '1b', undefined, '3a', '3b', undefined]);
  });

  it('Modello 1: stessi badge di prima', () => {
    expect(EXERCISES.filter((e) => e.superset).map((e) => `${e.id}:${e.superset}`)).toEqual(
      before.EXERCISES.filter((e) => 'superset' in e).map((e) => `${e.id}:${(e as { superset: string }).superset}`),
    );
  });
});
