import type { SupabaseClient } from "@supabase/supabase-js";
import type { IocType } from "../../lib/ioc/normalize";
import { SkipSource } from "./run";

/** Un indicatore pronto per public.ingest_iocs (già normalizzato). */
export type IocItem = {
  type: IocType;
  value: string;
  first_seen: string;
  last_seen?: string | null;
  source_ref?: string;
  threat_type?: string | null;
  malware?: string | null;
  tags?: string[];
  confidence?: number | null;
  intel_external_id?: string;
};

/** Merge degli IOC via RPC (first_seen = min, last_seen = max), a blocchi. */
export async function ingestIocItems(db: SupabaseClient, sourceId: string, items: IocItem[], batch = 1000) {
  let written = 0;
  for (let i = 0; i < items.length; i += batch) {
    const { data, error } = await db.rpc("ingest_iocs", { p_source: sourceId, p_items: items.slice(i, i + batch) });
    if (error) throw new Error(`ingest_iocs: ${error.message}`);
    written += (data as number) ?? 0;
  }
  return written;
}

/** Collega a ATT&CK gli IOC visti di recente (software per nome, gruppi per avversario dichiarato). */
export async function linkRecentIocs(db: SupabaseClient, since: Date) {
  const { data, error } = await db.rpc("link_iocs", { p_since: since.toISOString() });
  if (error) throw new Error(`link_iocs: ${error.message}`);
  return (data as number) ?? 0;
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new SkipSource(`chiave API non configurata (${name})`);
  return v;
}

/** "2026-11-20 13:36:27 UTC" (formato abuse.ch) → ISO 8601. */
export function abuseDate(s: string | null | undefined): string | null {
  if (!s) return null;
  const iso = s.trim().replace(" UTC", "Z").replace(" ", "T");
  return Number.isNaN(Date.parse(iso)) ? null : new Date(iso).toISOString();
}
