import Link from "next/link";
import { MeasureBadges } from "@/components/nis2/measure-badges";
import type { RankedMitigation } from "@/lib/attack/mitigations";

/** Mitigazioni ATT&CK in ordine di priorità, con la misura NIS2 corrispondente. */
export function RankedMitigations({ items, scoreLabel }: { items: RankedMitigation[]; scoreLabel?: (r: RankedMitigation) => string }) {
  if (!items.length) return <p className="text-sm text-muted">Nessuna mitigazione applicabile.</p>;
  return (
    <ol className="divide-y divide-line text-sm">
      {items.map((r, i) => (
        <li key={r.mitigation.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
          <span className="min-w-0">
            <span className="mr-2 tabular-nums text-muted">{i + 1}.</span>
            <Link href={`/mitigazioni/${r.mitigation.external_id}`} className="font-medium hover:underline">
              {r.mitigation.name}
            </Link>{" "}
            <span className="font-mono text-xs text-muted">{r.mitigation.external_id}</span>
            <span className="block pl-6 text-xs text-muted tabular-nums">
              {scoreLabel ? scoreLabel(r) : `copre ${r.techniques} tecniche`}
            </span>
          </span>
          <MeasureBadges mitigation={r.mitigation.external_id} />
        </li>
      ))}
    </ol>
  );
}
