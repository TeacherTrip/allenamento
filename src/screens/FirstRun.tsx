import { useState } from 'react';
import { completeFirstRun } from '../db/db';
import { TEMPLATE_BY_ID } from '../catalog/templates';
import { ModelCards } from '../components/ModelCards';
import type { TemplateId } from '../program/types';

export const PHASE1_FIRST_RUN_TEXT =
  'Le prime 2 settimane: 2 serie per esercizio e più margine (RIR 3, cioè 3 ripetizioni di riserva). Si cambia in Info.';

/**
 * Primo avvio (una sola volta, solo su un'installazione nuova): nome → modello → lato di partenza.
 * Le scelte restano IN MEMORIA: si salva tutto insieme solo con «Inizia».
 * Se l'app si chiude prima, alla riapertura si riparte dalla prima schermata, senza dati parziali.
 */
export function FirstRun() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [userName, setUserName] = useState('');
  const [templateId, setTemplateId] = useState<TemplateId | null>(null);
  const [startSide, setStartSide] = useState<'left' | 'right'>('left');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onStart = async () => {
    if (!templateId || busy) return;
    setBusy(true);
    setError('');
    try {
      await completeFirstRun({ userName, startSide, templateId });
      window.scrollTo(0, 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <div data-testid="firstrun">
      <h1 className="brand">TeacherGym</h1>
      <p className="sub">Passo {step + 1} di 3</p>

      {step === 0 && (
        <>
          <h2>Iniziamo</h2>
          <label className="field">
            <span>Il tuo nome (facoltativo)</span>
            <input
              type="text"
              value={userName}
              maxLength={30}
              autoComplete="off"
              onChange={(e) => setUserName(e.target.value)}
              aria-label="Nome"
            />
          </label>
          <p className="muted small">Resta solo su questo telefono (e nei suoi backup).</p>
          <button className="primary" onClick={() => setStep(1)}>
            Avanti
          </button>
        </>
      )}

      {step === 1 && (
        <>
          <h2>Scegli le schede</h2>
          <p className="sub">Si possono cambiare in seguito da Info.</p>
          <ModelCards
            selected={templateId}
            onChoose={(id) => {
              setTemplateId(id);
              setStep(2);
              window.scrollTo(0, 0);
            }}
          />
          <button className="ghost" onClick={() => setStep(0)}>
            Indietro
          </button>
        </>
      )}

      {step === 2 && templateId && (
        <>
          <h2>Lato di partenza</h2>
          <p className="sub">Negli esercizi a un lato si comincia da:</p>
          <div className="row2 sides" role="group" aria-label="Lato di partenza">
            <button className={`ghost${startSide === 'left' ? ' on' : ''}`} aria-pressed={startSide === 'left'} onClick={() => setStartSide('left')}>
              Sinistro
            </button>
            <button className={`ghost${startSide === 'right' ? ' on' : ''}`} aria-pressed={startSide === 'right'} onClick={() => setStartSide('right')}>
              Destro
            </button>
          </div>
          <div className="box" data-testid="firstrun-phase1">
            {PHASE1_FIRST_RUN_TEXT}
          </div>
          <div className="box">
            <b>Riepilogo</b>
            {userName.trim() && <div>Nome: {userName.trim()}</div>}
            <div>Schede: {TEMPLATE_BY_ID[templateId].label}</div>
            <div>Lato di partenza: {startSide === 'left' ? 'sinistro' : 'destro'}</div>
          </div>
          {error && <div className="warnbox">Non riuscito: {error}</div>}
          <button className="primary big" onClick={onStart} disabled={busy}>
            Inizia
          </button>
          <button className="ghost" onClick={() => setStep(1)} disabled={busy}>
            Indietro
          </button>
        </>
      )}
    </div>
  );
}
