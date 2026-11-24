import "server-only";
import { publicDb } from "@/lib/supabase/public";

export type DefenseAlert = {
  id: string;
  reasons: { label: string; evidence: string }[];
  actors: { external_id: string; name: string; alias: string }[];
  techniques: number;
  cves: { id: string; kev: boolean }[];
  detected_at: string;
  advisory: { title: string; url: string; published_at: string };
  /** slug del report, solo se pubblicato (la RLS nasconde le bozze) */
  reportSlug: string | null;
};

type Row = {
  id: string; reasons: string[]; actors: DefenseAlert["actors"]; technique_ids: string[]; cves: string[]; detected_at: string;
  intel_items: { title: string; url: string; published_at: string } | null;
  reports: { slug: string; status: string } | null;
};

export async function getDefenseAlerts(limit = 30): Promise<DefenseAlert[]> {
  const db = publicDb();
  const { data, error } = await db
    .from("defense_alerts")
    .select("id, reasons, actors, technique_ids, cves, detected_at, intel_items(title, url, published_at), reports(slug, status)")
    .order("detected_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`avvisi difesa: ${error.message}`);
  const rows = (data ?? []) as unknown as Row[];
  const allCves = [...new Set(rows.flatMap((r) => r.cves))];
  const kev = new Set<string>();
  if (allCves.length) {
    const { data: k, error: kErr } = await db.from("kev_vulnerabilities").select("cve_id").in("cve_id", allCves);
    if (kErr) throw new Error(`KEV: ${kErr.message}`);
    for (const r of k ?? []) kev.add(r.cve_id);
  }
  return rows
    .filter((r) => r.intel_items)
    .map((r) => ({
      id: r.id,
      reasons: r.reasons.map((s) => {
        const [label, ...rest] = s.split(" — ");
        return { label, evidence: rest.join(" — ").replace(/^«|»$/g, "") };
      }),
      actors: r.actors,
      techniques: r.technique_ids.length,
      cves: r.cves.map((id) => ({ id, kev: kev.has(id) })),
      detected_at: r.detected_at,
      advisory: r.intel_items!,
      reportSlug: r.reports?.status === "published" ? r.reports.slug : null,
    }))
    .sort((a, b) => b.advisory.published_at.localeCompare(a.advisory.published_at));
}
