import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { KevChart } from "@/components/kev/kev-chart";
import { VictimsChart } from "@/components/ransomware/victims-chart";
import { TlpLabel } from "@/components/report/tlp";
import { Badge, Card, Skeleton, Stat } from "@/components/ui/primitives";
import { getCatalogCounts, getKevSince, getSourceStatuses } from "@/lib/data/kev";
import { getVictimsSince } from "@/lib/data/ransomware";
import { listPublished } from "@/lib/data/reports";
import { formatDate, formatNumber, sectorName } from "@/lib/format";
import { isoDaysAgo, isoMonthsAgoStart, kevByMonth } from "@/lib/kev-stats";
import { topGroups, victimsByMonth } from "@/lib/ransomware-stats";
import { publicDb } from "@/lib/supabase/public";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">Cyber Threat Intelligence · settori italiani</p>
        <h1 className="max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Dalle fonti aperte al brief per il CdA, in un unico flusso verificabile.
        </h1>
        <p className="max-w-3xl text-muted">
          ThreatBrief raccoglie automaticamente MITRE ATT&CK, CISA KEV, IOC di abuse.ch, alert di CSIRT Italia e rivendicazioni
          ransomware; collega attori, tecniche e mitigazioni alle misure NIS2 e produce report con TLP 2.0, codice Admiralty,
          fatti separati dalle valutazioni ed export PDF e STIX 2.1. È una demo pubblica in sola lettura: i dati sono reali e
          aggiornati, i contenuti dimostrativi sono marcati &laquo;esempio&raquo;.
        </p>
        <Cycle />
      </section>
      <Suspense fallback={<Skeleton className="h-[640px]" />}>
        <Overview />
      </Suspense>
    </div>
  );
}

const STEPS = [
  { n: "1", title: "Raccolta", text: "7 fonti aperte, ogni 6 ore, con stato ed errori visibili.", href: "/fonti", cta: "Fonti" },
  { n: "2", title: "Elaborazione", text: "IOC deduplicati, attori ATT&CK con settori e paesi derivati e verificabili.", href: "/attori", cta: "Attori" },
  { n: "3", title: "Analisi", text: "Matrice di confronto, dashboard di settore, analisi di testo e IOC.", href: "/settori", cta: "Settori" },
  { n: "4", title: "Diffusione", text: "Brief esecutivo e scheda tecnica, PDF, STIX 2.1 e feed RSS.", href: "/briefs", cta: "Briefs" },
];

