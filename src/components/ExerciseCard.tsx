import type { DraftEntry, SetValues } from '../db/models';
import type { Exercise } from '../program/types';
import { fmtRange } from '../logic/format';
import { SetRow, type Side } from './SetRow';
import { Thumb } from './Thumb';

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
  /** Posizione nel superset: prima voce del blocco, voce successiva, nessun superset. */
  supersetPos: 'first' | 'next' | null;
  /** Badge della voce successiva del superset (es. "1b"), se c'è. */
  nextBadge?: string;
  /** Recupero del pulsante manuale (quello del blocco, o 60 s). */
  manualRestSec: number;
  startSide: Side;
  onSetChange: (index: number, entry: DraftEntry | null) => void;
  onExtraChange: (k: number, entry: DraftEntry | null) => void;
  onExtraRemove: (k: number) => void;
  onAddSet: () => void;
  /** Serie confermata con il tasto: indice nella seduta (previste + extra). */
  onSetCheck: (rowIndex: number) => void;
  /** Primo lato confermato. */
  onSetLeft: () => void;
  onRest: (sec: number) => void;
}

const SIDE_NAME: Record<Side, string> = { left: 'sinistro', right: 'destro' };

export function ExerciseCard(p: Props) {
  const { ex, count, prefill, entries, hint, lastText } = p;
  const ssPos = p.supersetPos === 'first' ? 'ssA' : p.supersetPos === 'next' ? 'ssB' : '';
  const side = SIDE_NAME[p.startSide];
  const first = p.startSide === 'left' ? 'Sx' : 'Dx';
  const second = p.startSide === 'left' ? 'Dx' : 'Sx';

  return (
    <section className={`ex ${ssPos}`} data-ex={ex.id}>
      <div className="exhead">
        <Thumb image={ex.image} alt={ex.name} />
        <div className="exhead-text">
          <div className="exh">
            {ex.superset && <span className="tag">{ex.superset}</span>}
            <h3>{ex.name}</h3>
          </div>
          <div className="meta">
            {ex.equipment} · {count} × {fmtRange(ex)}
            {ex.restSec != null && ex.restSec > 0 && ` · rec. ${ex.restSec}s`}
          </div>
        </div>
      </div>
      <details className="note">
        <summary>Esecuzione</summary>
        {ex.notes}
        {ex.itemNotes && (
          <p className="item-notes">
            <b>Nota della scheda:</b> {ex.itemNotes}
          </p>
        )}
      </details>
      {ex.unilateral &&
        (ex.confirmSides ? (
          <div className="side">
            ↔ Parti dal lato {side}: tocca {first}, poi {second} senza pausa
          </div>
        ) : (
          <div className="side">↔ Parti dal lato {side}, lati alternati: ripetizioni per lato</div>
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
          startSide={p.startSide}
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
          startSide={p.startSide}
          onChange={(e) => p.onExtraChange(k, e)}
          onCheck={() => p.onSetCheck(count + k)}
          onLeft={p.onSetLeft}
          onRemove={() => p.onExtraRemove(k)}
        />
      ))}
      <button className="add-set" onClick={p.onAddSet}>
        + Serie
      </button>
      {p.nextBadge && <div className="next">↓ Passa subito a {p.nextBadge}, recupero dopo la coppia</div>}
      {/* pulsante manuale: sempre presente, con o senza recupero automatico */}
      <button className="rest" onClick={() => p.onRest(p.manualRestSec)}>
        Avvia recupero {p.manualRestSec}s
      </button>
    </section>
  );
}
