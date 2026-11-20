import { TEMPLATES } from '../catalog/templates';
import type { TemplateId } from '../program/types';

/** Indirizzo di un'immagine in public/ (BASE_URL = '/allenamento/' su GitHub Pages, mai un '/' fisso). */
const publicUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;

/**
 * Schede toccabili dei modelli (primo avvio e Info → «Ricarica un modello»):
 * immagine grande in alto, titolo, elenco delle schede con il numero di esercizi. Testi neutri.
 */
export function ModelCards({ onChoose, selected }: { onChoose: (id: TemplateId) => void; selected?: TemplateId | null }) {
  return (
    <div className="models">
      {TEMPLATES.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`model${selected === t.id ? ' on' : ''}`}
          data-testid={`model-${t.id}`}
          aria-pressed={selected === t.id}
          onClick={() => onChoose(t.id)}
        >
          {t.image ? (
            <img src={publicUrl(t.image)} alt={`Illustrazione del ${t.label}`} width={800} height={597} />
          ) : (
            <span className="model-empty" aria-hidden="true">
              ＋
            </span>
          )}
          <b>{t.label}</b>
          <ul>
            {t.programs.map((p) => (
              <li key={p.id}>
                Scheda {p.name}
                {p.description ? ` — ${p.description}` : ''} · {p.items.length === 0 ? 'nessun esercizio' : `${p.items.length} esercizi`}
              </li>
            ))}
          </ul>
        </button>
      ))}
    </div>
  );
}
