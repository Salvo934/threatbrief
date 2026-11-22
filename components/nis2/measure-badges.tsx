import Link from "next/link";
import { Badge } from "@/components/ui/primitives";
import { measureRef, nis2ForMitigation, nis2Measure } from "@/lib/nis2/mapping";

/** Lettere dell'art. 24, c. 2 D.Lgs. 138/2024 associate a una mitigazione ATT&CK. */
export function MeasureBadges({ mitigation }: { mitigation: string }) {
  const m = nis2ForMitigation(mitigation);
  if (!m?.measures.length) return <span className="text-xs text-muted">—</span>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {m.measures.map((id) => (
        <Link key={id} href={`/mitigazioni#lett-${id}`} title={`${measureRef(id)}: ${nis2Measure(id)?.short}`}>
          <Badge tone="accent">NIS2 {id})</Badge>
        </Link>
      ))}
    </span>
  );
}
