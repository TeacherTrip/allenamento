import { describe, expect, it } from 'vitest';
import { phase1SinceOnSave, phase1Snooze, phase1Toggle, shouldAskPhase1Off } from '../src/logic/phase1';

// date finte: nessuna dipendenza dall'orologio vero
const D = (s: string) => new Date(`${s}T10:00:00.000Z`);
const base = { phase1: true, phase1Since: '2026-11-01T10:00:00.000Z', phase1SnoozedUntil: null };

describe('Settimane 1-2: avviso «Disattivarle?»', () => {
  it('compare 14 giorni dopo la prima seduta salvata, non prima', () => {
    expect(shouldAskPhase1Off(base, D('2026-11-14'))).toBe(false);
    expect(shouldAskPhase1Off(base, new Date('2026-11-15T09:59:59.999Z'))).toBe(false);
    expect(shouldAskPhase1Off(base, D('2026-11-15'))).toBe(true);
  });

  it('phase1Since vuoto (nessuna seduta salvata): mai, anche dopo 30 giorni', () => {
    const s = { ...base, phase1Since: null };
    expect(shouldAskPhase1Off(s, D('2026-12-01'))).toBe(false);
    expect(shouldAskPhase1Off(s, D('2027-06-01'))).toBe(false);
  });

  it('Settimane 1-2 già disattivate: mai', () => {
    expect(shouldAskPhase1Off({ ...base, phase1: false }, D('2026-12-31'))).toBe(false);
  });

  it('«Non ancora»: riappare dopo 7 giorni, non prima', () => {
    const tap = D('2026-11-16');
    const s = { ...base, ...phase1Snooze(tap) };
    expect(s.phase1SnoozedUntil).toBe('2026-11-23T10:00:00.000Z');
    expect(shouldAskPhase1Off(s, D('2026-11-17'))).toBe(false);
    expect(shouldAskPhase1Off(s, new Date('2026-11-23T09:59:59.999Z'))).toBe(false);
    expect(shouldAskPhase1Off(s, D('2026-11-23'))).toBe(true);
  });

  it('nessuno spegnimento automatico: le funzioni non cambiano mai phase1 da sole', () => {
    expect(phase1Snooze(D('2026-11-16'))).not.toHaveProperty('phase1');
    expect(phase1SinceOnSave(base, '2026-12-31T10:00:00.000Z')).toBeNull();
  });
});

describe('Settimane 1-2: data di partenza (phase1Since)', () => {
  it('si scrive al salvataggio SOLO se sono attive e la data è vuota', () => {
    const date = '2026-11-20T18:00:00.000Z';
    expect(phase1SinceOnSave({ phase1: true, phase1Since: null }, date)).toBe(date);
    expect(phase1SinceOnSave({ phase1: false, phase1Since: null }, date)).toBeNull();
    expect(phase1SinceOnSave({ phase1: true, phase1Since: '2026-11-01T10:00:00.000Z' }, date)).toBeNull();
    expect(phase1SinceOnSave({ phase1: false, phase1Since: '2026-11-01T10:00:00.000Z' }, date)).toBeNull();
  });

  it('riattivazione da Info: data e rinvio azzerati; poi data = prima seduta salvata DOPO, non il tocco', () => {
    const tap = '2026-12-01T08:00:00.000Z';
    const save = '2026-12-03T18:30:00.000Z';
    // prima: disattivate, con data vecchia e un rinvio
    let s: { phase1: boolean; phase1Since: string | null; phase1SnoozedUntil: string | null } = {
      phase1: false,
      phase1Since: '2026-11-01T10:00:00.000Z',
      phase1SnoozedUntil: '2026-11-25T10:00:00.000Z',
    };
    s = { ...s, ...phase1Toggle(true) };
    expect(s).toEqual({ phase1: true, phase1Since: null, phase1SnoozedUntil: null });
    expect(shouldAskPhase1Off(s, new Date(tap))).toBe(false);
    const since = phase1SinceOnSave(s, save);
    expect(since).toBe(save);
    expect(since).not.toBe(tap);
    s = { ...s, phase1Since: since };
    expect(shouldAskPhase1Off(s, D('2026-12-17'))).toBe(false);
    expect(shouldAskPhase1Off(s, D('2026-12-18'))).toBe(true);
  });

  it('disattivazione: cambia solo l’interruttore', () => {
    expect(phase1Toggle(false)).toEqual({ phase1: false });
  });
});
