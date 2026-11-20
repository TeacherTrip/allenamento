import { describe, expect, it } from 'vitest';
import { buildBackup, detectFormat, parseBackup } from '../src/logic/backup';
import { convertPrototype, parseProtoLoad, protoImportMessage } from '../src/logic/importPrototype';
import { DEFAULT_SETTINGS, type Session, type SetLog } from '../src/db/models';
import { EXERCISE_BY_ID } from '../src/program/program';
import { model1Programs, upgradeSession } from '../src/db/migrate';

// Dati INVENTATI per i test.
const sessions: Session[] = [{ id: 'x1', date: '2026-02-02T09:00:00.000Z', day: 'A', phase1: true, notes: 'prova', programVersion: 1 }];
const setLogs: SetLog[] = [{ id: 'l1', sessionId: 'x1', exerciseId: 'gsq', setIndex: 0, load: 12, reps: 10, confirmed: true }];

describe('backup TeacherGym', () => {
  it('export → import restituisce gli stessi dati', () => {
    const v2 = sessions.map(upgradeSession);
    const file = JSON.parse(JSON.stringify(buildBackup(v2, setLogs, DEFAULT_SETTINGS, model1Programs())));
    expect(detectFormat(file)).toBe('teachergym');
    const back = parseBackup(file);
    expect(back.sessions).toEqual(v2);
    expect(back.setLogs).toEqual(setLogs);
    expect(back.settings).toEqual(DEFAULT_SETTINGS);
    expect(back.programs).toEqual(model1Programs());
  });

  it('rifiuta serie che puntano a sedute inesistenti', () => {
    const file = buildBackup(sessions, [{ ...setLogs[0], sessionId: 'nope' }], DEFAULT_SETTINGS, model1Programs());
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

  it('lo stesso file viene letto sempre allo stesso modo (primo e secondo import)', () => {
    const a = convertPrototype(JSON.parse(JSON.stringify(proto)));
    const b = convertPrototype(JSON.parse(JSON.stringify(proto)));
    expect(b).toEqual(a);
    expect(a.warnings).toEqual([]); // "boh" sta nelle note della seduta, non negli avvisi generali
  });

  it('messaggio: primo import con i valori non interpretati, secondo import "nessuna seduta nuova"', () => {
    const res = convertPrototype(proto);
    const id = res.sessions[0].id;
    expect(protoImportMessage(res, [id])).toBe(
      'Importate dal prototipo: 1 seduta.\n1 valore non interpretato: li trovi nelle note delle sedute importate.',
    );
    // stesso file di nuovo: la seduta c'è già → niente avviso sui valori (riguarda una seduta saltata)
    expect(protoImportMessage(res, [])).toBe('Nessuna seduta nuova: 1 già presente, saltata.');
  });

  it('messaggio: import parziale e avvisi solo delle sedute aggiunte', () => {
    const two = {
      sessions: [
        proto.sessions[0],
        { id: 2, day: 'B', date: '2026-01-12T08:00:00.000Z', entries: { boh: [{ l: '1', r: '1' }] } },
        { id: 3, day: 'X', date: 'non una data', entries: {} },
      ],
    };
    const res = convertPrototype(two);
    expect(protoImportMessage(res, ['proto-2'])).toBe(
      [
        'Importate dal prototipo: 1 seduta.',
        '1 già presente, saltata.',
        'Esercizio sconosciuto "boh" saltato.',
        'Una seduta del prototipo non è valida ed è stata saltata.',
      ].join('\n'),
    );
    expect(protoImportMessage(res, [])).toBe(
      'Nessuna seduta nuova: 2 già presenti, saltate.\nUna seduta del prototipo non è valida ed è stata saltata.',
    );
  });

  it('parseProtoLoad rispetta la direzione degli elastici', () => {
    expect(parseProtoLoad(EXERCISE_BY_ID.pull, 'senza elastico')).toBe(0);
    expect(parseProtoLoad(EXERCISE_BY_ID.lpd, '20+30')).toBe(50);
    expect(parseProtoLoad(EXERCISE_BY_ID.lpd, 'nessuno')).toBeUndefined();
    expect(parseProtoLoad(EXERCISE_BY_ID.pu, 'divano')).toBeUndefined(); // ambiguo: schienale o seduta?
  });
});
