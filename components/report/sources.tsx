import { admiraltyCode, admiraltyLabel } from "@/lib/report/admiralty";
import type { ReportSource } from "@/lib/report/types";
import { formatDate } from "@/lib/format";

export function Sources({ sources }: { sources: ReportSource[] }) {
  if (!sources.length) return <p className="text-sm text-muted">Nessuna fonte.</p>;
  return (
    <ol className="space-y-1.5 text-sm">
      {sources.map((s, i) => (
        <li key={s.id} id={`fonte-${i + 1}`} className="flex gap-2">
          <span className="tabular-nums text-muted">[{i + 1}]</span>
          <span className="min-w-0">
            <span title={admiraltyLabel(s.reliability, s.credibility)} className="mr-1.5 rounded border border-line px-1 font-mono text-xs">
              {admiraltyCode(s.reliability, s.credibility)}
            </span>
            {s.url ? (
              <a href={s.url} target="_blank" rel="noreferrer" className="break-words hover:underline">{s.title}</a>
            ) : (
              s.title
            )}
            <span className="text-muted">
              {s.publisher && ` · ${s.publisher}`} · consultata il {formatDate(s.accessed_at)}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
