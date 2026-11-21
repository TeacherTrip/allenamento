import { describe, expect, it } from 'vitest';
import { sanitizeSettings, validDraft } from '../src/db/sanitize';
import { DEFAULT_SETTINGS } from '../src/db/models';

// Correzione del 21/11/2026, punto f: dati non validi trovati all'avvio. Dati inventati.

describe('impostazioni: un valore non valido torna al predefinito, gli altri restano', () => {
  it('valori validi: invariati, nessuna segnalazione', () => {
    const rows = [
      { key: 'autoRest', value: false },
      { key: 'phase1', value: false },
      { key: 'startSide', value: 'right' },
      { key: 'templateId', value: 'm2' },
      { key: 'cardioProtocol', value: 1 },
      { key: 'phase1Since', value: '2026-11-01T10:00:00.000Z' },
      { key: 'lastBackupAt', value: null },
      { key: 'sessionsSinceBackup', value: 3 },
    ];
    const r = sanitizeSettings(rows);
    expect(r.invalid).toEqual([]);
    expect(r.settings).toEqual({
      ...DEFAULT_SETTINGS,
      autoRest: false,
      phase1: false,
      startSide: 'right',
      templateId: 'm2',
      cardioProtocol: 1,
      phase1Since: '2026-11-01T10:00:00.000Z',
      sessionsSinceBackup: 3,
    });
  });
  it('tipi sbagliati o fuori dai valori ammessi → predefinito e segnalati', () => {
    const rows = [
      { key: 'autoRest', value: 'sì' },
      { key: 'phase1', value: false },
      { key: 'startSide', value: 'up' },
      { key: 'templateId', value: 'm9' },
      { key: 'cardioProtocol', value: 99 },
      { key: 'phase1Since', value: 'ieri' },
      { key: 'sessionsSinceBackup', value: -2 },
      { key: 'onboarded', value: 1 },
    ];
    const r = sanitizeSettings(rows);
    expect(r.settings).toEqual({ ...DEFAULT_SETTINGS, phase1: false });
    expect(r.invalid.map((x) => x.key).sort()).toEqual(
      ['autoRest', 'cardioProtocol', 'onboarded', 'phase1Since', 'sessionsSinceBackup', 'startSide', 'templateId'].sort(),
    );
    expect(r.invalid.find((x) => x.key === 'startSide')?.value).toBe('up');
  });
  it('chiavi sconosciute: ignorate senza segnalazione (dati di versioni future)', () => {
    expect(sanitizeSettings([{ key: 'nuova', value: 1 }]).invalid).toEqual([]);
  });
});

describe('bozza: valida o da scartare', () => {
  const ok = {
    day: 'x1',
    updatedAt: '2026-11-20T20:34:36.100Z',
    sets: { gsq: [{ load: '6' }, null, { load: '8', reps: '10', pending: true }] },
    notes: '',
  };
  it('bozze valide (anche quella trovata sul telefono, con solo i kg)', () => {
    expect(validDraft(ok)).toBe(true);
    expect(validDraft({ ...ok, startedAt: '2026-11-20T20:30:00.000Z', extra: { gsq: [null] } })).toBe(true);
    expect(
      validDraft({
        ...ok,
        circuitRun: { protocol: 0, startedAt: 1, pausedMs: 0 },
        circuit: { protocol: 0, label: 'x', rounds: 6, completedRounds: 2 },
      }),
    ).toBe(true);
    expect(validDraft({ ...ok, sets: { gsq: [{ load: '6', leftDone: true, pending: true }] } })).toBe(true);
  });
  it('bozze non valide', () => {
    expect(validDraft(null)).toBe(false);
    expect(validDraft('bozza')).toBe(false);
    expect(validDraft({ ...ok, day: 3 })).toBe(false);
    expect(validDraft({ ...ok, sets: 'x' })).toBe(false);
    expect(validDraft({ ...ok, sets: { gsq: 'x' } })).toBe(false);
    expect(validDraft({ ...ok, sets: { gsq: [{ load: 6 }] } })).toBe(false);
    expect(validDraft({ ...ok, sets: { gsq: [{ load: '6', pending: 'sì' }] } })).toBe(false);
    expect(validDraft({ ...ok, notes: 5 })).toBe(false);
    expect(validDraft({ ...ok, startedAt: 'adesso' })).toBe(false);
    expect(validDraft({ ...ok, extra: [] })).toBe(false);
    expect(validDraft({ ...ok, circuitRun: { protocol: 'a' } })).toBe(false);
  });
});
