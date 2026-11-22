import "server-only";
import { suggestSoftware, suggestTechniques, type SoftwareRef, type TechniqueRef } from "@/lib/attack/technique-hints";
import { extractIocs } from "@/lib/ioc/extract";
import { publicDb } from "@/lib/supabase/public";
import { MAX_INPUT_CHARS, MAX_IOCS, type AnalysisResult, type GroupLink, type IocFinding } from "./types";

type LookupRow = {
  type: IocFinding["type"];
  value: string;
  ioc_id: number | null;
  first_seen: string | null;
  last_seen: string | null;
  sources: string[];
  malware: string[];
  software: { external_id: string; name: string }[];
  groups: GroupLink[];
};

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if ((data ?? []).length < 1000) return out;
  }
}

/**
 * Analizza testo libero: estrae IOC, li confronta con il DB (nuovo / già visto / collegato
 * a un attore), controlla le CVE nel catalogo KEV e suggerisce tecniche e software ATT&CK.
 * Legge solo dati pubblici (RLS anon): non scrive nulla.
 */
export async function analyzeText(raw: string): Promise<AnalysisResult> {
  const text = raw.slice(0, MAX_INPUT_CHARS);
  const db = publicDb();
  const extracted = extractIocs(text);
  const iocs = extracted.slice(0, MAX_IOCS);

  const [lookup, techniques, software] = await Promise.all([
    iocs.length
      ? db.rpc("lookup_iocs", { p_items: iocs.map(({ type, value }) => ({ type, value })) })
      : Promise.resolve({ data: [] as LookupRow[], error: null }),
    fetchAll<TechniqueRef>((a, b) =>
      db.from("attack_techniques").select("id, external_id, name").eq("revoked", false).eq("deprecated", false).order("external_id").range(a, b),
    ),
    fetchAll<SoftwareRef>((a, b) =>
      db.from("attack_software").select("id, external_id, name, aliases").eq("revoked", false).eq("deprecated", false).order("external_id").range(a, b),
    ),
  ]);
  if (lookup.error) throw new Error(`lookup IOC: ${lookup.error.message}`);

  const cves = iocs.filter((i) => i.type === "cve").map((i) => i.value);
  const kevRes = cves.length
    ? await db.from("kev_vulnerabilities").select("cve_id, date_added, vulnerability_name, known_ransomware_use").in("cve_id", cves)
    : { data: [], error: null };
  if (kevRes.error) throw new Error(`KEV: ${kevRes.error.message}`);
  const kev = new Map((kevRes.data ?? []).map((k) => [k.cve_id, k]));

  const rows = new Map((lookup.data as LookupRow[]).map((r) => [`${r.type}|${r.value}`, r]));
  const findings: IocFinding[] = iocs.map((i) => {
    const r = rows.get(`${i.type}|${i.value}`);
    const k = i.type === "cve" ? kev.get(i.value) : undefined;
    const seen = !!r?.ioc_id || !!k;
    const linked = (r?.groups.length ?? 0) > 0 || (r?.software.length ?? 0) > 0;
    return {
      type: i.type,
      value: i.value,
      status: linked ? "collegato" : seen ? "visto" : "nuovo",
      first_seen: r?.first_seen ?? null,
      last_seen: r?.last_seen ?? null,
      sources: r?.sources ?? [],
      malware: r?.malware ?? [],
      software: r?.software ?? [],
      groups: r?.groups ?? [],
      kev: k ? { date_added: k.date_added, vulnerability_name: k.vulnerability_name, known_ransomware_use: k.known_ransomware_use } : null,
    };
  });

  const softwareHits = suggestSoftware(text, software);
  const groupsBySoftware = new Map<string, { external_id: string; name: string }[]>();
  if (softwareHits.length) {
    const ids = softwareHits.map((s) => s.software.id);
    const { data: links } = await db.from("v_group_software").select("group_id, software_id").in("software_id", ids);
    const groupIds = [...new Set((links ?? []).map((l) => l.group_id as string))];
    const { data: groups } = groupIds.length
      ? await db.from("attack_groups").select("id, external_id, name").in("id", groupIds)
      : { data: [] };
    const gById = new Map((groups ?? []).map((g) => [g.id, g]));
    for (const l of links ?? []) {
      const g = gById.get(l.group_id as string);
      if (!g) continue;
      const list = groupsBySoftware.get(l.software_id as string) ?? [];
      list.push({ external_id: g.external_id, name: g.name });
      groupsBySoftware.set(l.software_id as string, list);
    }
  }

  return {
    analyzedAt: new Date().toISOString(),
    truncated: extracted.length > MAX_IOCS || raw.length > MAX_INPUT_CHARS,
    iocs: findings,
    techniques: suggestTechniques(text, techniques).map((h) => ({
      external_id: h.technique.external_id,
      name: h.technique.name,
      method: h.method,
      evidence: h.evidence,
      ...(h.sameName ? { sameName: h.sameName } : {}),
    })),
    software: softwareHits.map((s) => ({
      external_id: s.software.external_id,
      name: s.software.name,
      evidence: s.evidence,
      groups: (groupsBySoftware.get(s.software.id) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    })),
  };
}
