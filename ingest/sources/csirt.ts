import type { SupabaseClient } from "@supabase/supabase-js";
import { XMLParser } from "fast-xml-parser";
import { upsertInBatches } from "../lib/db";
import type { SourceResult } from "../lib/run";

// Feed RSS 2.0 "RSS Csirt Italia" linkato dal portale ACN (alert e bollettini).
export const CSIRT_RSS_URL = "https://www.acn.gov.it/portale/feedrss/-/journal/rss/20119/723192";

type RssItem = {
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
  guid?: string | { "#text": string };
  "dc:date"?: string;
};

const CVE_RE = /\bCVE-\d{4}-\d{4,}\b/gi;

const text = (v: unknown) => (typeof v === "string" ? v : v && typeof v === "object" && "#text" in v ? String((v as { "#text": unknown })["#text"]) : "");

export function parseCsirtRss(xml: string) {
  const parser = new XMLParser({ ignoreAttributes: true, processEntities: true, htmlEntities: true });
  const doc = parser.parse(xml);
  const raw = doc?.rss?.channel?.item ?? [];
  const items: RssItem[] = Array.isArray(raw) ? raw : [raw];
  return items
    .map((i) => {
      const link = text(i.link).trim();
      const guid = text(i.guid).trim() || link;
      const date = text(i["dc:date"]) || text(i.pubDate);
      const published = date && !Number.isNaN(Date.parse(date)) ? new Date(date).toISOString() : null;
      const description = text(i.description).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const title = text(i.title).trim();
      return {
        source_id: "csirt_italia",
        external_id: guid,
        title: title.slice(0, 300),
        summary: description.slice(0, 2000) || null,
        url: link || null,
        published_at: published,
        tlp: "CLEAR" as const, // pubblicazione aperta
        tags: [] as string[],
        adversary: null,
        attack_ids: [] as string[],
        cves: [...new Set(`${title} ${description}`.match(CVE_RE)?.map((c) => c.toUpperCase()) ?? [])],
      };
    })
    .filter((i) => i.external_id && i.title);
}

export async function ingestCsirt(db: SupabaseClient): Promise<SourceResult> {
  const res = await fetch(CSIRT_RSS_URL, {
    headers: { "user-agent": "ThreatBrief-ingest/0.1", accept: "application/rss+xml, text/xml" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} da ${new URL(CSIRT_RSS_URL).host}`);
  const items = parseCsirtRss(await res.text());
  const upserted = await upsertInBatches(db, "intel_items", items, "source_id,external_id");
  return { fetched: items.length, upserted };
}
