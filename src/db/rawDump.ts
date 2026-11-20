/**
 * "Backup grezzo": legge TUTTO quello che c'è nel database con le API di IndexedDB, senza Dexie.
 * Serve quando l'apertura normale o la migrazione falliscono: il database resta nella versione
 * di prima e questo lo legge così com'è, senza chiedere aggiornamenti.
 */
export interface RawDump {
  app: 'TeacherGym';
  raw: true;
  exportedAt: string;
  /** Versione interna di IndexedDB (Dexie: versione × 10). */
  idbVersion: number;
  stores: Record<string, unknown[]>;
  /** Tabelle che non è stato possibile leggere, con il motivo. */
  errors: Record<string, string>;
}

export function readRawDump(dbName: string): Promise<RawDump> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName); // senza versione: apre quella che c'è, nessun upgrade
    req.onupgradeneeded = () => {
      // il database non esisteva: non crearlo
      req.transaction?.abort();
    };
    req.onerror = () => reject(new Error(req.error?.message ?? 'Database non leggibile'));
    req.onblocked = () => reject(new Error('Database bloccato da un’altra scheda dell’app'));
    req.onsuccess = async () => {
      const idb = req.result;
      const out: RawDump = { app: 'TeacherGym', raw: true, exportedAt: new Date().toISOString(), idbVersion: idb.version, stores: {}, errors: {} };
      for (const name of Array.from(idb.objectStoreNames)) {
        try {
          out.stores[name] = await new Promise<unknown[]>((res, rej) => {
            const r = idb.transaction(name, 'readonly').objectStore(name).getAll();
            r.onsuccess = () => res(r.result as unknown[]);
            r.onerror = () => rej(r.error);
          });
        } catch (e) {
          out.errors[name] = e instanceof Error ? e.message : String(e);
        }
      }
      idb.close();
      resolve(out);
    };
  });
}

/** Nome del file: contiene "backup", quindi resta fuori da Git anche se finisce nel progetto. */
export function rawDumpFileName(now = new Date()): string {
  return `teachergym-backup-grezzo-${now.toISOString().slice(0, 10)}.json`;
}

export function downloadJson(data: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
