import "server-only";
import { publicDb } from "@/lib/supabase/public";
import type { Kev, SourceStatus } from "@/lib/db/types";

const KEV_COLUMNS = "cve_id, vendor_project, product, vulnerability_name, date_added, due_date, known_ransomware_use";

export async function getKevSince(isoDate: string): Promise<Kev[]> {
  const res = await publicDb()
    .from("kev_vulnerabilities")
    .select(KEV_COLUMNS)
    .gte("date_added", isoDate)
    .order("date_added", { ascending: false })
    .order("cve_id", { ascending: false })
    .limit(1000);
  if (res.error) throw new Error(`KEV: ${res.error.message}`);
  return res.data;
}

async function count(table: string): Promise<number> {
  const res = await publicDb().from(table).select("*", { count: "exact", head: true });
  if (res.error) throw new Error(`conteggio ${table}: ${res.error.message}`);
  return res.count ?? 0;
}

export async function getCatalogCounts() {
  const [groups, kev, iocs] = await Promise.all([count("v_group_summary"), count("kev_vulnerabilities"), count("iocs")]);
  const techniques = await publicDb()
    .from("attack_techniques")
    .select("*", { count: "exact", head: true })
    .eq("revoked", false)
    .eq("deprecated", false)
    .eq("is_subtechnique", false);
  if (techniques.error) throw new Error(`conteggio tecniche: ${techniques.error.message}`);
  return { groups, kev, iocs, techniques: techniques.count ?? 0 };
}

export async function getSourceStatuses(): Promise<SourceStatus[]> {
  const res = await publicDb()
    .from("sources")
    .select("id, name, homepage_url, last_run_at, last_success_at, last_status, last_error, last_record_count, last_version")
    .order("name");
  if (res.error) throw new Error(`fonti: ${res.error.message}`);
  return res.data;
}
