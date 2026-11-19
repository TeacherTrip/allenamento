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
  /** Serie confermata col tasto ✓ (per esercizi per lato: dopo il lato destro). */
  onCheck?: () => void;
  /** Esercizi per lato: confermato il lato sinistro. */
  onLeft?: () => void;
}

/**
 * Una serie: campi della metrica + tasto di conferma. Grigio = da confermare, pieno = confermato.
 * Esercizi per lato: il tasto va toccato due volte, "Sx" poi "Dx" (stesse reps per lato).
 */
export function SetRow({ ex, index, prefill, entry, onChange, onCheck, onLeft }: Props) {
  const confirmed = entry != null && !entry.pending;
  const leftDone = !confirmed && !!entry?.leftDone;
  const shown: DraftEntry = entry ? { load: entry.load, reps: entry.reps, seconds: entry.seconds } : valuesToEntry(prefill);
  const hasAny = [shown.load, shown.reps, shown.seconds].some((x) => x != null && x !== '');

  // scrivere = confermare (ma a metà tra sinistro e destro si resta in attesa del destro)
  const edit = (field: DraftField, value: string) =>
    onChange(leftDone ? { ...shown, [field]: value, pending: true, leftDone: true } : { ...shown, [field]: value });

  const toggle = () => {
    if (confirmed) return onChange({ ...shown, pending: true }); // toglie la conferma, tiene i valori
    if (ex.unilateral && !leftDone) {
      onChange({ ...shown, pending: true, leftDone: true });
      onLeft?.();
      return;
    }
    onChange(shown);
    onCheck?.();
  };

  const cls = confirmed ? 'confirmed' : 'prefilled';
  const repsLabel = ex.unilateral ? 'reps /lato' : 'reps';
  const checkText = confirmed ? '✓' : ex.unilateral ? (leftDone ? 'Dx' : 'Sx') : '✓';
  const checkLabel = confirmed
    ? 'Annulla conferma'
    : ex.unilateral
      ? leftDone
        ? 'Conferma lato destro'
        : 'Conferma lato sinistro'
      : 'Conferma serie';

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
    <div className={`setrow ${cls} ${leftDone ? 'left-done' : ''}`}>
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
        className={`check ${confirmed ? 'on' : ''} ${leftDone ? 'half' : ''}`}
        onClick={toggle}
        disabled={!confirmed && !hasAny}
        aria-label={checkLabel}
      >
        {checkText}
      </button>
    </div>
  );
}
