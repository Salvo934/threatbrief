import { Download } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import type { DetectionRule } from "@/lib/report/types";

const LEVEL_TONE = { critical: "warn", high: "warn", medium: "neutral", low: "neutral", informational: "neutral" } as const;

/** Nome file leggibile: tecnica + titolo. */
const fileName = (r: DetectionRule) => `${r.technique_id}-${r.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}.yml`;
const dataUrl = (yaml: string) => `data:application/x-yaml;charset=utf-8,${encodeURIComponent(yaml)}`;

/** Elenco delle regole Sigma di un report, con YAML espandibile e download (senza JavaScript). */
export function DetectionRules({ rules }: { rules: DetectionRule[] }) {
  const all = rules.map((r) => r.yaml).join("---\n");
  return (
    <div className="space-y-3">
      <p className="rounded-md bg-warn-bg px-3 py-2 text-xs text-warn-text">
        <strong>Da testare.</strong> Bozze generate con IA a partire dalle tecniche del report e controllate dal codice (tecnica
        del report, sorgente di log nota, condizione coerente, nessun IP o hash inventato). Prima dell&apos;uso vanno provate
        sui propri log: stato Sigma «experimental».
      </p>
      <ul className="divide-y divide-line">
        {rules.map((r) => (
          <li key={r.id} className="py-2">
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                <span className="font-mono text-xs text-muted">{r.technique_id}</span>
                <span className="font-medium">{r.title}</span>
                <Badge tone={LEVEL_TONE[r.level as keyof typeof LEVEL_TONE] ?? "neutral"}>{r.level}</Badge>
                <span className="text-xs text-muted">{r.logsource}</span>
              </summary>
              <pre className="mt-2 overflow-x-auto rounded-md bg-surface-2 p-3 font-mono text-[11px] leading-relaxed">{r.yaml}</pre>
              <a href={dataUrl(r.yaml)} download={fileName(r)} className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:underline">
                <Download aria-hidden className="size-3" /> Scarica {fileName(r)}
              </a>
            </details>
          </li>
        ))}
      </ul>
      {rules.length > 1 && (
        <a href={dataUrl(all)} download="threatbrief-sigma.yml" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
          <Download aria-hidden className="size-3.5" /> Scarica tutte ({rules.length}) in un file
        </a>
      )}
    </div>
  );
}
