/**
 * Cosa succede dopo la conferma (✓) di una serie: regole dei superset e del recupero.
 *
 * Un BLOCCO è una voce singola oppure un gruppo di voci consecutive unite da "superset con il successivo".
 * Un "giro" i del blocco = la serie i di ogni voce del blocco che ha almeno i+1 serie.
 * - Dopo ✓ di una voce alla serie i: se una voce successiva del blocco ha la serie i → si passa a quella (niente recupero).
 * - Altrimenti il giro è finito → parte il recupero del blocco (anche se la voce è la prima e la seconda ha già finito).
 * - Recupero del blocco: quello dell'ultima voce del blocco che ne ha uno (null = "–" = nessun timer).
 * - Nessun timer dopo l'ultima serie della seduta.
 */

export interface FlowItem {
  id: string;
  /** Righe di questa voce nella seduta: serie previste (dopo "Settimane 1-2") + extra. */
  count: number;
  /** null = "–", nessun timer dopo questa voce. */
  restSec: number | null;
  supersetNext?: boolean;
}

export type CheckAction = { kind: 'next'; to: string } | { kind: 'rest'; sec: number } | { kind: 'none' };

/** Indici di inizio e fine (compresi) del blocco che contiene la voce `index`. */
export function blockOf(items: Pick<FlowItem, 'supersetNext'>[], index: number): [number, number] {
  let s = index;
  while (s > 0 && items[s - 1].supersetNext) s--;
  let e = index;
  while (e < items.length - 1 && items[e].supersetNext) e++;
  return [s, e];
}

/** Recupero del blocco: quello dell'ultima voce (dal fondo) che ne ha uno; null = nessun timer. */
export function blockRest(items: FlowItem[], index: number): number | null {
  const [s, e] = blockOf(items, index);
  for (let k = e; k >= s; k--) {
    const r = items[k].restSec;
    if (r != null && r > 0) return r;
  }
  return null;
}

/** Recupero del pulsante manuale: quello del blocco, oppure 60 s. */
export function manualRest(items: FlowItem[], index: number): number {
  return blockRest(items, index) ?? 60;
}

/** Dopo ✓ della riga `setIndex` della voce `index`. */
export function afterCheck(items: FlowItem[], index: number, setIndex: number): CheckAction {
  const [s, e] = blockOf(items, index);
  // stessa serie per una voce successiva del blocco → passa subito a quella
  for (let k = index + 1; k <= e; k++) {
    if (items[k].count > setIndex) return { kind: 'next', to: items[k].id };
  }
  // giro finito: è l'ultima serie della seduta? (ultimo blocco e nessun giro successivo)
  const lastBlock = e === items.length - 1;
  let moreRounds = false;
  for (let k = s; k <= e; k++) if (items[k].count > setIndex + 1) moreRounds = true;
  if (lastBlock && !moreRounds) return { kind: 'none' };
  const sec = blockRest(items, index);
  return sec == null ? { kind: 'none' } : { kind: 'rest', sec };
}
