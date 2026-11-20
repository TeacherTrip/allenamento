import { describe, expect, it } from 'vitest';
import { WARMUP } from '../src/program/program';
import { CATALOG } from '../src/catalog/exercises';
import { CARDIO_EXERCISES } from '../src/program/cardio';

// File presenti in public/esercizi/ (elencati da Vite, senza caricarli).
const files = new Set(
  Object.keys(import.meta.glob('/public/esercizi/*.webp')).map((k) => k.replace('/public/esercizi/', '')),
);

/**
 * Immagini dei nuovi esercizi non ancora fornite: finché mancano l'app mostra il segnaposto.
 * Quando un file arriva in public/esercizi/, togliere il suo id da qui (la prova lo segnala).
 */
const IN_ARRIVO = ['ss', 'bdog', 'hfs', 'cr', 'cls'];

// Ogni voce del catalogo, del riscaldamento e del circuito ha la sua immagine in public/esercizi/.
const all = [
  ...CATALOG.filter((e) => !e.retired).map((e) => ({ group: 'catalogo', id: e.id, image: e.image })),
  ...WARMUP.map((w) => ({ group: 'riscaldamento', id: w.id, image: w.image })),
  ...CARDIO_EXERCISES.map((c) => ({ group: 'circuito', id: c.id, image: c.image })),
];

describe('immagini degli esercizi', () => {
  it('ci sono tutte le voci previste (26 + 5 + 4)', () => {
    expect(all.length).toBe(35);
  });

  it.each(all.filter((x) => !IN_ARRIVO.includes(x.id)))('$group · $id ha il file public/esercizi/<image>.webp', ({ image }) => {
    expect(image, 'campo image mancante').toBeTruthy();
    expect(files.has(`${image}.webp`)).toBe(true);
  });

  it.each(IN_ARRIVO)('%s: immagine ancora in arrivo (se il file esiste, togliere il suo id da IN_ARRIVO)', (id) => {
    const image = all.find((x) => x.id === id)?.image;
    expect(image).toBe(id);
    expect(files.has(`${id}.webp`)).toBe(false);
  });

  it('in public/esercizi/ non ci sono file senza esercizio', () => {
    const used = new Set(all.map((x) => `${x.image}.webp`));
    expect([...files].filter((f) => !used.has(f))).toEqual([]);
  });

  it('il riscaldamento "band pull-apart" riusa l\'immagine della seduta B', () => {
    expect(WARMUP.find((w) => w.id === 'wu-pa')?.image).toBe('pa');
  });
});
