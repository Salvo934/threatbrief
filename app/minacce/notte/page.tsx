import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { MINACCE_TABS, SubNav } from "@/components/ui/sub-nav";
import { longDate, WorldReportView } from "@/components/world/world-report-view";
import { getTactics } from "@/lib/data/attack";
import { getWorldReport, listWorldReports } from "@/lib/data/world";

export const metadata: Metadata = { title: "La notte nel mondo" };

export default function NottePage() {
  return (
    <div className="space-y-5">
      <SubNav items={MINACCE_TABS} current="/minacce/notte" />
      <PageHeader title="La notte nel mondo">
        Ogni mattina l&apos;app raccoglie cosa è successo nelle ultime 24 ore nel mondo (rivendicazioni ransomware, malware più
        segnalati, vulnerabilità appena sfruttate), collega gli attori a MITRE ATT&CK e calcola le tecniche più ricorrenti e le
        difese che ne coprono di più.
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-[800px]" />}>
        <Latest />
      </Suspense>
    </div>
  );
}

async function Latest() {
  const [report, tactics, archive] = await Promise.all([getWorldReport(), getTactics(), listWorldReports()]);
  if (!report) return <EmptyState>Nessun rapporto ancora generato.</EmptyState>;
  return (
    <>
      <h2 className="text-lg font-semibold first-letter:uppercase">{longDate(report.report_date)}</h2>
      <WorldReportView report={report} tactics={tactics} />
      {archive.length > 1 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Giorni precedenti</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {archive.slice(1).map((a) => (
              <li key={a.report_date}>
                <Link href={`/minacce/notte/${a.report_date}`} className="rounded border border-line px-2 py-1 hover:bg-surface-2">
                  {new Date(`${a.report_date}T12:00:00Z`).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                  <span className="ml-1 text-xs text-muted">{a.claims} riv.</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
