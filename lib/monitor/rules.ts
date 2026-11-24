/** Monitoraggio: aggregazioni pure sugli eventi (usate sia dal server sia dalla mappa nel browser). */

export type MonitorEvent = {
  id: string;
  group: string;
  country: string | null;
  sector: string | null;
  at: string; // ISO
};

export type GroupLink = { href: string; label: string } | null;

export const WINDOWS = [
  { hours: 24, label: "24 ore" },
  { hours: 72, label: "3 giorni" },
  { hours: 168, label: "7 giorni" },
] as const;

/** «Recente»: lampeggia sulla mappa. */
export const RECENT_HOURS = 6;

export function inWindow(events: MonitorEvent[], hours: number, now: number, group?: string | null) {
  const since = now - hours * 3600_000;
  return events.filter((e) => Date.parse(e.at) >= since && Date.parse(e.at) <= now && (!group || e.group === group));
}

export type CountryStat = { code: string; count: number; recent: number; lastAt: string; groups: [string, number][] };

export function byCountry(events: MonitorEvent[], now: number): CountryStat[] {
  const m = new Map<string, { count: number; recent: number; lastAt: string; groups: Map<string, number> }>();
  for (const e of events) {
    if (!e.country) continue;
    const s = m.get(e.country) ?? { count: 0, recent: 0, lastAt: e.at, groups: new Map() };
    s.count++;
    if (now - Date.parse(e.at) <= RECENT_HOURS * 3600_000) s.recent++;
    if (e.at > s.lastAt) s.lastAt = e.at;
    s.groups.set(e.group, (s.groups.get(e.group) ?? 0) + 1);
    m.set(e.country, s);
  }
  return [...m.entries()]
    .map(([code, s]) => ({ code, count: s.count, recent: s.recent, lastAt: s.lastAt, groups: [...s.groups.entries()].sort((a, b) => b[1] - a[1]) }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

export function topGroups(events: MonitorEvent[], n = 8) {
  const m = new Map<string, number>();
  for (const e of events) m.set(e.group, (m.get(e.group) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
}

/** Bandiera emoji da codice ISO alpha-2 (indicatori regionali Unicode). */
export const flag = (code: string | null) =>
  code && /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : "🏳️";
