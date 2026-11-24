import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchCisaAdvisories } from "../../lib/defense/cisa-feed";
import { defenseReasons, extractCves, extractTechniques, findActors, type GroupRef } from "../../lib/defense/rules";
import { upsertInBatches } from "../lib/db";
import type { SourceResult } from "../lib/run";

export { CISA_ADVISORIES_URL, parseCisaRss } from "../../lib/defense/cisa-feed";

export async function ingestCisaAdvisories(db: SupabaseClient): Promise<SourceResult> {
  const advisories = await fetchCisaAdvisories();

  const rows = advisories.map((a) => ({
    source_id: "cisa_advisories",
    external_id: a.external_id,
    title: a.title,
    summary: a.text.slice(0, 2000),
    url: a.url,
    published_at: a.published_at,
    tlp: "CLEAR" as const,
    tags: [] as string[],
    adversary: null,
    attack_ids: extractTechniques(a.text),
    cves: extractCves(a.text),
  }));
  const upserted = await upsertInBatches(db, "intel_items", rows, "source_id,external_id");

  // Rilevamento: avvisi che riguardano difesa e aerospazio, con i motivi e gli attori citati.
  const { data: groups, error: gErr } = await db.from("attack_groups").select("id, external_id, name, aliases").eq("revoked", false).eq("deprecated", false);
  if (gErr) throw new Error(`gruppi ATT&CK: ${gErr.message}`);
  const { data: ids, error: iErr } = await db.from("intel_items").select("id, external_id").eq("source_id", "cisa_advisories").in("external_id", advisories.map((a) => a.external_id));
  if (iErr) throw new Error(`avvisi salvati: ${iErr.message}`);
  const idOf = new Map((ids ?? []).map((r) => [r.external_id as string, r.id as number]));

  const alerts = advisories.flatMap((a) => {
    const reasons = defenseReasons(a.text, a.title);
    const intel_item_id = idOf.get(a.external_id);
    if (!reasons.length || !intel_item_id) return [];
    return [{
      intel_item_id,
      reasons: reasons.map((r) => `${r.label} — «${r.evidence}»`),
      actors: findActors(a.text, (groups ?? []) as GroupRef[]).map(({ external_id, name, alias }) => ({ external_id, name, alias })),
      technique_ids: extractTechniques(a.text),
      cves: extractCves(a.text),
    }];
  });
  if (alerts.length) {
    // report_id non è tra le colonne: un report già creato resta collegato.
    const { error } = await db.from("defense_alerts").upsert(alerts, { onConflict: "intel_item_id" });
    if (error) throw new Error(`avvisi difesa: ${error.message}`);
  }
  console.log(`  ${alerts.length} avvisi rilevanti per difesa e aerospazio`);
  return { fetched: advisories.length, upserted };
}
