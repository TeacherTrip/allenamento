import { useLiveQuery } from 'dexie-react-hooks';
import { db, loadSettings } from '../db/db';
import type { Session, SetLog, Settings } from '../db/models';

/** Tutto lo storico (sedute + serie), aggiornato in automatico quando cambia il database. */
export function useHistory(): { sessions: Session[]; logs: SetLog[] } | undefined {
  return useLiveQuery(async () => {
    const [sessions, logs] = await Promise.all([db.sessions.toArray(), db.setLogs.toArray()]);
    return { sessions, logs };
  }, []);
}

export function useSettings(): Settings | undefined {
  return useLiveQuery(loadSettings, []);
}
