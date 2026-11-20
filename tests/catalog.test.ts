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

/** Forme neutre (20/11): «Supino/Supini» → «Sdraiati sulla schiena», «(seduto)» → «(da seduti)». */
const neutral = (t: string) => t.replace(/^Supin[oi],/, 'Sdraiati sulla schiena,').replace('(seduto)', '(da seduti)');

/** Note del Modello 1 divise il 20/11: vecchia nota = parte nel catalogo + parte nella voce del Modello 1. */
const MOVED_TO_ITEM: Record<string, { old: string; catalog: string; item: string }> = {
  pu: {
    old: "Scegli l'appoggio che ti tiene in 8-12 reps a RIR 2. Scala: piano cucina/tavolo → schienale o bracciolo divano → seduta divano → gradino → terra. Corpo rigido come una tavola.",
    catalog: 'Scala: piano cucina/tavolo → schienale o bracciolo divano → seduta divano → gradino → terra. Corpo rigido come una tavola.',
    item: "Scegli l'appoggio che ti tiene in 8-12 reps a RIR 2.",
  },
  pull: {
    old: "Rigorose, zero slancio (corridoio stretto). Sali su una sedia per infilare ginocchio o piede nell'elastico. Se non ne completi 3: negative, discesa in 5 s. Controlla la tenuta della barra prima di ogni seduta.",
    catalog: "Sali su una sedia per infilare ginocchio o piede nell'elastico. Controlla la tenuta della barra prima di ogni seduta.",
    item: 'Rigorose, zero slancio (corridoio stretto). Se non ne completi 3: negative, discesa in 5 s.',
  },
  ht: {
    old: 'Scapole sul bordo del divano, pausa 1 s in alto, mento verso il petto, spingi le ginocchia contro la fascia.',
    catalog: 'Scapole sul bordo del divano, pausa 1 s in alto, mento verso il petto.',
    item: 'Spingi le ginocchia contro la fascia.',
  },
  lpd: {
    old: 'In ginocchio sotto la barra, tira verso il petto portando i gomiti in basso e indietro.',
    catalog: 'Tira verso il petto portando i gomiti in basso e indietro.',
    item: 'In ginocchio sotto la barra.',
  },
};

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
    // nuovi campi della Fase 4-bis: recupero "–" (null) dove prima c'era 0, superset "con il successivo"
    const { notes: newNotes, itemNotes: _itemNotes, supersetNext, restSec, ...newRest } = now;
    expect({ ...newRest, restSec: restSec ?? 0 }).toEqual({ ...oldRest, name: neutral(oldRest.name) });
    expect(!!supersetNext).toBe(/a$/.test((old as { superset?: string }).superset ?? ''));
    // dal 20/11 le parti legate al Modello 1 stanno nella nota della voce («Nota della scheda»), con testo identico
    const moved = MOVED_TO_ITEM[id];
    if (moved) {
      expect(newNotes).toBe(moved.catalog);
      expect(_itemNotes).toBe(moved.item);
      expect(withoutSide(oldNotes)).toBe(moved.old);
    } else {
      expect(newNotes).toBe(neutral(withoutSide(oldNotes)));
      expect(_itemNotes).toBeUndefined();
    }
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
