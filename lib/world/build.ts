import type { SupabaseClient } from "@supabase/supabase-js";
import { rankMitigations, type MitigatesLink } from "../attack/mitigations";
import { PROFILES } from "../threats/profiles";
import { aggregateClaims, matchAttack, normName, rankD3fend, techniqueWeights, topMalware, type AttackObject, type WorldClaim } from "./rules";
import type { AttackRef, WorldReportData, WorldSource } from "./types";

// Import relativi (niente alias "@/"): questo modulo è usato dallo script di ingestion.

/** ransomware.live restituisce le ultime 100 rivendicazioni nel mondo (API pubblica, ~1 richiesta al minuto). */
export const RECENT_VICTIMS_URL = "https://api.ransomware.live/v2/recentvictims";
const RECENT_LIMIT = 100;
const WINDOW_HOURS = 24;
const MAX_ACTORS = 20;

type Res<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/** Legge tutte le righe di una query a pagine da 1000 (il limite di PostgREST). */
async function all<T>(query: (from: number, to: number) => Res<T>, what: string, max = 50_000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += 1000) {
    const { data, error } = await query(from, from + 999);
    if (error) throw new Error(`${what}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  return out;
}

const chunks = <T>(xs: T[], n = 150) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

/** Abbinamenti dichiarati nelle schede di /minacce (nome del leak site → oggetto ATT&CK). */
const PROFILE_LINKS = new Map<string, AttackRef>(
  PROFILES.flatMap((p) => {
    const ref: AttackRef | null = p.attack.groups[0]
      ? { kind: "group", external_id: p.attack.groups[0], name: p.name }
      : p.attack.software[0]
        ? { kind: "software", external_id: p.attack.software[0], name: p.name }
        : null;
    return ref ? p.leakNames.map((l) => [normName(l), ref] as const) : [];
  }),
);

async function fetchClaims(): Promise<WorldClaim[]> {
  const res = await fetch(RECENT_VICTIMS_URL, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(90_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { group?: string; country?: string; activity?: string; discovered?: string }[];
  if (!Array.isArray(data)) throw new Error("risposta inattesa");
  return data
    .filter((r) => r.group && r.discovered && !Number.isNaN(Date.parse(r.discovered)))
    .map((r) => ({ group: r.group!, country: r.country || null, activity: r.activity || null, discovered: r.discovered! }));
}

export async function buildWorldReport(db: SupabaseClient, now = new Date()) {
  const end = now;
  const start = new Date(end.getTime() - WINDOW_HOURS * 3600_000);
  const sources: WorldSource[] = [];

  // 1) Rivendicazioni nel mondo: se ransomware.live non risponde il rapporto esce comunque.
  let claimRows: WorldClaim[] = [];
  try {
    claimRows = await fetchClaims();
    sources.push({ id: "ransomware_live", name: "ransomware.live", ok: true });
  } catch (err) {
    sources.push({ id: "ransomware_live", name: "ransomware.live", ok: false, note: err instanceof Error ? err.message : String(err) });
  }
  const claims = aggregateClaims(claimRows, start, end, RECENT_LIMIT);
  if (claims.partial) sources[0].note = `la fonte restituisce solo le ultime ${RECENT_LIMIT} rivendicazioni: le prime ore della finestra possono mancare`;

  // 2) Dati già raccolti: osservazioni IOC (ThreatFox, URLhaus, OTX) e nuove KEV.
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const [observations, kev, groups, software] = await Promise.all([
    all<{ malware: string | null }>(
      (f, t) => db.from("ioc_observations").select("malware").gte("last_seen", start.toISOString()).not("malware", "is", null).order("id").range(f, t),
      "osservazioni IOC",
    ),
    all<{ cve_id: string; vendor_project: string; product: string; vulnerability_name: string; known_ransomware_use: boolean }>(
      (f, t) => db.from("kev_vulnerabilities").select("cve_id, vendor_project, product, vulnerability_name, known_ransomware_use").gte("date_added", day(start)).lte("date_added", day(end)).order("cve_id").range(f, t),
      "KEV",
    ),
    all<AttackObject>((f, t) => db.from("attack_groups").select("id, external_id, name, aliases").eq("revoked", false).eq("deprecated", false).order("id").range(f, t), "gruppi"),
    all<AttackObject>((f, t) => db.from("attack_software").select("id, external_id, name, aliases").eq("revoked", false).eq("deprecated", false).order("id").range(f, t), "software"),
  ]);
  sources.push({ id: "ioc", name: "ThreatFox / URLhaus / OTX", ok: true, note: `${observations.length} segnalazioni nella finestra` });
  sources.push({ id: "cisa_kev", name: "CISA KEV", ok: true });

  // 3) Attori attivi collegati ad ATT&CK: gruppi che rivendicano + famiglie di malware.
  const actors: (WorldReportData["actors"][number] & { id: string })[] = [];
  const seen = new Set<string>();
  const addActor = (label: string, via: "rivendicazione" | "malware", ref: (AttackRef & { id: string }) | null) => {
    if (!ref || seen.has(ref.id) || actors.length >= MAX_ACTORS) return;
    seen.add(ref.id);
    actors.push({ label, via, attack: { kind: ref.kind, external_id: ref.external_id, name: ref.name }, id: ref.id });
  };
  const claimGroups = claims.groups.map((g) => {
    const ref = matchAttack(g.name, groups, software, PROFILE_LINKS);
    addActor(g.name, "rivendicazione", ref);
    return { ...g, attack: ref && { kind: ref.kind, external_id: ref.external_id, name: ref.name } };
  });
  const families = topMalware(observations);
  const familyRefs = families.map((m) => {
    const ref = matchAttack(m.name, [], software, new Map(), { softwareAliases: true });
    addActor(m.name, "malware", ref);
    return { m, ref };
  });

  // 4) Tecniche di ogni attore: gruppo (dirette e via software) o software.
  const groupIds = actors.filter((a) => a.attack.kind === "group").map((a) => a.id);
  const swIds = [...new Set([...actors.filter((a) => a.attack.kind === "software").map((a) => a.id), ...familyRefs.flatMap((f) => (f.ref ? [f.ref.id] : []))])];
  const [groupTech, swTech, swUsers] = await Promise.all([
    Promise.all(chunks(groupIds).map((ids) => all<{ group_id: string; technique_id: string }>((f, t) => db.from("v_group_techniques").select("group_id, technique_id").in("group_id", ids).order("group_id").order("technique_id").range(f, t), "tecniche dei gruppi"))),
    Promise.all(chunks(swIds).map((ids) => all<{ source_ref: string; target_ref: string }>((f, t) => db.from("attack_relationships").select("source_ref, target_ref").in("source_ref", ids).eq("relationship_type", "uses").eq("target_type", "attack-pattern").order("id").range(f, t), "tecniche del software"))),
    Promise.all(chunks(swIds).map((ids) => all<{ group_id: string; software_id: string }>((f, t) => db.from("v_group_software").select("group_id, software_id").in("software_id", ids).order("group_id").range(f, t), "utilizzatori del software"))),
  ]);
  const techOf = new Map<string, Set<string>>();
  for (const r of groupTech.flat()) techOf.set(r.group_id, (techOf.get(r.group_id) ?? new Set()).add(r.technique_id));
  for (const r of swTech.flat()) techOf.set(r.source_ref, (techOf.get(r.source_ref) ?? new Set()).add(r.target_ref));
  const usersOf = new Map<string, Set<string>>();
  for (const r of swUsers.flat()) usersOf.set(r.software_id, (usersOf.get(r.software_id) ?? new Set()).add(r.group_id));

  const weights = techniqueWeights(actors.map((a) => [...(techOf.get(a.id) ?? [])]));
  const techRows = (
    await Promise.all(chunks([...weights.keys()]).map((ids) => all<{ id: string; external_id: string; name: string; tactics: string[] }>((f, t) => db.from("attack_techniques").select("id, external_id, name, tactics").in("id", ids).eq("revoked", false).eq("deprecated", false).order("id").range(f, t), "tecniche")))
  ).flat();
  const validWeights = new Map(techRows.map((t) => [t.id, weights.get(t.id)!]));

  // 5) Difese: mitigazioni ATT&CK e contromisure D3FEND pesate sugli attori che usano ogni tecnica.
  const [mitigations, links, d3All] = await Promise.all([
    all<{ id: string; external_id: string; name: string }>((f, t) => db.from("attack_mitigations").select("id, external_id, name").eq("deprecated", false).order("id").range(f, t), "mitigazioni"),
    all<MitigatesLink>((f, t) => db.from("v_technique_mitigations").select("mitigation_id, technique_id").order("mitigation_id").order("technique_id").range(f, t), "relazioni mitigazioni"),
    all<{ d3fend_id: string }>((f, t) => db.from("d3fend_countermeasures").select("d3fend_id").order("d3fend_id").order("attack_external_id").range(f, t), "D3FEND (totali)"),
  ]);
  const d3Total = new Map<string, number>();
  for (const r of d3All) d3Total.set(r.d3fend_id, (d3Total.get(r.d3fend_id) ?? 0) + 1);
  const byExternal = new Map(techRows.map((t) => [t.external_id, validWeights.get(t.id)!]));
  const d3Rows = (
    await Promise.all(chunks([...byExternal.keys()]).map((ids) => all<{ attack_external_id: string; d3fend_id: string; label: string; tactic: string; iri_name: string }>((f, t) => db.from("d3fend_countermeasures").select("attack_external_id, d3fend_id, label, tactic, iri_name").in("attack_external_id", ids).order("d3fend_id").order("attack_external_id").range(f, t), "D3FEND")))
  ).flat();

  const data: WorldReportData = {
    sources,
    claims: { ...claims, groups: claimGroups },
    malware: familyRefs.map(({ m, ref }) => ({
      ...m,
      attack: ref && { kind: ref.kind, external_id: ref.external_id, name: ref.name },
      usedBy: ref ? (usersOf.get(ref.id)?.size ?? 0) : 0,
    })),
    kev: kev
      .sort((a, b) => Number(b.known_ransomware_use) - Number(a.known_ransomware_use) || a.cve_id.localeCompare(b.cve_id))
      .map((k) => ({ cve_id: k.cve_id, vendor: k.vendor_project, product: k.product, name: k.vulnerability_name, ransomware: k.known_ransomware_use })),
    actors: actors.map((a) => ({ label: a.label, via: a.via, attack: a.attack })),
    techniques: techRows
      .map((t) => ({ external_id: t.external_id, name: t.name, tactics: t.tactics, actors: validWeights.get(t.id)! }))
      .sort((a, b) => b.actors - a.actors || a.external_id.localeCompare(b.external_id))
      .slice(0, 15),
    mitigations: rankMitigations(mitigations, links, validWeights)
      .slice(0, 8)
      .map((r) => ({ external_id: r.mitigation.external_id, name: r.mitigation.name, techniques: r.techniques, score: r.score })),
    d3fend: rankD3fend(d3Rows, byExternal, d3Total),
  };
  return { start, end, data };
}

/** Genera (o rigenera) il rapporto del giorno, con data di Roma. */
export async function generateWorldReport(db: SupabaseClient, now = new Date()) {
  const { start, end, data } = await buildWorldReport(db, now);
  const report_date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(now);
  const { error } = await db.from("world_reports").upsert(
    { report_date, window_start: start.toISOString(), window_end: end.toISOString(), generated_at: now.toISOString(), data },
    { onConflict: "report_date" },
  );
  if (error) throw new Error(`salvataggio rapporto: ${error.message}`);
  return { report_date, claims: data.claims.total, actors: data.actors.length, techniques: data.techniques.length };
}
