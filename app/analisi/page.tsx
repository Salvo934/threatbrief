import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, PageHeader, Skeleton } from "@/components/ui/primitives";
import { buildSampleText } from "@/lib/analysis/sample";
import type { AnalysisResult } from "@/lib/analysis/types";
import { formatDateTime } from "@/lib/format";
import { getViewer, sessionDb } from "@/lib/supabase/server";
import { Workbench } from "./workbench";

export const metadata: Metadata = { title: "Analisi" };

export default function AnalisiPage() {
  return (
    <>
      <PageHeader title="Analisi">
        Incolla un report o una lista di indicatori: estraggo gli IOC (anche defanged), li confronto con quanto raccolto
        dalle fonti e con ATT&CK, controllo le CVE nel catalogo KEV e suggerisco le tecniche citate.
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const [viewer, sample, db] = await Promise.all([getViewer(), buildSampleText(), sessionDb()]);
  // La RLS restituisce le analisi di esempio + quelle dell'utente loggato
  const { data: saved } = await db
    .from("analyses")
    .select("id, title, is_example, created_at, result")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <Workbench canSave={!!viewer?.isAnalyst} sample={sample} />
      <Card title="Analisi salvate">
        {!saved?.length ? (
          <p className="text-sm text-muted">Nessuna analisi salvata.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {saved.map((a) => {
              const r = a.result as AnalysisResult;
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <Link href={`/analisi/${a.id}`} className="font-medium text-accent hover:underline">{a.title}</Link>{" "}
                    {a.is_example && <Badge tone="warn">esempio</Badge>}
                  </span>
                  <span className="text-xs text-muted tabular-nums">
                    {r.iocs?.length ?? 0} IOC · {r.techniques?.length ?? 0} tecniche · {formatDateTime(a.created_at)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
