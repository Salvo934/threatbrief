import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeIoc, type Ioc } from "../../lib/ioc/normalize";
import { fetchJson } from "../lib/http";
import { ingestIocItems, linkRecentIocs, requireEnv, type IocItem } from "../lib/iocs";
import type { SourceResult } from "../lib/run";
import { upsertInBatches } from "../lib/db";

const BASE = "https://otx.alienvault.com/api/v1/pulses/subscribed";
const MAX_PAGES = 5; // 5 × 20 pulse per run
const MAX_INDICATORS_PER_PULSE = 1000;
const DEFAULT_LOOKBACK_DAYS = 7;

export type OtxIndicator = { id?: number; indicator: string; type: string; created?: string };
export type OtxPulse = {
  id: string;
  name: string;
  description?: string | null;
  created: string;
  modified: string;
  tlp?: string | null;
  TLP?: string | null;
  tags?: string[];
  adversary?: string | null;
  attack_ids?: (string | { id: string })[];
  indicators?: OtxIndicator[];
};
type Page = { results: OtxPulse[]; next: string | null };

const TLP_MAP: Record<string, "CLEAR" | "GREEN" | "AMBER" | "RED"> = {
  white: "CLEAR", clear: "CLEAR", green: "GREEN", amber: "AMBER", red: "RED",
};

/** Il sito è pubblico: si ripubblicano solo pulse TLP:CLEAR (ex WHITE). */
export const isPublishable = (p: OtxPulse) => (TLP_MAP[(p.tlp ?? p.TLP ?? "").toLowerCase()] ?? null) === "CLEAR";

function toIoc(i: OtxIndicator): Ioc | null {
  switch (i.type) {
    case "IPv4": return normalizeIoc("ipv4", i.indicator);
    case "IPv6": return normalizeIoc("ipv6", i.indicator);
    case "domain":
    case "hostname": return normalizeIoc("domain", i.indicator);
    case "URL": return normalizeIoc("url", i.indicator);
    case "FileHash-MD5": return normalizeIoc("md5", i.indicator);
    case "FileHash-SHA1": return normalizeIoc("sha1", i.indicator);
    case "FileHash-SHA256": return normalizeIoc("sha256", i.indicator);
    case "CVE": return normalizeIoc("cve", i.indicator);
    default: return null;
  }
}

const isoOr = (s: string | undefined, fallback: string) => {
  if (!s) return fallback;
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`); // OTX spesso omette il fuso: è UTC
  return Number.isNaN(d.getTime()) ? fallback : d.toISOString();
};

export function parseOtxPulses(pulses: OtxPulse[]) {
  const published = pulses.filter(isPublishable);
  const intel = published.map((p) => {
    const indicators = p.indicators ?? [];
    return {
      source_id: "otx",
      external_id: p.id,
      title: p.name.slice(0, 300),
      summary: p.description?.slice(0, 2000) || null,
      url: `https://otx.alienvault.com/pulse/${p.id}`,
      published_at: isoOr(p.modified, isoOr(p.created, new Date().toISOString())),
      tlp: "CLEAR" as const,
      tags: (p.tags ?? []).slice(0, 30),
      adversary: p.adversary?.trim() || null,
      attack_ids: (p.attack_ids ?? [])
        .map((a) => (typeof a === "string" ? a : a.id))
        .filter((a) => /^T\d{4}(?:\.\d{3})?$/.test(a)),
      cves: indicators.filter((i) => i.type === "CVE").map((i) => i.indicator.toUpperCase()).slice(0, 100),
    };
  });
  const items: IocItem[] = [];
  for (const p of published) {
    const pulseDate = isoOr(p.created, new Date().toISOString());
    for (const i of (p.indicators ?? []).slice(0, MAX_INDICATORS_PER_PULSE)) {
      const ioc = toIoc(i);
      if (!ioc) continue;
      const seen = isoOr(i.created, pulseDate);
      items.push({ ...ioc, first_seen: seen, last_seen: seen, source_ref: p.id, intel_external_id: p.id, tags: [] });
    }
  }
  return { intel, items, skippedNotClear: pulses.length - published.length };
}

export async function ingestOtx(db: SupabaseClient): Promise<SourceResult> {
  const key = requireEnv("OTX_API_KEY");
  const startedAt = new Date();

  // Riparte dall'ultimo successo (con un'ora di margine), al massimo 7 giorni indietro.
  const { data: src } = await db.from("sources").select("last_success_at").eq("id", "otx").single();
  const floor = startedAt.getTime() - DEFAULT_LOOKBACK_DAYS * 86_400_000;
  const since = new Date(Math.max(floor, src?.last_success_at ? Date.parse(src.last_success_at) - 3_600_000 : floor));

  const pulses: OtxPulse[] = [];
  let url: string | null = `${BASE}?limit=20&modified_since=${encodeURIComponent(since.toISOString())}`;
  for (let page = 0; url && page < MAX_PAGES; page++) {
    const res: Page = await fetchJson<Page>(url, { headers: { "X-OTX-API-KEY": key } });
    pulses.push(...res.results);
    url = res.next;
  }

  const { intel, items, skippedNotClear } = parseOtxPulses(pulses);
  await upsertInBatches(db, "intel_items", intel, "source_id,external_id");
  const upserted = await ingestIocItems(db, "otx", items);
  await linkRecentIocs(db, since);
  if (skippedNotClear) console.log(`  otx: ${skippedNotClear} pulse non TLP:CLEAR esclusi`);
  return { fetched: pulses.length, upserted: upserted + intel.length };
}
