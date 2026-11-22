import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeIoc, normalizeIpWithPort, type Ioc } from "../../lib/ioc/normalize";
import { USER_AGENT } from "../lib/http";
import { salvageJsonArray } from "../lib/salvage";
import { abuseDate, ingestIocItems, linkRecentIocs, requireEnv, type IocItem } from "../lib/iocs";
import type { SourceResult } from "../lib/run";

export const THREATFOX_URL = "https://threatfox-api.abuse.ch/api/v1/";

export type ThreatFoxIoc = {
  id: string;
  ioc: string;
  ioc_type: string;
  threat_type?: string | null;
  malware_printable?: string | null;
  confidence_level?: number | null;
  first_seen: string;
  last_seen?: string | null;
  tags?: string[] | null;
};

type ApiResponse = { query_status: string; data: ThreatFoxIoc[] | string };

function toIoc(r: ThreatFoxIoc): Ioc | null {
  switch (r.ioc_type) {
    case "ip:port": return normalizeIpWithPort(r.ioc);
    case "domain": return normalizeIoc("domain", r.ioc);
    case "url": return normalizeIoc("url", r.ioc);
    case "md5_hash": return normalizeIoc("md5", r.ioc);
    case "sha1_hash": return normalizeIoc("sha1", r.ioc);
    case "sha256_hash": return normalizeIoc("sha256", r.ioc);
    default: return null; // altri tipi (es. sha3_384) non gestiti
  }
}

export function parseThreatFox(rows: ThreatFoxIoc[]): IocItem[] {
  const out: IocItem[] = [];
  for (const r of rows) {
    const ioc = toIoc(r);
    const firstSeen = abuseDate(r.first_seen);
    if (!ioc || !firstSeen) continue;
    const malware = r.malware_printable && !/^unknown/i.test(r.malware_printable) ? r.malware_printable : null;
    out.push({
      ...ioc,
      first_seen: firstSeen,
      last_seen: abuseDate(r.last_seen) ?? firstSeen,
      source_ref: String(r.id),
      threat_type: r.threat_type ?? null,
      malware,
      tags: r.tags ?? [],
      confidence: r.confidence_level ?? null,
    });
  }
  return out;
}

export async function ingestThreatFox(db: SupabaseClient): Promise<SourceResult> {
  const key = requireEnv("ABUSECH_AUTH_KEY");
  const startedAt = new Date();
  // L'API a volte interrompe le risposte lunghe: leggiamo in streaming e, se il JSON è
  // troncato, teniamo i record completi e segnaliamo la run come parziale.
  const res = await fetch(THREATFOX_URL, {
    method: "POST",
    headers: { "Auth-Key": key, "content-type": "application/json", "user-agent": USER_AGENT },
    body: JSON.stringify({ query: "get_iocs", days: 3 }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} da threatfox-api.abuse.ch`);
  const text = await readUntilClosed(res);
  let truncated = false;

  let rows: ThreatFoxIoc[];
  try {
    const json = JSON.parse(text) as ApiResponse;
    if (json.query_status !== "ok" && json.query_status !== "no_result") {
      throw new Error(`ThreatFox query_status=${json.query_status}`);
    }
    rows = Array.isArray(json.data) ? json.data : [];
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("ThreatFox")) throw err;
    const salvaged = salvageJsonArray<ThreatFoxIoc>(text, "data");
    if (!salvaged?.length) throw new Error("risposta ThreatFox troncata, nessun record recuperabile");
    rows = salvaged;
    truncated = true;
  }
  const items = parseThreatFox(rows);
  const upserted = await ingestIocItems(db, "threatfox", items);
  await linkRecentIocs(db, new Date(startedAt.getTime() - 4 * 86_400_000));
  return {
    fetched: rows.length,
    upserted,
    ...(truncated ? { warning: "risposta troncata dalla fonte: importati solo i record completi ricevuti" } : {}),
  };
}

/** Legge il body fino alla fine o finché il server non chiude la connessione. */
async function readUntilClosed(res: globalThis.Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
  } catch {
    // connessione interrotta: restituiamo il parziale, il chiamante decide
  }
  return text;
}
