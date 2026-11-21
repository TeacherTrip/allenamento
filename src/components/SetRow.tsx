import type { DraftEntry, DraftField, SetValues } from '../db/models';
import { PUSHUP_LEVELS } from '../program/program';
import { bandOptions } from '../program/bands';
import type { Exercise } from '../program/types';
import { entryToValues, missingText, parseNum, valuesToEntry } from '../logic/values';

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
  /** ✓ (o primo lato) toccato su una serie incompleta: cosa manca. La serie NON si conferma. */
  onIncomplete?: (missing: string) => void;
  /** Serie extra non confermata: si può eliminare. */
  onRemove?: () => void;
  extra?: boolean;
  /** «Separa i lati» (Info). */
  separateSides?: boolean;
}

/**
 * Una serie: campi della metrica + conferma. Grigio = da confermare, pieno = confermato.
 * Esercizi con lati separati (confirmSides) e «Separa i lati» acceso: due tasti affiancati [Sx] [Dx].
 */
export function SetRow({ ex, label, prefill, entry, onChange, onCheck, onLeft, onIncomplete, onRemove, extra, startSide = 'left', separateSides = false }: Props) {
  const confirmed = entry != null && !entry.pending;
  // tasti [Sx] [Dx] solo con «Separa i lati» acceso; spento, un «primo lato fatto» rimasto in bozza è solo «da confermare»
  const sides = !!ex.confirmSides && separateSides;
  const leftDone = sides && !confirmed && !!entry?.leftDone;
  const shown: DraftEntry = entry ? { load: entry.load, reps: entry.reps, seconds: entry.seconds } : valuesToEntry(prefill);
  const hasAny = [shown.load, shown.reps, shown.seconds].some((x) => x != null && x !== '');
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
  // conferma solo una serie completa (ripetizioni o secondi, e il carico dove serve); altrimenti dice cosa manca
  const incomplete = () => {
    const miss = missingText(ex.metric, entryToValues(shown));
    if (miss) onIncomplete?.(miss);
    return !!miss;
  };
  const confirm = () => {
    if (incomplete()) return;
    onChange(shown);
    onCheck?.();
  };
  const left = () => {
    if (incomplete()) return;
    onChange({ ...shown, pending: true, leftDone: true });
    onLeft?.();
  };

  const cls = confirmed ? 'confirmed' : 'prefilled';
  const perSide = ex.unilateral ? ' per lato' : '';

  // segnaposto CORTO (mai tagliato a 360 px, anche con [Sx] [Dx]); il nome completo è nell'aria-label
  const numInput = (field: DraftField, placeholder: string, name: string, decimal = false) => (
    <input
      className={`num ${cls}`}
      inputMode={decimal ? 'decimal' : 'numeric'}
      placeholder={placeholder}
      data-field={field}
      value={shown[field] ?? ''}
      onChange={(e) => edit(field, e.target.value)}
      aria-label={`${label} ${name}`}
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
          {ex.metric === 'kg' && numInput('load', 'kg', `kg${perSide}`, true)}
          {ex.metric === 'time'
            ? numInput('seconds', 'sec', `secondi${perSide}`)
            : numInput('reps', 'rip.', `ripetizioni${perSide}`)}
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
