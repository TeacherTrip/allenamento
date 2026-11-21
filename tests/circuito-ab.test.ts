import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TEMPLATE_BY_ID } from '../src/catalog/templates';
import { MODEL_INFO } from '../src/catalog/infoTexts';
import { programsFromTemplate } from '../src/db/db';
import { weeklySets } from '../src/logic/charts';
import { InfoScreen } from '../src/screens/InfoScreen';
import { DEFAULT_SETTINGS, type Session, type SetLog } from '../src/db/models';

// Circuito facoltativo in fondo alle schede A e B del Modello 1 (21/11). Dati inventati.

const NOTE = 'facoltativo: si salta se stanco o poco recuperato';
const m1 = TEMPLATE_BY_ID.m1;
const m2 = TEMPLATE_BY_ID.m2;

describe('Modello 1: circuito facoltativo in A e B', () => {
  it('A e B facoltativo con la frase; C obbligatorio senza frase', () => {
    expect(m1.programs.map((p) => [p.name, p.circuit, p.circuitNote])).toEqual([
      ['A', 'optional', NOTE],
      ['B', 'optional', NOTE],
      ['C', 'yes', undefined],
    ]);
  });

  it('voci di A, B e C invariate (il circuito non è una voce di esercizio)', () => {
    expect(m1.programs.map((p) => p.items.map((i) => i.exerciseId))).toEqual([
      ['gsq', 'pu', 'row', 'rdl', 'pull', 'db'],
      ['bss', 'ht', 'fp', 'lpd', 'mp', 'pa', 'sp'],
      ['slrdl', 'lc', 'ap', 'lr', 'cu', 'fr', 'rd'],
    ]);
    const c = m1.programs[2];
    expect([c.description, c.subtitle, c.warmup, c.notes]).toEqual(['Braccia, spalle, femorali + cardio', 'Mercoledì · ~45 min', true, undefined]);
  });

  it('le schede create dal modello (primo avvio e «Ricarica un modello») hanno il circuito in A e B', () => {
    const ps = programsFromTemplate('m1');
    expect(ps.map((p) => [p.name, p.circuit, p.circuitNote])).toEqual([
      ['A', 'optional', NOTE],
      ['B', 'optional', NOTE],
      ['C', 'yes', undefined],
    ]);
  });
});

describe('Modello 2 invariato', () => {
  it('circuito facoltativo in A, B, C senza frase; assente in D', () => {
    expect(m2.programs.map((p) => [p.name, p.circuit, p.circuitNote])).toEqual([
      ['A', 'optional', undefined],
      ['B', 'optional', undefined],
      ['C', 'optional', undefined],
      ['D', 'no', undefined],
    ]);
    for (const p of programsFromTemplate('m2')) expect(p).not.toHaveProperty('circuitNote');
  });

  it('testi di Info del Modello 2 senza la regola del circuito del Modello 1', () => {
    expect(MODEL_INFO.m2.rules.some((r) => r.b === 'Circuito cardio')).toBe(false);
    expect(MODEL_INFO.m2.week.some(([, a]) => a.includes('circuito'))).toBe(false);
  });
});

describe('Info del Modello 1: circuito anche in A e B', () => {
  const html = renderToStaticMarkup(
    createElement(InfoScreen, { sessions: [], logs: [], settings: { ...DEFAULT_SETTINGS, templateId: 'm1' }, programs: [], persist: null, toast: () => {} }),
  ).replace(/<[^>]+>/g, '').replace(/ /g, ' ');

  it('settimana tipo e regole', () => {
    expect(html).toContain('Seduta A — full body + circuito facoltativo');
    expect(html).toContain('Seduta B — full body + circuito facoltativo');
    expect(html).toContain('Seduta C — braccia, spalle, femorali + circuito');
    expect(html).toContain('Circuito cardio: in C fa parte della seduta; in A e B è facoltativo, si salta se stanco o poco recuperato.');
  });
});

describe('il circuito non conta nelle serie settimanali dei gruppi muscolari', () => {
  it('stessa seduta con e senza circuito → stessi conteggi', () => {
    const base: Session = { id: 's1', date: '2026-11-16T10:00:00.000Z', day: 'x', phase1: false, notes: '', programVersion: 2 };
    const withCircuit: Session = { ...base, circuit: { protocol: 0, label: 'Sett. 1-2', rounds: 6, completedRounds: 6 } };
    const logs: SetLog[] = [{ id: 'l1', sessionId: 's1', exerciseId: 'gsq', setIndex: 0, confirmed: true, load: 8, reps: 10 }];
    expect(weeklySets([withCircuit], logs)).toEqual(weeklySets([base], logs));
    expect(weeklySets([withCircuit], [])).toEqual(new Map());
  });
});
