import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client con chiave segreta (bypassa la RLS). Usato SOLO dagli script di ingestion
 * che girano su GitHub Actions o in locale: non viene mai importato dall'app.
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Variabili mancanti: SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) e SUPABASE_SECRET_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function upsertInBatches<T extends object>(
  db: SupabaseClient,
  table: string,
  rows: T[],
  onConflict: string,
  batchSize = 500,
): Promise<number> {
  for (let i = 0; i < rows.length; i += batchSize) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + batchSize), { onConflict });
    if (error) throw new Error(`upsert ${table}: ${error.message}`);
  }
  return rows.length;
}

/** Legge tutti i valori di una colonna, a pagine (PostgREST restituisce max 1000 righe). */
export async function fetchAllValues(
  db: SupabaseClient,
  table: string,
  column = "id",
  pageSize = 1000,
): Promise<string[]> {
  const out: string[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await db
      .from(table)
      .select(column)
      .order(column)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`select ${table}: ${error.message}`);
    const rows = (data ?? []) as unknown as Record<string, string>[];
    out.push(...rows.map((r) => r[column]));
    if (rows.length < pageSize) return out;
  }
}

export async function deleteByValues(
  db: SupabaseClient,
  table: string,
  values: string[],
  column = "id",
  batchSize = 200,
): Promise<number> {
  for (let i = 0; i < values.length; i += batchSize) {
    const { error } = await db.from(table).delete().in(column, values.slice(i, i + batchSize));
    if (error) throw new Error(`delete ${table}: ${error.message}`);
  }
  return values.length;
}
