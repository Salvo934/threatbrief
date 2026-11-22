import "server-only";
import { rankMitigations, type MitigatesLink, type MitigationRef, type RankedMitigation } from "@/lib/attack/mitigations";
import { publicDb } from "@/lib/supabase/public";

export type Mitigation = MitigationRef & { description: string | null; url: string | null };

function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

export async function getMitigations(): Promise<Mitigation[]> {
  const res = await publicDb()
    .from("attack_mitigations")
    .select("id, external_id, name, description, url")
    .eq("deprecated", false)
    .order("external_id");
  return check(res, "mitigazioni");
}

/** Tutte le relazioni "mitigates" (mitigazione → tecnica), lette a pagine. */
export async function getMitigatesLinks(): Promise<MitigatesLink[]> {
  const db = publicDb();
  const out: MitigatesLink[] = [];
  for (let from = 0; ; from += 1000) {
    const res = await db
      .from("v_technique_mitigations")
      .select("mitigation_id, technique_id")
      .order("mitigation_id")
      .order("technique_id")
      .range(from, from + 999);
    const rows = check(res, "relazioni mitigazioni") as MitigatesLink[];
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

export async function getMitigationByExternalId(externalId: string): Promise<Mitigation | null> {
  const res = await publicDb()
    .from("attack_mitigations")
    .select("id, external_id, name, description, url")
    .eq("external_id", externalId.toUpperCase())
    .eq("deprecated", false)
    .maybeSingle();
  return check(res, "mitigazione");
}

/** Tecniche mitigate, con la guida specifica di ATT&CK per ognuna. */
export async function getMitigatedTechniques(mitigationId: string) {
  const db = publicDb();
  const links = check(
    await db.from("v_technique_mitigations").select("technique_id, description").eq("mitigation_id", mitigationId),
    "tecniche mitigate",
  ) as { technique_id: string; description: string | null }[];
  if (!links.length) return [];
  const techs = check(
    await db
      .from("attack_techniques")
      .select("id, external_id, name")
      .in("id", links.map((l) => l.technique_id))
      .eq("revoked", false)
      .eq("deprecated", false),
    "tecniche",
  ) as { id: string; external_id: string; name: string }[];
  const guide = new Map(links.map((l) => [l.technique_id, l.description]));
  return techs
    .map((t) => ({ ...t, guidance: guide.get(t.id) ?? null }))
    .sort((a, b) => a.external_id.localeCompare(b.external_id));
}

/** Mitigazioni prioritarie per un insieme di tecniche pesate (STIX id → peso). */
export async function rankForTechniques(weights: Map<string, number>): Promise<RankedMitigation[]> {
  const [mitigations, links] = await Promise.all([getMitigations(), getMitigatesLinks()]);
  return rankMitigations(mitigations, links, weights);
}
