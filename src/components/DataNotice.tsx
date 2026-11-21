import { useEffect, useState } from 'react';
import { getStartupRepairs, onStartupRepairs } from '../db/sanitize';
import { downloadJson } from '../db/rawDump';

const SETTING_LABELS: Record<string, string> = {
  autoRest: 'Recupero automatico',
  phase1: 'Settimane 1-2',
  separateSides: 'Separa i lati',
  startSide: 'Lato di partenza',
};

/** Nome del file: contiene "backup", quindi resta fuori da Git anche se finisce nel progetto. */
export const discardedFileName = (now = new Date()) => `teachergym-backup-dati-scartati-${now.toISOString().slice(0, 10)}.json`;

/**
 * Avviso dopo il controllo all'avvio (src/db/sanitize.ts): cosa è stato scartato o rimesso al predefinito.
 * La copia di ciò che è stato scartato è solo in memoria: si scarica con un tocco (un file si può scaricare
 * solo dopo un tocco dell'utente), e sparisce chiudendo l'app.
 */
export function DataNotice() {
  const [r, setR] = useState(getStartupRepairs);
  const [closed, setClosed] = useState(false);
  useEffect(() => onStartupRepairs(() => setR(getStartupRepairs())), []);
  if (closed || (r.drafts.length === 0 && r.settings.length === 0)) return null;
  const labels = [...new Set(r.settings.map((s) => SETTING_LABELS[s.key] ?? 'impostazioni interne'))];
  return (
    <div className="warnbox" role="alert" data-testid="data-repaired">
      <b>Alcuni dati salvati non erano validi e sono stati messi da parte.</b>
      <ul>
        {r.draftNames.map((n, i) => (
          <li key={i}>la seduta in corso della scheda {n}: scartata, si riparte da campi vuoti;</li>
        ))}
        {labels.length > 0 && <li>impostazioni ({labels.join(', ')}): tornate al valore predefinito.</li>}
      </ul>
      Le sedute salvate non sono state toccate.
      <div className="slow-actions">
        <button
          className="ghost"
          onClick={() =>
            downloadJson(
              { app: 'TeacherGym', raw: true, kind: 'dati-scartati', exportedAt: new Date().toISOString(), drafts: r.drafts, settings: r.settings },
              discardedFileName(),
            )
          }
        >
          Scarica la copia
        </button>
        <button className="ghost" onClick={() => setClosed(true)}>
          Chiudi
        </button>
      </div>
    </div>
  );
}
