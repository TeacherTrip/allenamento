import type { DraftEntry, DraftField, SetValues } from '../db/models';
import { PUSHUP_LEVELS } from '../program/program';
import { bandOptions } from '../program/bands';
import type { Exercise } from '../program/types';
import { parseNum, valuesToEntry } from '../logic/values';

export type Side = 'left' | 'right';

interface Props {
  ex: Exercise;
  /** Lato di partenza (Info): il primo dei due tasti dei lati. Predefinito: sinistro. */
  startSide?: Side;
  /** Etichetta della riga: "S1", "S2", … (anche per le extra). */
  label: string;
  prefill: SetValues | undefined;
  /** null/undefined = non confermata (mostra la precompilazione). */
  entry: DraftEntry | null | undefined;
  onChange: (entry: DraftEntry | null) => void;
  /** Serie confermata col tasto (per esercizi con lati separati: dopo [Dx]). */
  onCheck?: () => void;
  /** Esercizi con lati separati: confermato il PRIMO lato (quello di partenza). */
  onLeft?: () => void;
  /** Serie extra non confermata: si può eliminare. */
  onRemove?: () => void;
  extra?: boolean;
}

/**
 * Una serie: campi della metrica + conferma. Grigio = da confermare, pieno = confermato.
 * Esercizi con lati separati (confirmSides): due tasti affiancati [Sx] [Dx].
 */
export function SetRow({ ex, label, prefill, entry, onChange, onCheck, onLeft, onRemove, extra, startSide = 'left' }: Props) {
  const confirmed = entry != null && !entry.pending;
  const leftDone = !confirmed && !!entry?.leftDone;
  const shown: DraftEntry = entry ? { load: entry.load, reps: entry.reps, seconds: entry.seconds } : valuesToEntry(prefill);
  const hasAny = [shown.load, shown.reps, shown.seconds].some((x) => x != null && x !== '');
  const sides = !!ex.confirmSides;
  // `leftDone` nella bozza vuol dire "primo lato fatto" (il primo è quello di partenza)
  const [firstName, secondName] = startSide === 'left' ? ['sinistro', 'destro'] : ['destro', 'sinistro'];
  const [firstShort, secondShort] = startSide === 'left' ? ['Sx', 'Dx'] : ['Dx', 'Sx'];

  // scrivere NON conferma: conferma solo il tasto ✓ (che fa partire il recupero).
  // Una serie già confermata resta confermata se si corregge un valore.
  const edit = (field: DraftField, value: string) =>
    onChange(
      confirmed
        ? { ...shown, [field]: value }
        : { ...shown, [field]: value, pending: true, ...(leftDone ? { leftDone: true } : {}) },
    );

  const unconfirm = () => onChange({ ...shown, pending: true }); // toglie la conferma, tiene i valori
  const confirm = () => {
    onChange(shown);
    onCheck?.();
  };
  const left = () => {
    onChange({ ...shown, pending: true, leftDone: true });
    onLeft?.();
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
      aria-label={`${label} ${placeholder}`}
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

  let buttons;
  if (!sides) {
    buttons = (
      <button
        type="button"
        className={`check ${confirmed ? 'on' : ''}`}
        onClick={confirmed ? unconfirm : confirm}
        disabled={!confirmed && !hasAny}
        aria-label={confirmed ? 'Annulla conferma' : 'Conferma serie'}
      >
        ✓
      </button>
    );
  } else {
    buttons = (
      <div className="sides">
        <button
          type="button"
          className={`check side-btn ${confirmed ? 'on' : leftDone ? 'half' : ''}`}
          onClick={confirmed ? unconfirm : leftDone ? undefined : left}
          disabled={!confirmed && !leftDone && !hasAny}
          aria-label={confirmed ? 'Annulla conferma' : leftDone ? `Lato ${firstName} fatto` : `Conferma lato ${firstName}`}
        >
          {firstShort}
        </button>
        <button
          type="button"
          className={`check side-btn ${confirmed ? 'on' : ''}`}
          onClick={leftDone ? confirm : undefined}
          disabled={!leftDone}
          aria-label={confirmed ? `Lato ${secondName} fatto` : `Conferma lato ${secondName}`}
        >
          {secondShort}
        </button>
      </div>
    );
  }

  return (
    <div className={`setrow ${cls} ${leftDone ? 'left-done' : ''} ${sides ? 'two-sides' : ''} ${extra ? 'extra' : ''}`}>
      <span className="setn">
        {label}
        {extra && <small className="extra-tag">extra</small>}
      </span>
      <div className="setfields">
        {ex.metric === 'band' && chips(bandOptions(ex.bandDirection ?? 'resistance'))}
        {ex.metric === 'level' &&
          chips(Object.entries(PUSHUP_LEVELS).map(([k, v]) => ({ value: Number(k), label: `${k} ${v}` })))}
        <div className="inputs">
          {ex.metric === 'kg' && numInput('load', 'kg', true)}
          {ex.metric === 'time' ? numInput('seconds', ex.unilateral ? 'sec /lato' : 'sec') : numInput('reps', repsLabel)}
          {onRemove && !confirmed && (
            <button type="button" className="x" onClick={onRemove} aria-label={`Elimina ${label}`}>
              ✕
            </button>
          )}
        </div>
      </div>
      {buttons}
    </div>
  );
}
