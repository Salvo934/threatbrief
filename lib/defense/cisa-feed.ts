import { XMLParser } from "fast-xml-parser";

// Feed RSS degli avvisi CISA (con agenzie partner: FBI, NSA, NCSC, ACN…): contiene il testo completo.
export const CISA_ADVISORIES_URL = "https://www.cisa.gov/cybersecurity-advisories/cybersecurity-advisories.xml";

type RssItem = { title?: string; link?: string; description?: string; pubDate?: string };

export type Advisory = { external_id: string; title: string; url: string; published_at: string; text: string };

export function parseCisaRss(xml: string): Advisory[] {
  const doc = new XMLParser({ ignoreAttributes: true, processEntities: true, htmlEntities: true }).parse(xml);
  const raw = doc?.rss?.channel?.item ?? [];
  const items: RssItem[] = Array.isArray(raw) ? raw : [raw];
  return items.flatMap((i) => {
    const url = String(i.link ?? "").trim();
    const title = String(i.title ?? "").trim();
    const date = i.pubDate && !Number.isNaN(Date.parse(i.pubDate)) ? new Date(i.pubDate).toISOString() : null;
    if (!url || !title || !date) return [];
    const text = String(i.description ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;| /g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return [{ external_id: url.split("/").filter(Boolean).pop()!, title: title.slice(0, 300), url, published_at: date, text }];
  });
}

export async function fetchCisaAdvisories(): Promise<Advisory[]> {
  const res = await fetch(CISA_ADVISORIES_URL, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; ThreatBrief-ingest/0.1)", accept: "application/rss+xml, text/xml" },
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} da www.cisa.gov`);
  return parseCisaRss(await res.text());
}
