import { Badge } from "@/components/ui/primitives";
import { countryName, motivationName, sectorName } from "@/lib/format";

export function SectorBadges({ ids }: { ids: string[] }) {
  if (!ids.length) return <span className="text-muted">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {ids.map((id) => (
        <Badge key={id} tone="accent">{sectorName(id)}</Badge>
      ))}
    </span>
  );
}

export function MotivationBadges({ ids }: { ids: string[] }) {
  if (!ids.length) return <span className="text-muted">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {ids.map((id) => (
        <Badge key={id}>{motivationName(id)}</Badge>
      ))}
    </span>
  );
}

export function CountryList({ codes, max = 4 }: { codes: string[]; max?: number }) {
  if (!codes.length) return <span className="text-muted">—</span>;
  const shown = codes.slice(0, max).map(countryName).join(", ");
  const rest = codes.length - max;
  return (
    <span title={codes.map(countryName).join(", ")}>
      {shown}
      {rest > 0 && <span className="text-muted"> +{rest}</span>}
    </span>
  );
}
