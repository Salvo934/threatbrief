/**
 * Triage di una lista: estrazione degli indicatori e raggruppamento in possibili campagne.
 * Il raggruppamento è calcolato dal CODICE su dati condivisi (stesso IP, name server, marchio
 * imitato, registrar e giorno, famiglia di malware); l'IA in seguito descrive soltanto i gruppi.
 */
import { classify, type Indicator } from "@/supabase/functions/osint/rules";
import type { OsintLookup } from "./export";

export const MAX_BATCH = 50;

/** Indicatori distinti da un testo libero (righe, virgole, spazi; anche «defanged»). */
export function extractIndicators(text: string, max = MAX_BATCH): Indicator[] {
  const seen = new Set<string>();
  const out: Indicator[] = [];
  for (const raw of text.split(/[\s,;|<>"'()]+/)) {
    const token = raw.replace(/[.,:;!?]+$/, ""); // punteggiatura della frase, non dell'indicatore
    const ind = token ? classify(token) : null;
    if (!ind || seen.has(`${ind.kind}|${ind.value}`)) continue;
    seen.add(`${ind.kind}|${ind.value}`);
    out.push(ind);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Infrastrutture di massa: condividerle non lega due domini alla stessa campagna
 * (milioni di siti usano gli stessi name server o CDN).
 */
const MASS_NS = /(cloudflare\.com|awsdns|azure-dns|googledomains\.com|google\.com|domaincontrol\.com|registrar-servers\.com|nsone\.net|akam\.net|akamai|ultradns|dnsimple|digitalocean\.com|hostinger|wixdns|squarespacedns|vercel-dns|netlify)$/i;

type Res = {
  hostingIp?: string;
  dns?: { A?: string[] };
  rdap?: { nameservers?: string[]; registrar?: string; registered?: string } | null;
  hosting?: { tags?: string[] } | null;
  lookalikeOf?: string | null;
  known?: { malware: string[] }[];
};

/** Caratteristiche che possono legare due indicatori, con l'etichetta leggibile. */
export function features(l: OsintLookup): Map<string, string> {
  const r = l.result as Res;
  const f = new Map<string, string>();
  const cdn = (r.hosting?.tags ?? []).some((t) => /cdn|cloud ?flare/i.test(t));
  if (!cdn) for (const ip of new Set([...(r.dns?.A ?? []), ...(r.hostingIp ? [r.hostingIp] : [])])) f.set(`ip:${ip}`, `stesso IP ${ip}`);
  const ns = (r.rdap?.nameservers ?? []).filter((n) => !MASS_NS.test(n)).sort();
  if (ns.length) f.set(`ns:${ns.join(",")}`, `stessi name server (${ns.join(", ")})`);
  if (r.lookalikeOf) f.set(`brand:${r.lookalikeOf}`, `imitano il marchio «${r.lookalikeOf}»`);
  if (r.rdap?.registrar && r.rdap.registered) {
    const day = r.rdap.registered.slice(0, 10);
    f.set(`reg:${r.rdap.registrar}|${day}`, `registrati lo stesso giorno (${day}) presso ${r.rdap.registrar}`);
  }
  for (const k of r.known ?? []) for (const m of k.malware) f.set(`malware:${m.toLowerCase()}`, `stessa famiglia di malware (${m})`);
  return f;
}

export type Cluster = { id: string; members: string[]; reasons: string[] };

/** Gruppi di almeno 2 indicatori collegati da caratteristiche condivise (unione transitiva). */
export function clusterLookups(lookups: OsintLookup[]): Cluster[] {
  const parent = lookups.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const byFeature = new Map<string, { label: string; idx: number[] }>();
  lookups.forEach((l, i) => {
    for (const [key, label] of features(l)) {
      const e = byFeature.get(key) ?? { label, idx: [] };
      e.idx.push(i);
      byFeature.set(key, e);
    }
  });
  for (const { idx } of byFeature.values()) for (const j of idx.slice(1)) parent[find(j)] = find(idx[0]);

  const groups = new Map<number, number[]>();
  lookups.forEach((_, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), i]));
  const clusters = [...groups.values()]
    .filter((g) => g.length >= 2)
    .sort((a, b) => b.length - a.length)
    .map((g) => {
      const set = new Set(g);
      const reasons = [...byFeature.values()]
        .map((e) => ({ label: e.label, n: e.idx.filter((i) => set.has(i)).length }))
        .filter((e) => e.n >= 2)
        .sort((a, b) => b.n - a.n)
        .map((e) => `${e.label}: ${e.n} indicatori`);
      return { members: g.map((i) => lookups[i].query), reasons };
    });
  return clusters.map((c, i) => ({ id: String.fromCharCode(65 + (i % 26)) + (i >= 26 ? String(Math.floor(i / 26)) : ""), ...c }));
}
