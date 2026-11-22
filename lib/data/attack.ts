import "server-only";
import { publicDb } from "@/lib/supabase/public";
import type { Flags, Usage } from "@/lib/attack/matrix";
import type { ActorAttribute, Group, GroupSummary, Software, Tactic, TechniqueLite } from "@/lib/db/types";

function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

export async function getTactics(): Promise<Tactic[]> {
  const res = await publicDb()
    .from("attack_tactics")
    .select("id, external_id, shortname, name, sort_order, url")
    .order("sort_order");
  return check(res, "tattiche");
}

/** Tecniche attive (padri + sotto-tecniche), lette a pagine: sono più di 1000 con le revocate. */
export async function getActiveTechniques(): Promise<TechniqueLite[]> {
  const db = publicDb();
  const out: TechniqueLite[] = [];
  for (let from = 0; ; from += 1000) {
    const res = await db
      .from("attack_techniques")
      .select("id, external_id, name, is_subtechnique, parent_external_id, tactics")
      .eq("revoked", false)
      .eq("deprecated", false)
      .order("external_id")
      .range(from, from + 999);
    const rows = check(res, "tecniche") as TechniqueLite[];
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

const SAFE_QUERY = /[^\p{L}\p{N} ._-]/gu;

export async function listGroups(filter: { q?: string; sector?: string }): Promise<GroupSummary[]> {
  let query = publicDb()
    .from("v_group_summary")
    .select("id, external_id, name, aliases, modified_at, technique_count, software_count, sectors, countries, motivations")
    .order("name");
  const q = filter.q?.replace(SAFE_QUERY, "").trim();
  if (q) query = query.or(`name.ilike.%${q}%,aliases_text.ilike.%${q}%,external_id.ilike.%${q}%`);
  if (filter.sector) query = query.contains("sectors", [filter.sector]);
  return check(await query, "attori");
}

export async function getGroupOptions(): Promise<Pick<GroupSummary, "external_id" | "name">[]> {
  const res = await publicDb().from("v_group_summary").select("external_id, name").order("name");
  return check(res, "elenco attori");
}

export async function getGroupByExternalId(externalId: string): Promise<Group | null> {
  const res = await publicDb()
    .from("attack_groups")
    .select("id, external_id, name, aliases, description, url, modified_at")
    .eq("external_id", externalId.toUpperCase())
    .eq("revoked", false)
    .maybeSingle();
  return check(res, "attore");
}

export async function getGroupAttributes(groupId: string): Promise<ActorAttribute[]> {
  const res = await publicDb()
    .from("actor_attributes")
    .select("attribute, value, method, evidence, source_url, confidence, is_example")
    .eq("group_id", groupId)
    .order("attribute")
    .order("value");
  return check(res, "attributi attore");
}

/** Uso delle tecniche da parte di un gruppo, indicizzato per STIX id della tecnica. */
export async function getGroupUsage(groupId: string): Promise<Map<string, Usage>> {
  const res = await publicDb().from("v_group_techniques").select("technique_id, via").eq("group_id", groupId);
  const rows = check(res, "tecniche attore") as { technique_id: string; via: string }[];
  const usage = new Map<string, Usage>();
  for (const r of rows) {
    if (r.via === "diretta" || !usage.has(r.technique_id)) {
      usage.set(r.technique_id, r.via === "diretta" ? "diretta" : "software");
    }
  }
  return usage;
}

/** Converte l'uso (per STIX id) in Flags per external_id, come vuole buildMatrix. */
export function toFlags(
  techniques: TechniqueLite[],
  a: Map<string, Usage>,
  b?: Map<string, Usage>,
): Map<string, Flags> {
  const out = new Map<string, Flags>();
  for (const t of techniques) {
    const fa = a.get(t.id);
    const fb = b?.get(t.id);
    if (fa || fb) out.set(t.external_id, { a: fa, b: fb });
  }
  return out;
}

export type Procedure = { technique: TechniqueLite; description: string | null };

/** Procedure documentate da ATT&CK: come il gruppo ha usato ogni tecnica (solo uso diretto). */
export async function getGroupProcedures(groupId: string, techniques: TechniqueLite[]): Promise<Procedure[]> {
  const res = await publicDb()
    .from("attack_relationships")
    .select("target_ref, description")
    .eq("source_ref", groupId)
    .eq("relationship_type", "uses")
    .eq("target_type", "attack-pattern");
  const rows = check(res, "procedure") as { target_ref: string; description: string | null }[];
  const byId = new Map(techniques.map((t) => [t.id, t]));
  return rows
    .filter((r) => byId.has(r.target_ref))
    .map((r) => ({ technique: byId.get(r.target_ref)!, description: r.description }))
    .sort((x, y) => x.technique.external_id.localeCompare(y.technique.external_id));
}

export async function getGroupSoftware(groupId: string): Promise<Software[]> {
  const db = publicDb();
  const links = check(
    await db.from("v_group_software").select("software_id").eq("group_id", groupId),
    "software attore",
  ) as { software_id: string }[];
  if (links.length === 0) return [];
  const res = await db
    .from("attack_software")
    .select("id, external_id, name, type, url")
    .in("id", links.map((l) => l.software_id))
    .order("name");
  return check(res, "software");
}
