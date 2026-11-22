import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReportPage } from "@/components/report/report-page";
import { Skeleton } from "@/components/ui/primitives";
import { loadReport } from "@/lib/data/reports";
import { sessionDb } from "@/lib/supabase/server";

type Props = PageProps<"/report/[id]/anteprima">;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function PreviewPage(props: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-[700px]" />}>
      <Preview params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Preview({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const { id } = await params;
  const mode = (await searchParams).vista === "tecnica" ? "tecnica" : "brief";
  if (!UUID.test(id)) notFound();
  // RLS: il proprietario vede anche bozze e report non CLEAR; gli altri solo i pubblicati.
  const full = await loadReport(await sessionDb(), { id });
  if (!full) notFound();
  return (
    <div className="space-y-3">
      <Link href={`/report/${id}`} className="text-sm text-muted hover:underline">← Torna all&apos;editor</Link>
      <ReportPage full={full} mode={mode} base={`/report/${id}/anteprima`} stixHref={`/report/${id}/stix`} />
    </div>
  );
}
