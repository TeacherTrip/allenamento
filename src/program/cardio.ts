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

export const CARDIO_EXERCISES = [
  'Shadow boxing',
  'Step-out jack',
  'Marcia ginocchia alte',
  'Mountain climber lento (mani sul divano)',
];

export const CARDIO_INTENSITY = 'Affannato ma riesci a dire una frase breve.';
