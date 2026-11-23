import { SECTION_ORDER, type DigestItem, type DigestReview } from "./types";

const TAG = { azione: "AZIONE", monitorare: "MONITORARE", info: "INFO" } as const;

/**
 * Testo finale del digest: solo gli elementi rivisti e non esclusi, in ordine di priorità
 * (azione → monitorare → info), con le righe scritte dall'analista.
 */
export function composeDigest(date: string, items: DigestItem[], reviews: DigestReview[]): string {
  const byKey = new Map(reviews.map((r) => [r.item_key, r]));
  const order = { azione: 0, monitorare: 1, info: 2 } as const;
  const chosen = items
    .map((item) => ({ item, review: byKey.get(item.key) }))
    .filter((x): x is { item: DigestItem; review: DigestReview & { priority: keyof typeof order } } => !!x.review && x.review.priority !== "escludi")
    .sort((a, b) => order[a.review.priority] - order[b.review.priority] || SECTION_ORDER.indexOf(a.item.section) - SECTION_ORDER.indexOf(b.item.section));

  const [y, m, d] = date.split("-");
  const lines = [`DIGEST CTI — ${d}/${m}/${y} — TLP:AMBER`, ""];
  if (!chosen.length) lines.push("Nessun elemento selezionato: rivedi la bozza e scegli cosa includere.");
  chosen.forEach(({ item, review }, n) => {
    lines.push(`${n + 1}. [${TAG[review.priority]}] ${item.title}`);
    if (review.relevance) lines.push(`   Perché ci riguarda: ${review.relevance}`);
    lines.push(`   Cosa fare: ${review.action ?? "nessuna azione, monitoriamo."}`);
    lines.push(`   Fonte: ${item.source.name}${item.source.url && item.source.url.startsWith("http") ? ` — ${item.source.url}` : ""}`);
    lines.push("");
  });
  const excluded = reviews.filter((r) => r.priority === "escludi").length;
  if (excluded) lines.push(`(${excluded} element${excluded === 1 ? "o escluso" : "i esclusi"} dopo la revisione.)`);
  return lines.join("\n").trimEnd();
}
