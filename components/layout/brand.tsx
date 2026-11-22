import { Radar } from "lucide-react";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-accent text-white shadow-sm">
        <Radar className="size-4" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold tracking-tight">ThreatBrief</span>
        {!compact && <span className="block text-[11px] text-muted">CTI · settori italiani</span>}
      </span>
    </Link>
  );
}
