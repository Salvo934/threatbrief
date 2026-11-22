import type { ReportListItem } from "@/lib/data/reports";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** Feed RSS 2.0 dei report pubblicati. I report di esempio sono marcati nel titolo. */
export function buildRss(reports: ReportListItem[], siteUrl: string): string {
  const items = reports
    .map((r) => {
      const link = `${siteUrl}/briefs/${r.slug}`;
      const title = r.is_example && !/^esempio\b/i.test(r.title) ? `[ESEMPIO] ${r.title}` : r.title;
      return [
        "    <item>",
        `      <title>${esc(title)}</title>`,
        `      <link>${esc(link)}</link>`,
        `      <guid isPermaLink="true">${esc(link)}</guid>`,
        r.published_at ? `      <pubDate>${new Date(r.published_at).toUTCString()}</pubDate>` : null,
        `      <category>TLP:${esc(r.tlp)}</category>`,
        r.exec_summary ? `      <description>${esc(r.exec_summary)}</description>` : null,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ThreatBrief · Briefs</title>
    <link>${esc(siteUrl)}/briefs</link>
    <atom:link href="${esc(siteUrl)}/briefs/rss.xml" rel="self" type="application/rss+xml"/>
    <description>Report di cyber threat intelligence TLP:CLEAR sui settori italiani.</description>
    <language>it-it</language>
${items}
  </channel>
</rss>
`;
}
