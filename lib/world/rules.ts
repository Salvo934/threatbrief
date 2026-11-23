/**
 * Regole pure del Rapporto della notte (testabili senza DB). Import relativi: il modulo
 * è usato anche dallo script di ingestion.
 */
import type { AttackRef } from "./types";

export type WorldClaim = { group: string; country: string | null; activity: string | null; discovered: string };
export type AttackObject = { id: string; external_id: string; name: string; aliases: string[] };

/** Confronto tollerante tra nomi: «LockBit 3.0», «lockbit3», «Lock-Bit 3» → «lockbit3». */
export const normName = (s: string) => s.toLowerCase().replace(/ransomware|team|group|gang/g, "").replace(/[^a-z0-9]/g, "");

const top = <K>(m: Map<K, number>, n: number) => [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0, n);

/**
 * Rivendicazioni nella finestra, aggregate per gruppo, paese e settore. Nessun nome di vittima.
 * `partial` quando la fonte restituisce solo le ultime N e la più vecchia è già dentro la finestra.
 */
export function aggregateClaims(rows: WorldClaim[], start: Date, end: Date, sourceLimit: number) {
  const inWindow = rows.filter((r) => {
    const t = Date.parse(r.discovered);
    return t >= start.getTime() && t <= end.getTime();
  });
  const oldest = Math.min(...rows.map((r) => Date.parse(r.discovered)));
  const groups = new Map<string, number>();
  const groupCountries = new Map<string, Set<string>>();
  const countries = new Map<string, number>();
  const sectors = new Map<string, number>();
  for (const r of inWindow) {
    const g = r.group.trim().toLowerCase();
    groups.set(g, (groups.get(g) ?? 0) + 1);
    const c = r.country?.trim().toUpperCase();
    if (c && /^[A-Z]{2}$/.test(c)) {
      countries.set(c, (countries.get(c) ?? 0) + 1);
      groupCountries.set(g, (groupCountries.get(g) ?? new Set()).add(c));
    }
    const s = r.activity?.trim() || "Not Found";
    sectors.set(s, (sectors.get(s) ?? 0) + 1);
  }
  return {
    total: inWindow.length,
    partial: rows.length >= sourceLimit && oldest > start.getTime(),
    groups: top(groups, 10).map(([name, count]) => ({ name, count, countries: [...(groupCountries.get(name) ?? [])].sort() })),
    countries: top(countries, 10).map(([code, count]) => ({ code, count })),
    sectors: top(sectors, 8).map(([label, count]) => ({ label, count })),
  };
}

/** Famiglie di malware più segnalate (una segnalazione = un'osservazione di un IOC). */
export function topMalware(observations: { malware: string | null }[], n = 10) {
  const m = new Map<string, number>();
  for (const o of observations) {
    const name = o.malware?.trim();
    if (!name || /^unknown/i.test(name)) continue;
    m.set(name, (m.get(name) ?? 0) + 1);
  }
  return top(m, n).map(([name, count]) => ({ name, count }));
}

/**
 * Collega un nome (gruppo da leak site o famiglia di malware) a un oggetto ATT&CK, per nome
 * o alias. Prima i nomi esatti normalizzati; `extra` sono abbinamenti dichiarati a mano
 * (es. le schede di /minacce: leak site «qilin» → software S1242).
 */
export function matchAttack(
  name: string,
  groups: AttackObject[],
  software: AttackObject[],
  extra: Map<string, AttackRef> = new Map(),
  opts: { softwareAliases?: boolean } = {},
): (AttackRef & { id: string }) | null {
  const key = normName(name);
  if (!key) return null;
  const known = extra.get(key);
  if (known) {
    const pool = known.kind === "group" ? groups : software;
    const o = pool.find((x) => x.external_id === known.external_id);
    if (o) return { kind: known.kind, external_id: o.external_id, name: o.name, id: o.id };
  }
  const hit = (o: AttackObject) => [o.name, ...o.aliases].some((a) => normName(a) === key);
  const g = groups.find(hit);
  if (g) return { kind: "group", external_id: g.external_id, name: g.name, id: g.id };
  // Software: con gli alias solo se richiesto. Per i nomi dei leak site gli alias del software
  // portano a falsi abbinamenti (il gruppo «aurora» non è Hydraq, alias «Aurora», del 2010).
  const s = software.find(opts.softwareAliases ? hit : (o) => normName(o.name) === key);
  if (s) return { kind: "software", external_id: s.external_id, name: s.name, id: s.id };
  return null;
}

/** Peso di ogni tecnica = quanti attori attivi la usano (ogni attore conta una volta). */
export function techniqueWeights(actorTechniques: string[][]) {
  const w = new Map<string, number>();
  for (const techs of actorTechniques) for (const t of new Set(techs)) w.set(t, (w.get(t) ?? 0) + 1);
  return w;
}

/**
 * Contromisure D3FEND per le tecniche degli attori attivi. Molte contromisure generiche (es. sui file)
 * sono collegate a centinaia di tecniche: per non metterle sempre in cima il punteggio è il peso
 * coperto × pertinenza (tecniche coperte qui / tecniche coperte in tutto D3FEND), e le contromisure
 * con lo stesso insieme di tecniche diventano una sola voce.
 */
export function rankD3fend(
  rows: { attack_external_id: string; d3fend_id: string; label: string; tactic: string; iri_name: string }[],
  weightByExternal: Map<string, number>,
  totalByMeasure: Map<string, number>,
  n = 10,
) {
  const acc = new Map<string, { id: string; label: string; tactic: string; iri: string; techniques: Set<string>; weight: number }>();
  for (const r of rows) {
    const w = weightByExternal.get(r.attack_external_id);
    if (!w) continue;
    const m = acc.get(r.d3fend_id) ?? { id: r.d3fend_id, label: r.label, tactic: r.tactic, iri: r.iri_name, techniques: new Set(), weight: 0 };
    if (!m.techniques.has(r.attack_external_id)) {
      m.techniques.add(r.attack_external_id);
      m.weight += w;
    }
    acc.set(r.d3fend_id, m);
  }
  // Contromisure che coprono esattamente le stesse tecniche sono equivalenti qui: una voce sola.
  const merged = new Map<string, { measures: { id: string; label: string; tactic: string; iri: string }[]; techniques: number; weight: number; total: number }>();
  for (const m of acc.values()) {
    if (m.techniques.size < 2) continue;
    const key = [...m.techniques].sort().join(",");
    const total = Math.max(totalByMeasure.get(m.id) ?? m.techniques.size, m.techniques.size);
    const e = merged.get(key) ?? { measures: [], techniques: m.techniques.size, weight: m.weight, total: 0 };
    e.measures.push({ id: m.id, label: m.label, tactic: m.tactic, iri: m.iri });
    e.total = Math.max(e.total, total);
    merged.set(key, e);
  }
  const score = (e: { techniques: number; weight: number; total: number }) => (e.weight * e.techniques) / e.total;
  return [...merged.values()]
    .map((e) => ({ ...e, measures: e.measures.sort((a, b) => a.label.localeCompare(b.label)) }))
    .sort((a, b) => score(b) - score(a) || a.measures[0].label.localeCompare(b.measures[0].label))
    .slice(0, n)
    .map(({ measures, techniques, total }) => ({ measures, techniques, total }));
}
