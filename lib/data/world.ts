import "server-only";
import { publicDb } from "@/lib/supabase/public";
import type { WorldReport } from "@/lib/world/types";

const COLUMNS = "report_date, window_start, window_end, generated_at, data";

export async function getWorldReport(date?: string): Promise<WorldReport | null> {
  let q = publicDb().from("world_reports").select(COLUMNS);
  q = date ? q.eq("report_date", date) : q.order("report_date", { ascending: false }).limit(1);
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(`rapporto della notte: ${error.message}`);
  return data as WorldReport | null;
}

/** Archivio: solo date e totali, senza scaricare i rapporti interi. */
export async function listWorldReports(limit = 30) {
  const { data, error } = await publicDb()
    .from("world_reports")
    .select("report_date, claims:data->claims->total, actors:data->actors")
    .order("report_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`archivio rapporti: ${error.message}`);
  return (data ?? []).map((r) => ({
    report_date: r.report_date as string,
    claims: Number(r.claims ?? 0),
    actors: Array.isArray(r.actors) ? r.actors.length : 0,
  }));
}
