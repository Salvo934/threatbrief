import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge, Card, PageHeader, Skeleton } from "@/components/ui/primitives";
import { formatDateTime, formatNumber, sourceName } from "@/lib/format";
import { publicDb } from "@/lib/supabase/public";

export const metadata: Metadata = { title: "Fonti" };

// Cosa raccoglie ogni fonte e con che frequenza (per chi legge la pagina).
const ABOUT: Record<string, { what: string; schedule: string }> = {
  mitre_attack: { what: "Tattiche, tecniche, gruppi, software, mitigazioni (STIX 2.1)", schedule: "settimanale" },
  cisa_kev: { what: "Vulnerabilità sfruttate attivamente", schedule: "ogni 6 ore" },
  threatfox: { what: "IOC (IP, domini, URL, hash) degli ultimi 3 giorni", schedule: "ogni 6 ore" },
  urlhaus: { what: "URL malevoli recenti (max 1000)", schedule: "ogni 6 ore" },
  otx: { what: "Pulse dei canali seguiti, solo TLP:CLEAR", schedule: "ogni 6 ore" },
  csirt_italia: { what: "Alert e bollettini (RSS)", schedule: "ogni 6 ore" },
  mitre_d3fend: { what: "Contromisure difensive per ogni tecnica ATT&CK", schedule: "settimanale" },
  ransomware_live: { what: "Rivendicazioni ransomware contro vittime italiane (non verificate)", schedule: "ogni 6 ore" },
};

type SourceRow = {
  id: string; name: string; homepage_url: string; requires_api_key: boolean; last_run_at: string | null;
  last_success_at: string | null; last_status: string | null; last_error: string | null;
  last_record_count: number | null; last_version: string | null;
};
type RunRow = {
  id: number; source_id: string; started_at: string; finished_at: string | null; status: string;
  records_fetched: number; records_upserted: number; error: string | null;
};

export default function FontiPage() {
  return (
    <>
      <PageHeader title="Fonti e raccolta">
        Stato di ogni feed: quando è stato letto, quanti record ha restituito e l&apos;ultimo errore. Se una fonte non
        risponde le altre continuano a essere aggiornate. La raccolta gira su GitHub Actions; gli IOC non visti da 90
        giorni vengono rimossi.
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Sources />
      </Suspense>
    </>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === "ok") return <Badge tone="accent">ok</Badge>;
  if (status === "partial") return <Badge tone="warn">parziale</Badge>;
  if (status === "error") return <Badge tone="warn">errore</Badge>;
  if (status === "skipped") return <Badge>saltata</Badge>;
  if (status === "running") return <Badge>in corso</Badge>;
  return <Badge>mai eseguita</Badge>;
}

async function countIocs(db: ReturnType<typeof publicDb>, sourceId: string) {
  const { count } = await db.from("ioc_observations").select("*", { count: "exact", head: true }).eq("source_id", sourceId);
  return count ?? 0;
}

async function Sources() {
  const db = publicDb();
  const [sourcesRes, runsRes, tf, uh, otx, iocTotal] = await Promise.all([
    db.from("sources").select("id, name, homepage_url, requires_api_key, last_run_at, last_success_at, last_status, last_error, last_record_count, last_version").order("name"),
    db.from("ingestion_runs").select("id, source_id, started_at, finished_at, status, records_fetched, records_upserted, error").order("started_at", { ascending: false }).limit(25),
    countIocs(db, "threatfox"),
    countIocs(db, "urlhaus"),
    countIocs(db, "otx"),
    db.from("iocs").select("*", { count: "exact", head: true }),
  ]);
  const sources = (sourcesRes.data ?? []) as SourceRow[];
  const runs = (runsRes.data ?? []) as RunRow[];
  const iocBySource: Record<string, number> = { threatfox: tf, urlhaus: uh, otx };

  return (
    <div className="space-y-6">
      <p className="text-sm">
        <span className="font-semibold tabular-nums">{formatNumber(iocTotal.count ?? 0)}</span>{" "}
        <span className="text-muted">IOC unici in archivio (deduplicati tra le fonti).</span>
      </p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sources.map((s) => (
          <Card
            key={s.id}
            title={<a href={s.homepage_url} target="_blank" rel="noreferrer" className="hover:underline">{s.name}</a>}
            action={<StatusBadge status={s.last_status} />}
          >
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted">Contenuto</dt>
              <dd>{ABOUT[s.id]?.what ?? "—"}</dd>
              <dt className="text-muted">Frequenza</dt>
              <dd>{ABOUT[s.id]?.schedule ?? "—"}</dd>
              <dt className="text-muted">Ultima lettura</dt>
              <dd className="tabular-nums">{formatDateTime(s.last_run_at)}</dd>
              <dt className="text-muted">Ultimo successo</dt>
              <dd className="tabular-nums">{formatDateTime(s.last_success_at)}</dd>
              <dt className="text-muted">Record letti</dt>
              <dd className="tabular-nums">{s.last_record_count == null ? "—" : formatNumber(s.last_record_count)}</dd>
              {s.id in iocBySource && (
                <>
                  <dt className="text-muted">Osservazioni IOC</dt>
                  <dd className="tabular-nums">{formatNumber(iocBySource[s.id])}</dd>
                </>
              )}
              {s.last_version && (
                <>
                  <dt className="text-muted">Versione</dt>
                  <dd>{s.last_version}</dd>
                </>
              )}
              <dt className="text-muted">Chiave API</dt>
              <dd>{s.requires_api_key ? "sì (gratuita)" : "no"}</dd>
            </dl>
            {s.last_error && (
              <p className={`mt-3 text-xs ${s.last_status === "error" ? "text-err" : "text-muted"}`}>
                {s.last_status === "skipped" ? "Motivo" : s.last_status === "partial" ? "Nota" : "Ultimo errore"}: {s.last_error}
              </p>
            )}
          </Card>
        ))}
      </div>

      <Card title="Ultime esecuzioni">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-1.5 pr-3 font-medium">Inizio</th>
                <th className="py-1.5 pr-3 font-medium">Fonte</th>
                <th className="py-1.5 pr-3 font-medium">Esito</th>
                <th className="py-1.5 pr-3 text-right font-medium">Letti</th>
                <th className="py-1.5 pr-3 text-right font-medium">Scritti</th>
                <th className="py-1.5 pr-3 text-right font-medium">Durata</th>
                <th className="py-1.5 font-medium">Errore</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {runs.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="whitespace-nowrap py-1.5 pr-3 tabular-nums">{formatDateTime(r.started_at)}</td>
                  <td className="py-1.5 pr-3">{sourceName(r.source_id)}</td>
                  <td className="py-1.5 pr-3"><StatusBadge status={r.status} /></td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{formatNumber(r.records_fetched)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{formatNumber(r.records_upserted)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">
                    {r.finished_at ? `${Math.max(0, Math.round((Date.parse(r.finished_at) - Date.parse(r.started_at)) / 1000))} s` : "—"}
                  </td>
                  <td className="py-1.5 text-xs text-muted">{r.error ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
