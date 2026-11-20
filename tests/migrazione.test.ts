import { describe, expect, it } from 'vitest';
import { model1Plan, model1Programs, settingsToAdd, upgradeSession, type SettingRow } from '../src/db/migrate';
import { DEFAULT_SETTINGS, type Session } from '../src/db/models';
import { TEMPLATE_BY_ID } from '../src/catalog/templates';
import { parseBackup } from '../src/logic/backup';
import { convertPrototype } from '../src/logic/importPrototype';

// Dati INVENTATI.
const v1 = (id: string, day: 'A' | 'B' | 'C', date: string): Session => ({ id, date, day, phase1: false, notes: 'n', programVersion: 1 });

describe('migrazione v1 → v2: sedute', () => {
  it('aggiunge nome della scheda e copia delle voci del Modello 1, senza toccare il resto', () => {
    const s = { ...v1('s1', 'B', '2026-10-01T09:00:00.000Z'), durationSec: 2700 };
    const u = upgradeSession(s);
    expect(u).toEqual({ ...s, programName: 'B', plan: TEMPLATE_BY_ID.m1.programs[1].items });
    expect(s).not.toHaveProperty('programName'); // l'originale non viene modificato
  });

  it('idempotente: rieseguita restituisce la stessa seduta', () => {
    const once = upgradeSession(v1('s1', 'A', '2026-10-01T09:00:00.000Z'));
    const twice = upgradeSession(once);
    expect(twice).toBe(once);
    expect(JSON.parse(JSON.stringify(twice))).toEqual(JSON.parse(JSON.stringify(once)));
  });

  it('la copia delle voci è indipendente dal modello nel codice', () => {
    const plan = model1Plan('A')!;
    plan[0].sets = 99;
    expect(TEMPLATE_BY_ID.m1.programs[0].items[0].sets).toBe(3);
  });

  it('scheda sconosciuta: la seduta resta intatta, piano vuoto', () => {
    const s = { ...v1('s9', 'A', '2026-10-01T09:00:00.000Z'), day: 'Z' as 'A' };
    expect(upgradeSession(s)).toEqual({ ...s, programName: 'Z', plan: [] });
  });

  it('schede del Modello 1 con id A, B, C (copia)', () => {
    const p = model1Programs();
    expect(p.map((x) => x.id)).toEqual(['A', 'B', 'C']);
    p[0].name = 'cambiato';
    expect(TEMPLATE_BY_ID.m1.programs[0].name).toBe('A');
  });
});

describe('migrazione v1 → v2: impostazioni', () => {
  const sessions = [{ date: '2026-10-05T09:00:00.000Z' }, { date: '2026-09-28T09:00:00.000Z' }];

  it('installazione esistente: primo avvio fatto, Modello 1, lati separati dal sinistro, nome vuoto', () => {
    const rows: SettingRow[] = [{ key: 'phase1', value: false }, { key: 'cardioProtocol', value: 2 }];
    expect(settingsToAdd(rows, sessions)).toEqual([
      { key: 'onboarded', value: true },
      { key: 'templateId', value: 'm1' },
      { key: 'startSide', value: 'left' },
      { key: 'separateSides', value: true },
      { key: 'userName', value: '' },
      { key: 'phase1Since', value: null },
    ]);
  });

  it('"Settimane 1-2" attivo: data = prima seduta; senza sedute resta vuota (nessun avviso)', () => {
    const rows: SettingRow[] = [{ key: 'phase1', value: true }];
    expect(settingsToAdd(rows, sessions).find((r) => r.key === 'phase1Since')?.value).toBe('2026-09-28T09:00:00.000Z');
    const empty = settingsToAdd(rows, []).find((r) => r.key === 'phase1Since');
    expect(empty).toEqual({ key: 'phase1Since', value: null });
  });

  it('"Settimane 1-2" mai toccato: vale il predefinito (attivo)', () => {
    expect(DEFAULT_SETTINGS.phase1).toBe(true);
    expect(settingsToAdd([], sessions).find((r) => r.key === 'phase1Since')?.value).toBe('2026-09-28T09:00:00.000Z');
  });

  it('idempotente e mai sovrascritte le chiavi esistenti', () => {
    const rows: SettingRow[] = [{ key: 'phase1', value: true }, { key: 'startSide', value: 'right' }];
    const added = settingsToAdd(rows, sessions);
    expect(added.find((r) => r.key === 'startSide')).toBeUndefined();
    expect(settingsToAdd([...rows, ...added], sessions)).toEqual([]);
  });
});

