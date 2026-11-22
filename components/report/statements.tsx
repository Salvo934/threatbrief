import { Badge } from "@/components/ui/primitives";
import { CONFIDENCE_LABEL } from "@/lib/report/admiralty";
import type { ReportSource, ReportStatement } from "@/lib/report/types";

/**
 * Fatti e valutazioni separati: i fatti citano la fonte [n], le valutazioni dichiarano
 * la confidenza. Due elenchi distinti, così il lettore non li confonde.
 */
export function Statements({ items, sources }: { items: ReportStatement[]; sources: ReportSource[] }) {
  const facts = items.filter((s) => s.kind === "fatto");
  const assessments = items.filter((s) => s.kind === "valutazione");
  const n = new Map(sources.map((s, i) => [s.id, i + 1]));
  if (!items.length) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Fatti (da fonte)</h3>
        {facts.length === 0 ? (
          <p className="text-sm text-muted">—</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {facts.map((f) => (
              <li key={f.id}>
                {f.body}{" "}
                <a href={`#fonte-${n.get(f.source_id ?? "")}`} className="text-xs text-accent">[{n.get(f.source_id ?? "")}]</a>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Valutazioni (analista)</h3>
        {assessments.length === 0 ? (
          <p className="text-sm text-muted">—</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {assessments.map((a) => (
              <li key={a.id}>
                <Badge tone="warn">confidenza {a.confidence ? CONFIDENCE_LABEL[a.confidence] : "?"}</Badge> {a.body}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
