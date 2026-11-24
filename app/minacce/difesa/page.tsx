import { ExternalLink, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { MINACCE_TABS, SubNav } from "@/components/ui/sub-nav";
import { getDefenseAlerts } from "@/lib/data/defense";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Difesa e aerospazio" };

const STEPS = [
  ["Raccolta", "Ogni 6 ore l'app legge gli avvisi ufficiali della CISA, scritti con FBI, NSA e agenzie alleate (spesso anche italiane)."],
  ["Rilevamento", "Segnala quelli che citano la filiera della difesa, l'aerospazio, obiettivi militari o la NATO, ignorando le frasi di servizio."],
  ["Correlazione", "Collega attori citati, tecniche MITRE ATT&CK e CVE già sfruttate (catalogo KEV)."],
  ["Report", "Crea da sola una bozza di report con fatti e fonte, azioni prioritarie e contromisure D3FEND."],
  ["Revisione", "L'analista verifica e pubblica: il report va su /briefs, in PDF, in STIX 2.1 e sul server TAXII."],
] as const;

export default function DifesaPage() {
  return (
    <div className="space-y-5">
      <SubNav items={MINACCE_TABS} current="/minacce/difesa" />
      <PageHeader title="Difesa e aerospazio">
        Avvisi ufficiali sulle minacce alla filiera della difesa e dell&apos;aerospazio, rilevati automaticamente. Per ognuno
        l&apos;app prepara una bozza di report che l&apos;analista rivede e pubblica.
      </PageHeader>
      <ol className="grid gap-2 sm:grid-cols-5">
        {STEPS.map(([title, text], i) => (
          <li key={title} className="rounded-lg border border-line bg-surface p-3 text-xs">
            <div className="mb-1 text-sm font-semibold"><span className="text-accent">{i + 1}.</span> {title}</div>
            <p className="text-muted">{text}</p>
          </li>
        ))}
      </ol>
      <Suspense fallback={<Skeleton className="h-[600px]" />}>
        <Alerts />
      </Suspense>
    </div>
  );
}

async function Alerts() {
  const alerts = await getDefenseAlerts();
  if (!alerts.length) return <EmptyState>Nessun avviso rilevante rilevato finora.</EmptyState>;
  return (
    <div className="space-y-4">
      {alerts.map((a) => (
        <Card
          key={a.id}
          title={<span>{a.advisory.title}</span>}
          action={<span className="shrink-0 text-xs text-muted">{formatDate(a.advisory.published_at)}</span>}
        >
          <div className="space-y-3 text-sm">
            <div>
              <div className="mb-1 text-xs font-medium text-muted">Perché è rilevante (dal testo dell&apos;avviso)</div>
              <ul className="space-y-1.5">
                {a.reasons.map((r) => (
                  <li key={r.label}>
                    <span className="font-medium">L&apos;avviso {r.label}</span>
                    {r.evidence && <div className="text-xs italic text-muted">«{r.evidence}»</div>}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              {a.actors.length > 0 && (
                <span>
                  Attori citati:{" "}
                  {a.actors.map((x, i) => (
                    <span key={x.external_id}>
                      {i > 0 && ", "}
                      <Link href={`/attori/${x.external_id}`} className="text-accent hover:underline">{x.alias === x.name ? x.name : `${x.alias} (${x.name})`}</Link>
                    </span>
                  ))}
                </span>
              )}
              <span>{a.techniques} tecniche ATT&CK</span>
              {a.cves.length > 0 && (
                <span className="flex flex-wrap items-center gap-1">
                  CVE:
                  {a.cves.slice(0, 6).map((c) => (
                    <Badge key={c.id} tone={c.kev ? "warn" : "neutral"} title={c.kev ? "Già sfruttata (CISA KEV)" : undefined}>{c.id}</Badge>
                  ))}
                  {a.cves.length > 6 && <span className="text-muted">+{a.cves.length - 6}</span>}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 border-t border-line pt-3 text-xs">
              <a href={a.advisory.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                <ExternalLink aria-hidden className="size-3.5" /> Avviso originale
              </a>
              {a.reportSlug ? (
                <Link href={`/briefs/${a.reportSlug}`} className="inline-flex items-center gap-1 text-accent hover:underline">
                  <FileText aria-hidden className="size-3.5" /> Report dell&apos;analista (PDF, STIX)
                </Link>
              ) : (
                <span className="text-muted">Report in revisione dall&apos;analista</span>
              )}
            </div>
          </div>
        </Card>
      ))}
      <p className="text-xs text-muted">
        Fonte: CISA Cybersecurity Advisories (pubblico dominio, TLP:CLEAR). «Attori citati» significa che l&apos;avviso li nomina e
        che corrispondono a un gruppo MITRE ATT&CK: non è un&apos;attribuzione fatta dall&apos;app.
      </p>
    </div>
  );
}