describe('backup: versioni 1 e 2', () => {
  const sessionsV1 = [v1('x1', 'A', '2026-02-02T09:00:00.000Z')];
  const logs = [{ id: 'l1', sessionId: 'x1', exerciseId: 'gsq', setIndex: 0, load: 12, reps: 10, confirmed: true }];
  const fileV1 = {
    app: 'TeacherGym', formatVersion: 1, exportedAt: '2026-11-01T00:00:00.000Z', programVersion: 1,
    sessions: sessionsV1, setLogs: logs,
    settings: { phase1: false, cardioProtocol: 1, lastBackupAt: null, sessionsSinceBackup: 2, autoRest: true },
  };

  it('backup v1: sedute migrate come nel database, solo impostazioni della v1, schede non toccate', () => {
    const d = parseBackup(JSON.parse(JSON.stringify(fileV1)));
    expect(d.sessions).toEqual(sessionsV1.map(upgradeSession));
    expect(d.settings).toEqual(fileV1.settings);
    expect(d.settings).not.toHaveProperty('onboarded');
    expect(d.programs).toBeUndefined();
  });

  it('backup v1: rifiuta schede diverse da A/B/C', () => {
    expect(() => parseBackup({ ...fileV1, sessions: [{ ...sessionsV1[0], day: 'Q1w2' }] })).toThrow(/sedute non valide/);
  });

  it('backup v2: schede con id generati, impostazioni sconosciute scartate', () => {
    const programs = model1Programs().map((p, i) => ({ ...p, id: `gen-${i}` }));
    const s = upgradeSession({ ...sessionsV1[0], day: 'gen-0' as 'A' });
    const d = parseBackup({
      ...fileV1, formatVersion: 2, programs, sessions: [s],
      settings: { ...DEFAULT_SETTINGS, userName: 'Nome Inventato', onboarded: true, chiaveStrana: 1 },
    });
    expect(d.sessions[0].day).toBe('gen-0');
    expect(d.programs).toEqual(programs);
    expect(d.settings).toEqual({ ...DEFAULT_SETTINGS, userName: 'Nome Inventato', onboarded: true });
  });

  it('backup v2 senza schede o con schede rotte: rifiutato', () => {
    const base = { ...fileV1, formatVersion: 2, sessions: sessionsV1.map(upgradeSession) };
    expect(() => parseBackup(base)).toThrow(/schede non valide/);
    expect(() => parseBackup({ ...base, programs: [{ id: 'A', name: 'A', order: 1, items: [{ exerciseId: 'gsq' }] }] })).toThrow(/schede non valide/);
  });

  it('versione futura: chiede di aggiornare l’app', () => {
    expect(() => parseBackup({ ...fileV1, formatVersion: 3 })).toThrow(/aggiorna/);
  });
});

describe('import del prototipo', () => {
  it('le sedute importate hanno nome della scheda e copia delle voci', () => {
    const res = convertPrototype({ sessions: [{ id: 'p1', day: 'C', date: '2026-03-03T10:00:00.000Z', entries: { lc: [{ l: '', r: '10' }] }, note: '' }] });
    expect(res.sessions[0].programName).toBe('C');
    expect(res.sessions[0].plan).toEqual(TEMPLATE_BY_ID.m1.programs[2].items);
  });
});
