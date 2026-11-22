import { rankForTechniques } from "@/lib/data/mitigations";
import { nis2ForMitigation } from "@/lib/nis2/mapping";
import type { ReportFull } from "@/lib/report/types";
import { PdfButton } from "./pdf-button";
import { ReportView, type ReportViewMode } from "./report-view";

/** Vista completa di un report con export (PDF nel browser, STIX 2.1 dal server). */
export async function ReportPage({ full, mode, base, stixHref }: { full: ReportFull; mode: ReportViewMode; base: string; stixHref: string }) {
  const ranked = full.techniques.length ? (await rankForTechniques(new Map(full.techniques.map((t) => [t.id, 1])))).slice(0, 8) : [];
  const pdfMitigations = ranked.map((m) => ({
    external_id: m.mitigation.external_id,
    name: m.mitigation.name,
    techniques: m.techniques,
    measures: nis2ForMitigation(m.mitigation.external_id)?.measures ?? [],
  }));
  return (
    <ReportView
      full={full}
      mode={mode}
      base={base}
      mitigations={ranked}
      actions={
        <div className="flex flex-wrap gap-2">
          <PdfButton full={full} mode={mode} mitigations={pdfMitigations} />
          <a href={stixHref} className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface-2" download>
            STIX 2.1
          </a>
        </div>
      }
    />
  );
}
