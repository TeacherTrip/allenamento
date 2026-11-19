import type { DraftEntry, SetValues } from '../db/models';
import { supersetPartner } from '../program/program';
import type { Exercise } from '../program/types';
import { fmtRange } from '../logic/format';
import { SetRow } from './SetRow';

interface Props {
  ex: Exercise;
  /** Serie previste dalla scheda (con l'interruttore Settimane 1-2). */
  count: number;
  prefill: (SetValues | undefined)[];
  entries: (DraftEntry | null)[];
  /** Serie extra: valori in bozza e precompilazione (dalla riga sopra). */
  extraEntries: (DraftEntry | null)[];
  extraPrefill: (SetValues | undefined)[];
  hint: string | null;
  lastText: string | null;
  onSetChange: (index: number, entry: DraftEntry | null) => void;
  onExtraChange: (k: number, entry: DraftEntry | null) => void;
  onExtraRemove: (k: number) => void;
  onAddSet: () => void;
  /** Serie confermata con il tasto: indice nella seduta (previste + extra). */
  onSetCheck: (rowIndex: number) => void;
  /** Lato sinistro confermato. */
  onSetLeft: () => void;
  onRest: (sec: number) => void;
}

/** Recupero del pulsante manuale: quello dell'esercizio; per il primo di un superset, quello della coppia. */
export function manualRestSec(ex: Exercise): number {
  return ex.restSec || supersetPartner(ex)?.restSec || 60;
}

export function ExerciseCard(p: Props) {
  const { ex, count, prefill, entries, hint, lastText } = p;
  const ssPos = ex.superset ? (ex.superset.endsWith('a') ? 'ssA' : 'ssB') : '';
  const partner = supersetPartner(ex);
  const restSec = manualRestSec(ex);

  return (
    <section className={`ex ${ssPos}`} data-ex={ex.id}>
      <div className="exh">
        {ex.superset && <span className="tag">{ex.superset}</span>}
        <h3>{ex.name}</h3>
      </div>
      <div className="meta">
        {ex.equipment} · {count} × {fmtRange(ex)}
        {ex.restSec > 0 && ` · rec. ${ex.restSec}s`}
      </div>
      {ex.image && <img className="eximg" src={ex.image} alt={ex.name} loading="lazy" />}
      <details className="note">
        <summary>Esecuzione</summary>
        {ex.notes}
      </details>
      {ex.unilateral &&
        (ex.confirmSides ? (
          <div className="side">↔ Parti dal lato sinistro: tocca Sx, poi Dx senza pausa</div>
        ) : (
          <div className="side">↔ Parti dal lato sinistro, lati alternati: ripetizioni per lato</div>
        ))}
      {lastText && <div className="last">Ultima volta: {lastText}</div>}
      {hint && <div className="hint">↑ {hint}</div>}
      {Array.from({ length: count }, (_, i) => (
        <SetRow
          key={`s${i}`}
          ex={ex}
          label={`S${i + 1}`}
          prefill={prefill[i]}
          entry={entries[i]}
          onChange={(e) => p.onSetChange(i, e)}
          onCheck={() => p.onSetCheck(i)}
          onLeft={p.onSetLeft}
        />
      ))}
      {p.extraEntries.map((entry, k) => (
        <SetRow
          key={`x${k}`}
          ex={ex}
          extra
          label={`S${count + k + 1}`}
          prefill={p.extraPrefill[k]}
          entry={entry}
          onChange={(e) => p.onExtraChange(k, e)}
          onCheck={() => p.onSetCheck(count + k)}
          onLeft={p.onSetLeft}
          onRemove={() => p.onExtraRemove(k)}
        />
      ))}
      <button className="add-set" onClick={p.onAddSet}>
        + Serie
      </button>
      {partner && <div className="next">↓ Passa subito a {partner.superset}, recupero dopo la coppia</div>}
      {/* pulsante manuale: sempre presente, con o senza recupero automatico */}
      <button className="rest" onClick={() => p.onRest(restSec)}>
        Avvia recupero {restSec}s
      </button>
    </section>
  );
}
