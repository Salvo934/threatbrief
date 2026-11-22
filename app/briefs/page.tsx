import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TlpLabel } from "@/components/report/tlp";
import { Badge, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { listPublished } from "@/lib/data/reports";
import { formatDate } from "@/lib/format";
import { publicDb } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "Briefs",
  alternates: { types: { "application/rss+xml": "/briefs/rss.xml" } },
};

export default function BriefsPage() {
  return (
    <>
      <PageHeader title="Briefs">
        Report pubblicati, tutti TLP:CLEAR (divulgazione libera). Ogni report ha un brief esecutivo di una pagina e una
        scheda tecnica, con fatti separati dalle valutazioni, fonti con codice Admiralty ed export PDF e STIX 2.1.{" "}
        <a href="/briefs/rss.xml" className="underline">Feed RSS</a>.
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-64" />}>
        <List />
      </Suspense>
    </>
  );
}

async function List() {
  const reports = await listPublished(publicDb());
  if (!reports.length) return <EmptyState>Nessun report pubblicato.</EmptyState>;
  return (
    <ul className="space-y-3">
      {reports.map((r) => (
        <li key={r.id} className="rounded-lg border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <TlpLabel tlp={r.tlp} />
            {r.is_example && <Badge tone="warn">ESEMPIO</Badge>}
            {r.exec_risk && <Badge>rischio {r.exec_risk}</Badge>}
            <span className="text-muted">{formatDate(r.published_at)}</span>
          </div>
          <Link href={`/briefs/${r.slug}`} className="mt-1.5 block text-lg font-semibold hover:underline">{r.title}</Link>
          {r.exec_summary && <p className="mt-1 line-clamp-2 text-sm text-muted">{r.exec_summary}</p>}
        </li>
      ))}
    </ul>
  );
}
