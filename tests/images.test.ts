import { describe, expect, it } from 'vitest';
import { EXERCISES, WARMUP } from '../src/program/program';
import { CARDIO_EXERCISES } from '../src/program/cardio';

// File presenti in public/esercizi/ (elencati da Vite, senza caricarli).
const files = new Set(
  Object.keys(import.meta.glob('/public/esercizi/*.webp')).map((k) => k.replace('/public/esercizi/', '')),
);

// Ogni voce della scheda, del riscaldamento e del circuito ha la sua immagine in public/esercizi/.
const all = [
  ...EXERCISES.filter((e) => !e.retired).map((e) => ({ group: 'scheda', id: e.id, image: e.image })),
  ...WARMUP.map((w) => ({ group: 'riscaldamento', id: w.id, image: w.image })),
  ...CARDIO_EXERCISES.map((c) => ({ group: 'circuito', id: c.id, image: c.image })),
];

describe('immagini degli esercizi', () => {
  it('ci sono tutte le voci previste (20 + 5 + 4)', () => {
    expect(all.length).toBe(29);
  });

  it.each(all)('$group · $id ha il file public/esercizi/<image>.webp', ({ image }) => {
    expect(image, 'campo image mancante').toBeTruthy();
    expect(files.has(`${image}.webp`)).toBe(true);
  });

  it('in public/esercizi/ non ci sono file senza esercizio', () => {
    const used = new Set(all.map((x) => `${x.image}.webp`));
    expect([...files].filter((f) => !used.has(f))).toEqual([]);
  });

  it('il riscaldamento "band pull-apart" riusa l\'immagine della seduta B', () => {
    expect(WARMUP.find((w) => w.id === 'wu-pa')?.image).toBe('pa');
  });
});
