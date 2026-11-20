import { useState } from 'react';
import { completeFirstRun } from '../db/db';
import { ModelCards } from '../components/ModelCards';
import { nb } from '../logic/format';
import type { TemplateId } from '../program/types';

export const PHASE1_FIRST_RUN_TEXT =
  'Le prime 2 settimane: 2 serie per esercizio e più margine (RIR 3, cioè 3 ripetizioni di riserva). Si cambia in Info.';

/**
 * Primo avvio (una sola volta, solo su un'installazione nuova): UNA schermata con la scelta del modello.
 * La scelta resta IN MEMORIA: si salva solo con «Inizia».
 * Se l'app si chiude prima, alla riapertura la schermata riparte vuota, senza dati parziali.
 */
export function FirstRun() {
  const [templateId, setTemplateId] = useState<TemplateId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onStart = async () => {
    if (!templateId || busy) return;
    setBusy(true);
    setError('');
    try {
      await completeFirstRun(templateId);
      window.scrollTo(0, 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <div data-testid="firstrun">
      <h1 className="brand">TeacherGym</h1>
      <h2>Scegli le schede</h2>
      <p className="sub">Tocca un modello. Si può cambiare in seguito da Info.</p>
      <ModelCards selected={templateId} onChoose={setTemplateId} />
      <div className="box" data-testid="firstrun-phase1">
        {nb(PHASE1_FIRST_RUN_TEXT)}
      </div>
      {error && <div className="warnbox">Non riuscito: {error}</div>}
      <button className="primary big" onClick={onStart} disabled={!templateId || busy}>
        Inizia
      </button>
    </div>
  );
}
