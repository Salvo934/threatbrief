import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GenerateButton } from "@/components/digest/generate-button";
import { Badge, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/format";
import { getViewer, sessionDb } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Digest giornaliero" };

export default function DigestListPage() {
  return (
    <>
      <PageHeader title="Digest giornaliero">
        Ogni mattina l&apos;app prepara una <strong>bozza automatica</strong> con le novità delle ultime ore: nuove
        vulnerabilità sfruttate, alert di CSIRT Italia, rivendicazioni ransomware, indicatori e stato delle fonti. Tu decidi
        cosa conta, scrivi <em>perché ci riguarda</em> e <em>cosa fare</em>, e ottieni il testo pronto da inviare.
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const viewer = await getViewer();
  if (!viewer?.isAnalyst) {
    return (
      <EmptyState>
        Il digest è un&apos;area di lavoro riservata all&apos;analista.{" "}
        {!viewer && <><Link href="/login?next=/digest" className="underline">Accedi</Link> · </>}
        Il risultato pubblico del triage quotidiano è il <Link href="/briefing" className="underline">Briefing</Link>.
      </EmptyState>
    );
  }
  const db = await sessionDb();
  const { data: digests } = await db
    .from("digests")
    .select("id, digest_date, generated_at, generated_by, status, items, window_start, window_end")
    .order("digest_date", { ascending: false })
    .limit(30);
  const ids = (digests ?? []).map((d) => d.id);
  const { data: reviews } = ids.length
    ? await db.from("digest_reviews").select("digest_id").in("digest_id", ids)
    : { data: [] as { digest_id: string }[] };
  const reviewed = new Map<string, number>();
  for (const r of reviews ?? []) reviewed.set(r.digest_id, (reviewed.get(r.digest_id) ?? 0) + 1);

  return (
    <div className="space-y-4">
      <Card title="Bozze" action={<GenerateButton />}>
        {!digests?.length ? (
          <p className="text-sm text-muted">Nessun digest ancora. La bozza si genera ogni mattina alle 8–9 (ora di Roma), oppure ora con il pulsante.</p>
        ) : (
          <ul className="divide-y divide-line">
            {digests.map((d) => {
              const total = Array.isArray(d.items) ? d.items.length : 0;
              const done = reviewed.get(d.id) ?? 0;
              return (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div>
                    <Link href={`/digest/${d.digest_date}`} className="font-medium hover:underline">
                      {new Date(`${d.digest_date}T12:00:00Z`).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
                    </Link>
                    <div className="text-xs text-muted">
                      Generata {formatDateTime(d.generated_at)} ({d.generated_by}) · finestra {formatDateTime(d.window_start)} → {formatDateTime(d.window_end)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="tabular-nums text-muted">{done}/{total} rivisti</span>
                    <Badge tone={d.status === "rivisto" ? "accent" : "warn"}>{d.status === "rivisto" ? "rivisto" : "bozza da verificare"}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <p className="text-xs text-muted">
        Le priorità proposte sono regole automatiche (es. «vulnerabilità con uso ransomware noto → azione»): sono suggerimenti,
        la decisione è tua. Visibile solo all&apos;analista, mai in cache.
      </p>
    </div>
  );
}
