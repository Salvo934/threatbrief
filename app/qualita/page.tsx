import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { getQualityRuns } from "@/lib/data/quality";
import { formatDateTime } from "@/lib/format";
import { AREA_LABEL, type QualityArea } from "@/lib/quality/rules";

export const metadata: Metadata = {
  title: "Qualità dei dati",
  description: "Ogni settimana un campione dei dati di ThreatBrief viene ricontrollato sulle fonti originali.",
};

const HOW: Record<QualityArea, string> = {
  kev: "10 CVE a caso confrontate con il catalogo ufficiale CISA (fornitore, prodotto, data, uso ransomware), più la copertura del catalogo.",
  attack: "3 gruppi a caso: nome e tecniche che attribuiamo devono comparire nella loro pagina di attack.mitre.org.",
  ransomware: "5 rivendicazioni italiane a caso: devono esistere ancora su ransomware.live con lo stesso gruppo e la stessa data.",
  threatfox: "10 indicatori a caso: devono esistere su ThreatFox con la stessa famiglia di malware.",
  citazioni: "15 citazioni «…» a caso da report, bozze e dossier: devono trovarsi parola per parola in una delle fonti del report.",
  csirt: "5 avvisi a caso: il link deve funzionare e la pagina deve contenere il titolo salvato.",
  freschezza: "Ogni fonte deve essersi aggiornata con successo entro il tempo previsto.",
};
const ORDER = Object.keys(AREA_LABEL) as QualityArea[];
const pct = (ok: number, n: number) => (n ? Math.round((ok / n) * 100) : 0);

export default function QualitaPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Qualità dei dati">
        I dati di ThreatBrief vengono da fonti esterne e da elaborazioni automatiche. Ogni lunedì uno script ne estrae un
        campione casuale e lo <strong>ricontrolla sulle fonti originali</strong>; qui c&apos;è il risultato, anomalie comprese.
        Ogni voce ha il link per verificarla anche a mano.
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const runs = await getQualityRuns();
  const last = runs[0];
  if (!last) return <EmptyState>Nessun controllo eseguito finora.</EmptyState>;
  const total = last.checks.length;
  const ok = last.checks.filter((c) => c.ok).length;
  const anomalies = last.checks.filter((c) => !c.ok);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2 rounded-lg border border-line bg-surface px-5 py-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">Ultimo controllo · {formatDateTime(last.run_at)}</div>
          <div className="text-3xl font-semibold tabular-nums">{ok}/{total} <span className="text-base font-normal text-muted">verifiche superate ({pct(ok, total)}%)</span></div>
        </div>
        {runs.length > 1 && (
          <div className="text-xs text-muted">
            Controlli precedenti:{" "}
            {runs.slice(1).map((r) => {
              const o = r.checks.filter((c) => c.ok).length;
              return <span key={r.run_at} className="mr-2 tabular-nums" title={formatDateTime(r.run_at)}>{pct(o, r.checks.length)}%</span>;
            })}
          </div>
        )}
      </div>

      {anomalies.length > 0 && (
        <Card title={`Anomalie da verificare (${anomalies.length})`}>
          <ul className="space-y-2 text-sm">
            {anomalies.map((c, i) => (
              <li key={i} className="flex gap-2">
                <XCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-err" />
                <div>
                  <span className="font-medium">{AREA_LABEL[c.area]} · {c.item}</span>
                  <div className="text-muted">{c.detail}</div>
                  {c.url && <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent hover:underline"><ExternalLink aria-hidden className="size-3" /> verifica sulla fonte</a>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {ORDER.filter((a) => last.summary[a]).map((a) => {
          const s = last.summary[a]!;
          const items = last.checks.filter((c) => c.area === a);
          return (
            <Card key={a} title={AREA_LABEL[a]} action={<span className={`text-sm font-semibold tabular-nums ${s.ok === s.checked ? "text-ok" : "text-err"}`}>{s.ok}/{s.checked}</span>}>
              <p className="mb-2 text-xs text-muted">{HOW[a]}</p>
              <details>
                <summary className="cursor-pointer text-xs text-accent">Vedi le singole verifiche</summary>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {items.map((c, i) => (
                    <li key={i} className="flex gap-1.5">
                      {c.ok ? <CheckCircle2 aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ok" /> : <XCircle aria-hidden className="mt-0.5 size-3.5 shrink-0 text-err" />}
                      <span>
                        <span className="font-medium">{c.item}</span> — {c.detail}{" "}
                        {c.url && <a href={c.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">fonte</a>}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted">
        Un controllo superato dice che <strong>la copia è fedele alla fonte</strong>, non che la fonte abbia ragione: una
        rivendicazione resta una dichiarazione non verificata anche se è copiata correttamente. Le elaborazioni (classifiche,
        bozze, valutazioni) restano da rivedere dall&apos;analista. Stato delle singole fonti: <Link href="/fonti" className="text-accent hover:underline">Fonti</Link>.
      </p>
    </div>
  );
}
