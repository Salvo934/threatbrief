import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AnalysisResultView } from "@/components/analysis/analysis-result";
import { Badge, Card, PageHeader, Skeleton } from "@/components/ui/primitives";
import type { AnalysisResult } from "@/lib/analysis/types";
import { formatDateTime } from "@/lib/format";
import { sessionDb } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function AnalisiDettaglio(props: PageProps<"/analisi/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Detail params={props.params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: PageProps<"/analisi/[id]">["params"] }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const db = await sessionDb();
  // RLS: visibile solo se è un esempio o è dell'utente loggato
  const { data } = await db.from("analyses").select("id, title, input_text, result, is_example, created_at").eq("id", id).maybeSingle();
  if (!data) notFound();

  return (
    <div className="space-y-4">
      <Link href="/analisi" className="text-sm text-muted hover:underline">← Analisi</Link>
      <PageHeader title={<>{data.title} {data.is_example && <Badge tone="warn">esempio</Badge>}</>}>
        Salvata il {formatDateTime(data.created_at)}. I risultati sono una fotografia al momento del salvataggio:
        per lo stato attuale, rianalizza il testo.
      </PageHeader>
      <Card title="Testo analizzato">
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed">{data.input_text}</pre>
      </Card>
      <AnalysisResultView result={data.result as AnalysisResult} />
    </div>
  );
}
