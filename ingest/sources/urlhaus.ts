import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeIoc } from "../../lib/ioc/normalize";
import { fetchJson } from "../lib/http";
import { abuseDate, ingestIocItems, requireEnv, type IocItem } from "../lib/iocs";
import type { SourceResult } from "../lib/run";

export const URLHAUS_URL = "https://urlhaus-api.abuse.ch/v1/urls/recent/limit/1000/";

export type UrlhausUrl = {
  id: string | number;
  url: string;
  url_status?: string;
  date_added: string;
  threat?: string | null;
  tags?: string[] | null;
};

type Response = { query_status: string; urls?: UrlhausUrl[] };

export function parseUrlhaus(rows: UrlhausUrl[]): IocItem[] {
  const out: IocItem[] = [];
  for (const r of rows) {
    const ioc = normalizeIoc("url", r.url);
    const added = abuseDate(r.date_added);
    if (!ioc || !added) continue;
    out.push({
      ...ioc,
      first_seen: added,
      last_seen: added,
      source_ref: String(r.id),
      threat_type: r.threat ?? null,
      malware: null, // URLhaus non dichiara la famiglia: i tag sono liberi (es. "elf", "Mozi")
      tags: [...(r.tags ?? []), ...(r.url_status ? [`status:${r.url_status}`] : [])],
    });
  }
  return out;
}

export async function ingestUrlhaus(db: SupabaseClient): Promise<SourceResult> {
  const key = requireEnv("ABUSECH_AUTH_KEY");
  const res = await fetchJson<Response>(URLHAUS_URL, { headers: { "Auth-Key": key } });
  if (res.query_status !== "ok" && res.query_status !== "no_results") {
    throw new Error(`URLhaus query_status=${res.query_status}`);
  }
  const rows = res.urls ?? [];
  const upserted = await ingestIocItems(db, "urlhaus", parseUrlhaus(rows));
  return { fetched: rows.length, upserted };
}
