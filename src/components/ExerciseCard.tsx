import type { DraftEntry, SetValues } from '../db/models';
import { supersetPartner } from '../program/program';
import type { Exercise } from '../program/types';
import { fmtRange } from '../logic/format';
import { SetRow } from './SetRow';

interface Props {
  ex: Exercise;
  count: number;
  prefill: (SetValues | undefined)[];
  entries: (DraftEntry | null)[];
  hint: string | null;
  lastText: string | null;
  onSetChange: (index: number, entry: DraftEntry | null) => void;
}

export function ExerciseCard({ ex, count, prefill, entries, hint, lastText, onSetChange }: Props) {
  const ssPos = ex.superset ? (ex.superset.endsWith('a') ? 'ssA' : 'ssB') : '';
  const partner = supersetPartner(ex);

  return (
    <section className={`ex ${ssPos}`}>
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
      {ex.unilateral && <div className="side">↔ Parti dal lato sinistro</div>}
      {lastText && <div className="last">Ultima volta: {lastText}</div>}
      {hint && <div className="hint">↑ {hint}</div>}
      {Array.from({ length: count }, (_, i) => (
        <SetRow
          key={i}
          ex={ex}
          index={i}
          prefill={prefill[i]}
          entry={entries[i]}
          onChange={(e) => onSetChange(i, e)}
        />
      ))}
      {partner && <div className="next">↓ Passa subito a {partner.superset}, recupero dopo la coppia</div>}
    </section>
  );
}
