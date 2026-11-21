import { useState } from 'react';
import { DB_NAME } from '../db/db';
import { DbNotRespondingError, downloadJson, rawDumpFileName, readRawDumpWithin } from '../db/rawDump';

/** Tempo massimo per leggere il database prima di dire che non risponde. */
export const BACKUP_TIMEOUT_MS = 5000;

export const BACKUP_NOT_READABLE =
  'Non riesco a leggere i dati: il database non risponde. Chiudi le altre schede o finestre di TeacherGym (oppure chiudi e riapri Chrome) e riprova. I dati restano salvati sul telefono.';

/**
 * «Scarica backup» quando l'app non si apre o non funziona: legge TUTTO il database così com'è (backup grezzo),
 * senza Dexie e con un tempo massimo. Dice sempre com'è andata.
 */
export function RawBackupButton({
  className = 'primary',
  label = 'Scarica backup',
  statusTestId = 'backup-status',
}: {
  className?: string;
  label?: string;
  statusTestId?: string;
}) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    setBusy(true);
    setStatus('Lettura dei dati…');
    try {
      const dump = await readRawDumpWithin(DB_NAME, BACKUP_TIMEOUT_MS);
      downloadJson(dump, rawDumpFileName());
      const n = Object.values(dump.stores).reduce((a, s) => a + s.length, 0);
      const bad = Object.keys(dump.errors);
      setStatus(
        `Backup grezzo scaricato (${n} righe lette${bad.length ? `; non lette: ${bad.join(', ')}` : ''}). Conservalo: serve per recuperare i dati.`,
      );
    } catch (e) {
      setStatus(
        e instanceof DbNotRespondingError
          ? BACKUP_NOT_READABLE
          : `Backup non riuscito: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button className={className} onClick={() => void onClick()} disabled={busy}>
        {label}
      </button>
      {status && (
        <p data-testid={statusTestId} role="status">
          {status}
        </p>
      )}
    </>
  );
}
