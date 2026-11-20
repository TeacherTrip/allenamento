import type { Session } from '../db/models';
import type { Program } from '../program/types';

/** Gruppo dello Storico: le sedute di una scheda (per id), dalla più recente. */
export interface HistoryGroup {
  /** Id della scheda (`Session.day`). */
  id: string;
  label: string;
  /** true = scheda che non c'è più (ricaricata o sostituita). */
  old: boolean;
  sessions: Session[];
}

/** "05/11/2026" (ora locale). */
export function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Raggruppa le sedute per id della scheda. Prima le schede attuali (nel loro ordine, col nome di oggi),
 * poi quelle che non ci sono più, dalla più recente: «Scheda A — fino al gg/mm/aaaa» (data dell'ultima seduta);
 * se due gruppi hanno nome e data uguali: «Scheda A — dal gg/mm/aaaa al gg/mm/aaaa».
 */
export function historyGroups(sessions: Session[], programs: Program[]): HistoryGroup[] {
  const byDay = new Map<string, Session[]>();
  for (const s of [...sessions].sort((a, b) => b.date.localeCompare(a.date))) {
    byDay.set(s.day, [...(byDay.get(s.day) ?? []), s]);
  }
  const active: HistoryGroup[] = [];
  for (const p of [...programs].sort((a, b) => a.order - b.order)) {
    const list = byDay.get(p.id);
    if (list) active.push({ id: p.id, label: `Scheda ${p.name}`, old: false, sessions: list });
  }
  const activeIds = new Set(programs.map((p) => p.id));
  const old = [...byDay.entries()]
    .filter(([id]) => !activeIds.has(id))
    .map(([id, list]) => {
      const name = list[0].programName ?? id; // nome della seduta più recente
      const last = fmtDay(list[0].date);
      const first = fmtDay(list[list.length - 1].date);
      return { id, name, last, first, lastIso: list[0].date, firstIso: list[list.length - 1].date, list };
    })
    .sort((a, b) => b.lastIso.localeCompare(a.lastIso) || b.firstIso.localeCompare(a.firstIso) || a.id.localeCompare(b.id));
  const key = (g: { name: string; last: string }) => `${g.name}\u0000${g.last}`;
  const count = new Map<string, number>();
  for (const g of old) count.set(key(g), (count.get(key(g)) ?? 0) + 1);
  return [
    ...active,
    ...old.map((g) => ({
      id: g.id,
      old: true,
      sessions: g.list,
      label: (count.get(key(g)) ?? 0) > 1 ? `Scheda ${g.name} — dal ${g.first} al ${g.last}` : `Scheda ${g.name} — fino al ${g.last}`,
    })),
  ];
}