function Cycle() {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((s) => (
        <li key={s.n}>
          <Link href={s.href} className="block h-full rounded-lg border border-line bg-surface p-4 hover:border-accent">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="grid size-6 place-items-center rounded-full bg-accent-soft text-xs text-accent">{s.n}</span>
              {s.title}
            </div>
            <p className="mt-2 text-sm text-muted">{s.text}</p>
            <span className="mt-2 inline-block text-xs text-accent">{s.cta} →</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

async function Overview() {
  await connection(); // le finestre temporali dipendono dalla data della richiesta
  const today = new Date();
  const since12 = isoMonthsAgoStart(today, 12);
  const [counts, kev12m, sources, victims, briefs] = await Promise.all([
    getCatalogCounts(),
    getKevSince(since12),
    getSourceStatuses(),
    getVictimsSince(since12),
    listPublished(publicDb(), 4),
  ]);
  const last30 = kev12m.filter((k) => k.date_added >= isoDaysAgo(today, 30));
  const failing = sources.filter((s) => s.last_status === "error" || s.last_status === "partial");
  const bySector = new Map<string, number>();
  for (const v of victims) if (v.sector_id) bySector.set(v.sector_id, (bySector.get(v.sector_id) ?? 0) + 1);
  const topSector = [...bySector.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Threat actor (ATT&CK)" value={<Link href="/attori" className="hover:underline">{formatNumber(counts.groups)}</Link>} hint={`${formatNumber(counts.techniques)} tecniche`} />
        <Stat label="IOC in archivio" value={formatNumber(counts.iocs)} hint="deduplicati, ultimi 90 giorni" />
        <Stat label="Nuove KEV · 30 giorni" value={formatNumber(last30.length)} hint={`${last30.filter((k) => k.known_ransomware_use).length} con uso ransomware noto`} />
        <Stat
          label="Rivendicazioni ransomware IT · 12 mesi"
          value={formatNumber(victims.length)}
          hint={topSector ? `settore più colpito: ${sectorName(topSector[0])}` : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Rivendicazioni ransomware contro organizzazioni italiane">
          <VictimsChart data={victimsByMonth(victims, today, 12)} label="Rivendicazioni ransomware contro organizzazioni italiane per mese, ultimi 12 mesi" />
          <p className="mt-2 text-xs text-muted">
            Gruppi più attivi: {topGroups(victims, 3).map((g) => `${g.group} (${g.count})`).join(", ")}. Fonte: ransomware.live,
            rivendicazioni non verificate.
          </p>
        </Card>
        <Card title="KEV aggiunte per mese">
          <KevChart data={kevByMonth(kev12m, today)} />
          <p className="mt-2 text-xs text-muted">Fonte: CISA Known Exploited Vulnerabilities, ultimi 12 mesi.</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card title="Ultimi briefs" className="lg:col-span-3" action={<Link href="/briefs" className="text-xs text-accent hover:underline">Tutti →</Link>}>
          <ul className="divide-y divide-line">
            {briefs.map((b) => (
              <li key={b.id} className="py-2.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <TlpLabel tlp={b.tlp} />
                  {b.is_example && <Badge tone="warn">ESEMPIO</Badge>}
                  <span className="text-muted">{formatDate(b.published_at)}</span>
                </div>
                <Link href={`/briefs/${b.slug}`} className="mt-1 block font-medium hover:underline">{b.title}</Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Stato delle fonti" className="lg:col-span-2" action={<Link href="/fonti" className="text-xs text-accent hover:underline">Dettagli →</Link>}>
          <ul className="space-y-1.5 text-sm">
            {sources.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3">
                <span>{s.name}</span>
                <StatusBadge status={s.last_status} />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            {failing.length === 0
              ? "Tutte le fonti attive hanno risposto all'ultima raccolta."
              : `${failing.map((s) => s.name).join(", ")}: ultima raccolta incompleta. Le altre fonti continuano.`}
          </p>
        </Card>
      </div>

      <Card title="Ultime vulnerabilità sfruttate (KEV)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-1.5 pr-3 font-medium">CVE</th>
                <th className="py-1.5 pr-3 font-medium">Prodotto</th>
                <th className="py-1.5 pr-3 font-medium">Vulnerabilità</th>
                <th className="py-1.5 pr-3 font-medium">Aggiunta</th>
                <th className="py-1.5 font-medium">Ransomware</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {kev12m.slice(0, 8).map((k) => (
                <tr key={k.cve_id} className="align-top">
                  <td className="py-1.5 pr-3 font-mono text-xs">
                    <a href={`https://nvd.nist.gov/vuln/detail/${k.cve_id}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">{k.cve_id}</a>
                  </td>
                  <td className="py-1.5 pr-3">{k.vendor_project} {k.product}</td>
                  <td className="py-1.5 pr-3 text-muted">{k.vulnerability_name}</td>
                  <td className="whitespace-nowrap py-1.5 pr-3 tabular-nums">{formatDate(k.date_added)}</td>
                  <td className="py-1.5">{k.known_ransomware_use ? <Badge tone="warn">noto</Badge> : <span className="text-muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === "ok") return <Badge tone="accent">ok</Badge>;
  if (status === "partial") return <Badge tone="warn">parziale</Badge>;
  if (status === "error") return <Badge tone="warn">errore</Badge>;
  if (status === "skipped") return <Badge>saltata</Badge>;
  if (status === "running") return <Badge>in corso</Badge>;
  return <Badge>in attesa</Badge>;
}
