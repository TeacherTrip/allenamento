import { describe, expect, it } from 'vitest';
import { durationSec, fmtDuration, fmtElapsed } from '../src/logic/format';
import { isComplete } from '../src/logic/values';

describe('cronometro', () => {
  it('durata calcolata dall’orario di inizio salvato', () => {
    const start = '2026-03-01T10:00:00.000Z';
    expect(durationSec(start, Date.parse('2026-03-01T10:47:12.000Z'))).toBe(47 * 60 + 12);
    expect(durationSec(start, Date.parse('2026-03-01T09:00:00.000Z'))).toBe(0); // mai negativa
  });
  it('formati', () => {
    expect(fmtElapsed(23 * 60_000 + 41_000)).toBe('23:41');
    expect(fmtElapsed(3_723_000)).toBe('1:02:03');
    expect(fmtDuration(47 * 60 + 12)).toBe('47 min');
    expect(fmtDuration(75 * 60)).toBe('1 h 15 min');
  });
});

describe('serie completa (salvabile)', () => {
  it('kg: servono carico e ripetizioni', () => {
    expect(isComplete('kg', { load: 14 })).toBe(false);
    expect(isComplete('kg', { reps: 10 })).toBe(false);
    expect(isComplete('kg', { load: 14, reps: 10 })).toBe(true);
  });
  it('band/level: servono elastico/livello e ripetizioni', () => {
    expect(isComplete('band', { load: 0, reps: 4 })).toBe(true); // 0 = senza elastico
    expect(isComplete('level', { reps: 8 })).toBe(false);
  });
  it('bodyweight: ripetizioni; time: secondi', () => {
    expect(isComplete('bodyweight', { reps: 8 })).toBe(true);
    expect(isComplete('time', { seconds: 30 })).toBe(true);
    expect(isComplete('time', { reps: 30 })).toBe(false);
  });
});
