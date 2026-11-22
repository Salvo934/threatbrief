import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReportPage } from "@/components/report/report-page";
import { Skeleton } from "@/components/ui/primitives";
import { loadReport } from "@/lib/data/reports";
import { publicDb } from "@/lib/supabase/public";

type Props = PageProps<"/briefs/[slug]">;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export default function BriefPage(props: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-[700px]" />}>
      <Brief params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Brief({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const { slug } = await params;
  const mode = (await searchParams).vista === "tecnica" ? "tecnica" : "brief";
  if (!SLUG.test(slug)) notFound();
  const full = await loadReport(publicDb(), { slug });
  if (!full) notFound();
  return (
    <div className="space-y-3">
      <Link href="/briefs" className="text-sm text-muted hover:underline">← Briefs</Link>
      <ReportPage full={full} mode={mode} base={`/briefs/${slug}`} stixHref={`/briefs/${slug}/stix`} />
    </div>
  );
}
