import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeError } from "./http";

/** Fonte saltata di proposito (es. chiave API non configurata): non è un errore della fonte. */
export class SkipSource extends Error {}

export type SourceResult = {
  fetched: number;
  upserted: number;
  version?: string;
  /** Dati importati ma incompleti (es. risposta troncata dalla fonte): run "partial". */
  warning?: string;
};

/**
 * Esegue una fonte in isolamento: registra la run in ingestion_runs, aggiorna lo stato
 * in sources e non propaga mai l'errore (le altre fonti continuano). Restituisce true se ok.
 */
export async function runSource(
  db: SupabaseClient,
  sourceId: string,
  job: () => Promise<SourceResult>,
): Promise<boolean> {
  const startedAt = new Date().toISOString();
  const { data: run, error: runErr } = await db
    .from("ingestion_runs")
    .insert({ source_id: sourceId, started_at: startedAt, status: "running" })
    .select("id")
    .single();
  if (runErr) throw new Error(`ingestion_runs insert: ${runErr.message}`);

  try {
    const result = await job();
    const finishedAt = new Date().toISOString();
    const status = result.warning ? "partial" : "ok";
    await db
      .from("ingestion_runs")
      .update({
        finished_at: finishedAt,
        status,
        records_fetched: result.fetched,
        records_upserted: result.upserted,
        error: result.warning ?? null,
      })
      .eq("id", run.id);
    await db
      .from("sources")
      .update({
        last_run_at: finishedAt,
        last_success_at: finishedAt,
        last_status: status,
        last_error: result.warning ?? null,
        last_record_count: result.fetched,
        ...(result.version ? { last_version: result.version } : {}),
      })
      .eq("id", sourceId);
    console.log(
      `${result.warning ? "◐" : "✔"} ${sourceId}: ${result.fetched} letti, ${result.upserted} scritti` +
        `${result.version ? ` (v${result.version})` : ""}${result.warning ? ` — ${result.warning}` : ""}`,
    );
    return true;
  } catch (err) {
    const message = sanitizeError(err);
    const finishedAt = new Date().toISOString();
    if (err instanceof SkipSource) {
      await db
        .from("ingestion_runs")
        .update({ finished_at: finishedAt, status: "skipped", error: message })
        .eq("id", run.id);
      await db
        .from("sources")
        .update({ last_run_at: finishedAt, last_status: "skipped", last_error: message })
        .eq("id", sourceId);
      console.warn(`– ${sourceId}: saltata (${message})`);
      return true;
    }
    await db
      .from("ingestion_runs")
      .update({ finished_at: finishedAt, status: "error", error: message })
      .eq("id", run.id);
    await db
      .from("sources")
      .update({ last_run_at: finishedAt, last_status: "error", last_error: message })
      .eq("id", sourceId);
    console.error(`✘ ${sourceId}: ${message}`);
    return false;
  }
}
