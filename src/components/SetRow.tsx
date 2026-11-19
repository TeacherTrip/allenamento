import type { DraftEntry, DraftField, SetValues } from '../db/models';
import { PUSHUP_LEVELS } from '../program/program';
import { bandOptions } from '../program/bands';
import type { Exercise } from '../program/types';
import { parseNum, valuesToEntry } from '../logic/values';

interface Props {
  ex: Exercise;
  index: number;
  prefill: SetValues | undefined;
  /** null/undefined = non confermata (mostra la precompilazione). */
  entry: DraftEntry | null | undefined;
  onChange: (entry: DraftEntry | null) => void;
  /** Chiamata solo quando la serie viene confermata col tasto ✓ (non scrivendo). */
  onCheck?: () => void;
}

/** Una serie: campi della metrica + tasto ✓. Grigio = precompilato, pieno = confermato. */
export function SetRow({ ex, index, prefill, entry, onChange, onCheck }: Props) {
  const confirmed = entry != null && !entry.pending;
  const shown: DraftEntry = entry ? { load: entry.load, reps: entry.reps, seconds: entry.seconds } : valuesToEntry(prefill);
  const hasAny = [shown.load, shown.reps, shown.seconds].some((x) => x != null && x !== '');

  // scrivere = confermare
  const edit = (field: DraftField, value: string) => onChange({ ...shown, [field]: value });
  // ✓: conferma; se già confermata, toglie la conferma MA tiene i valori (tornano grigi)
  const toggle = () => {
    if (confirmed) return onChange({ ...shown, pending: true });
    onChange(shown);
    onCheck?.();
  };
  const cls = confirmed ? 'confirmed' : 'prefilled';
  const repsLabel = ex.unilateral ? 'reps /lato' : 'reps';

  const numInput = (field: DraftField, placeholder: string, decimal = false) => (
    <input
      className={`num ${cls}`}
      inputMode={decimal ? 'decimal' : 'numeric'}
      placeholder={placeholder}
      value={shown[field] ?? ''}
      onChange={(e) => edit(field, e.target.value)}
      aria-label={`Serie ${index + 1} ${placeholder}`}
    />
  );

  const chips = (options: { value: number; label: string }[]) => {
    const current = parseNum(shown.load);
    return (
      <div className="chips">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`chip ${current === o.value ? `on ${cls}` : ''}`}
            onClick={() => edit('load', String(o.value))}
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className={`setrow ${cls}`}>
      <span className="setn">S{index + 1}</span>
      <div className="setfields">
        {ex.metric === 'band' && chips(bandOptions(ex.bandDirection ?? 'resistance'))}
        {ex.metric === 'level' &&
          chips(Object.entries(PUSHUP_LEVELS).map(([k, v]) => ({ value: Number(k), label: `${k} ${v}` })))}
        <div className="inputs">
          {ex.metric === 'kg' && numInput('load', 'kg', true)}
          {ex.metric === 'time' ? numInput('seconds', ex.unilateral ? 'sec /lato' : 'sec') : numInput('reps', repsLabel)}
        </div>
      </div>
      <button
        type="button"
        className={`check ${confirmed ? 'on' : ''}`}
        onClick={toggle}
        disabled={!confirmed && !hasAny}
        aria-label={confirmed ? 'Annulla conferma' : 'Conferma serie'}
      >
        ✓
      </button>
    </div>
  );
}
