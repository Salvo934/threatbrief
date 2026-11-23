import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/primitives";
import { MINACCE_TABS, SubNav } from "@/components/ui/sub-nav";
import { longDate, WorldReportView } from "@/components/world/world-report-view";
import { getTactics } from "@/lib/data/attack";
import { getWorldReport } from "@/lib/data/world";

export async function generateMetadata(props: PageProps<"/minacce/notte/[date]">): Promise<Metadata> {
  const { date } = await props.params;
  return { title: `La notte nel mondo · ${date}` };
}

export default async function NotteDatePage(props: PageProps<"/minacce/notte/[date]">) {
  const { date } = await props.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const [report, tactics] = await Promise.all([getWorldReport(date), getTactics()]);
  if (!report) notFound();
  return (
    <div className="space-y-5">
      <SubNav items={MINACCE_TABS} current="/minacce/notte" />
      <PageHeader title={<>La notte nel mondo · {longDate(report.report_date)}</>}>
        <Link href="/minacce/notte" className="text-accent hover:underline">← Rapporto più recente</Link>
      </PageHeader>
      <WorldReportView report={report} tactics={tactics} />
    </div>
  );
}
