import "server-only";
import type { QualityArea, QualityCheck } from "@/lib/quality/rules";
import { publicDb } from "@/lib/supabase/public";

export type QualityRun = { run_at: string; summary: Partial<Record<QualityArea, { checked: number; ok: number }>>; checks: QualityCheck[] };

export async function getQualityRuns(limit = 8) {
  const { data, error } = await publicDb().from("quality_runs").select("run_at, summary, checks").order("run_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`controllo qualità: ${error.message}`);
  return (data ?? []) as QualityRun[];
}
