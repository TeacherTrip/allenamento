import type { SimpleItem } from './types';

export interface CardioProtocol {
  label: string;
  rounds: number;
  workSec: number;
  restSec: number;
}

export const CARDIO_PROTOCOLS: CardioProtocol[] = [
  { label: 'Sett. 1-2', rounds: 6, workSec: 30, restSec: 30 },
  { label: 'Sett. 3-4', rounds: 8, workSec: 30, restSec: 30 },
  { label: 'Sett. 5-6', rounds: 8, workSec: 40, restSec: 20 },
  { label: 'Sett. 7+', rounds: 10, workSec: 40, restSec: 20 },
];

export const CARDIO_EXERCISES: SimpleItem[] = [
  { id: 'cx-shadow', image: 'cx-shadow', name: 'Shadow boxing' },
  { id: 'cx-stepout', image: 'cx-stepout', name: 'Step-out jack' },
  { id: 'cx-knees', image: 'cx-knees', name: 'Marcia ginocchia alte' },
  { id: 'cx-climber', image: 'cx-climber', name: 'Mountain climber lento (mani sul divano)' },
];

export const CARDIO_INTENSITY = 'Respiro affannoso, ma riesci a dire una frase breve.';
