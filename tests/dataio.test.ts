import { describe, expect, it } from 'vitest';
import { buildBackup, detectFormat, parseBackup } from '../src/logic/backup';
import { convertPrototype, parseProtoLoad } from '../src/logic/importPrototype';
import { DEFAULT_SETTINGS, type Session, type SetLog } from '../src/db/models';
import { EXERCISE_BY_ID } from '../src/program/program';

// Dati INVENTATI per i test.
const sessions: Session[] = [{ id: 'x1', date: '2026-02-02T09:00:00.000Z', day: 'A', phase1: true, notes: 'prova', programVersion: 1 }];
const setLogs: SetLog[] = [{ id: 'l1', sessionId: 'x1', exerciseId: 'gsq', setIndex: 0, load: 12, reps: 10, confirmed: true }];

describe('backup TeacherGym', () => {
  it('export → import restituisce gli stessi dati', () => {
    const file = JSON.parse(JSON.stringify(buildBackup(sessions, setLogs, DEFAULT_SETTINGS)));
    expect(detectFormat(file)).toBe('teachergym');
    const back = parseBackup(file);
    expect(back.sessions).toEqual(sessions);
    expect(back.setLogs).toEqual(setLogs);
    expect(back.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('rifiuta serie che puntano a sedute inesistenti', () => {
    const file = buildBackup(sessions, [{ ...setLogs[0], sessionId: 'nope' }], DEFAULT_SETTINGS);
    expect(() => parseBackup(file)).toThrow(/senza seduta/);
  });

  it('rifiuta file che non sono backup', () => {
    expect(() => parseBackup({ foo: 1 })).toThrow();
    expect(detectFormat('ciao')).toBe('unknown');
  });
});

describe('import dal prototipo', () => {
  const proto = {
    sessions: [
      {
        id: 1700000000000,
        day: 'A',
        date: '2026-01-10T08:00:00.000Z',
        note: 'nota finta',
        entries: {
          gsq: [{ l: '14', r: '10' }, { l: '14', r: '9' }],
          pu: [{ l: 'schienale divano', r: '10' }, { l: 'boh', r: '8' }],
          pull: [{ l: 'elastico 30', r: '4' }, {}],
          rdl: [{ l: '2x10', r: '12' }],
          db: [{ l: '', r: '8' }],
        },
      },
    ],
  };

  it('riconosce il formato', () => {
    expect(detectFormat(proto)).toBe('prototype');
  });

  it('converte i valori interpretabili e mette gli altri nelle note', () => {
    const res = convertPrototype(proto);
    expect(res.sessions).toHaveLength(1);
    const s = res.sessions[0];
    expect(s.id).toBe('proto-1700000000000');
    const by = (ex: string) => res.setLogs.filter((l) => l.exerciseId === ex).map((l) => [l.load, l.reps]);
    expect(by('gsq')).toEqual([[14, 10], [14, 9]]);
    expect(by('pu')).toEqual([[2, 10], [undefined, 8]]);
    expect(by('pull')).toEqual([[30, 4]]);
    expect(by('rdl')).toEqual([[10, 12]]);
    expect(by('db')).toEqual([[undefined, 8]]);
    expect(s.notes).toContain('nota finta');
    expect(s.notes).toContain('"boh" non interpretato');
  });

  it('parseProtoLoad rispetta la direzione degli elastici', () => {
    expect(parseProtoLoad(EXERCISE_BY_ID.pull, 'senza elastico')).toBe(0);
    expect(parseProtoLoad(EXERCISE_BY_ID.lpd, '20+30')).toBe(50);
    expect(parseProtoLoad(EXERCISE_BY_ID.lpd, 'nessuno')).toBeUndefined();
    expect(parseProtoLoad(EXERCISE_BY_ID.pu, 'divano')).toBeUndefined(); // ambiguo: schienale o seduta?
  });
});
