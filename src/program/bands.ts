import type { BandDirection } from './types';

export interface BandOption {
  value: number;
  label: string;
}

/** Trazioni: dall'aiuto maggiore al minore (= dal più facile al più difficile). */
const ASSISTANCE_OPTIONS: BandOption[] = [
  { value: 30, label: '30' },
  { value: 20, label: '20' },
  { value: 10, label: '10' },
  { value: 0, label: 'Nessuno' },
];

/** Resistenza: dal più leggero al più pesante. Il valore è il totale degli elastici combinati. */
const RESISTANCE_OPTIONS: BandOption[] = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 30, label: '30' },
  { value: 40, label: '40 (10+30)' },
  { value: 50, label: '50 (20+30)' },
  { value: 60, label: '60 (tutti)' },
];

/** Opzioni in ordine di difficoltà crescente (l'indice è il "gradino"). */
export function bandOptions(direction: BandDirection): BandOption[] {
  return direction === 'assistance' ? ASSISTANCE_OPTIONS : RESISTANCE_OPTIONS;
}

export function bandLabel(direction: BandDirection, value: number): string {
  const o = bandOptions(direction).find((x) => x.value === value);
  if (o) return direction === 'assistance' && value === 0 ? 'nessun elastico' : `elastico ${o.label}`;
  return `elastico ${value}`;
}
