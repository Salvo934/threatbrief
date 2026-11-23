import type { DigestItem, DigestReview } from "./types";

export type BriefingItem = {
  title: string;
  priority: "azione" | "monitorare" | "info";
  facts: string;
  relevance: string | null;
  action: string | null;
  source: { name: string; url: string | null };
};

/**
 * Punti del briefing pubblico: solo gli elementi rivisti e non esclusi, in ordine di priorità,
 * al massimo 5. Le fonti interne (es. la pagina Fonti) non vengono esposte come link.
 */
export function briefingItems(items: DigestItem[], reviews: DigestReview[], max = 5): BriefingItem[] {
  const byKey = new Map(reviews.map((r) => [r.item_key, r]));
  const order = { azione: 0, monitorare: 1, info: 2 } as const;
  return items
    .map((item) => ({ item, review: byKey.get(item.key) }))
    .filter((x): x is { item: DigestItem; review: DigestReview & { priority: keyof typeof order } } => !!x.review && x.review.priority !== "escludi")
    .sort((a, b) => order[a.review.priority] - order[b.review.priority])
    .slice(0, max)
    .map(({ item, review }) => ({
      title: item.title,
      priority: review.priority,
      facts: item.facts,
      relevance: review.relevance,
      action: review.action,
      source: { name: item.source.name, url: item.source.url?.startsWith("http") ? item.source.url : null },
    }));
}
