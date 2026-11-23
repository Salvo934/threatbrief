import { ArrowRight, BookOpenCheck } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BriefingView } from "@/components/briefing/briefing-view";
import { VictimsChart } from "@/components/ransomware/victims-chart";
import { TlpLabel } from "@/components/report/tlp";
import { Badge, Card, Skeleton, Stat } from "@/components/ui/primitives";
import { listBriefings } from "@/lib/data/briefings";
import { getCatalogCounts, getKevSince } from "@/lib/data/kev";
import { getVictimsSince } from "@/lib/data/ransomware";
import { listPublished } from "@/lib/data/reports";
import { formatDate, formatNumber } from "@/lib/format";
import { isoDaysAgo, isoMonthsAgoStart } from "@/lib/kev-stats";
import { victimsByMonth } from "@/lib/ransomware-stats";
import { publicDb } from "@/lib/supabase/public";
import { rankGroups } from "@/lib/threats/ranking";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">Cyber Threat Intelligence · Italia</p>
        <h1 className="max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">
          Cosa sta succedendo, chi colpisce le organizzazioni italiane e cosa fare.
        </h1>
        <p className="max-w-3xl text-sm text-muted">
          Fonti aperte raccolte in automatico, analisi su MITRE ATT&CK e D3FEND, report con TLP 2.0 ed export STIX 2.1 / TAXII.
          Demo pubblica in sola lettura: dati reali, contenuti dimostrativi marcati «esempio».
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/competenze" className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 font-medium text-white hover:opacity-90">
            <BookOpenCheck aria-hidden className="size-4" /> Cosa dimostra questo progetto
          </Link>
          <Link href="/minacce" className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 hover:bg-surface-2">
            Minacce principali <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </section>
      <Suspense fallback={<Skeleton className="h-[640px]" />}>
        <Overview />
      </Suspense>
    </div>
  );
}

async function Overview() {
  await connection(); // finestre temporali calcolate sulla data della richiesta
  const today = new Date();
  const since12 = isoMonthsAgoStart(today, 12);
  const [briefings, counts, kev, victims, reports] = await Promise.all([
    listBriefings(1),
    getCatalogCounts(),
    getKevSince(isoDaysAgo(today, 30)),
    getVictimsSince(isoMonthsAgoStart(today, 24)),
    listPublished(publicDb(), 3),
  ]);
  const last12 = victims.filter((v) => v.discovered_at >= since12);
  const top = rankGroups(victims, since12, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Rivendicazioni ransomware IT · 12 mesi" value={formatNumber(last12.length)} hint="ransomware.live, non verificate" />
        <Stat label="Nuove vulnerabilità sfruttate · 30 giorni" value={formatNumber(kev.length)} hint={`${kev.filter((k) => k.known_ransomware_use).length} usate dai ransomware (CISA KEV)`} />
        <Stat label="Threat actor documentati" value={formatNumber(counts.groups)} hint={`${formatNumber(counts.techniques)} tecniche ATT&CK`} />
        <Stat label="IOC in archivio" value={formatNumber(counts.iocs)} hint="deduplicati, ultimi 90 giorni" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card title="L'ultimo briefing" className="lg:col-span-3" action={<Link href="/briefing" className="text-xs text-accent hover:underline">Tutti →</Link>}>
          {briefings[0] ? (
            <BriefingView briefing={briefings[0]} compact />
          ) : (
            <p className="text-sm text-muted">Nessun briefing pubblicato ancora. Nel frattempo, guarda chi colpisce di più le organizzazioni italiane.</p>
          )}
        </Card>
        <div className="space-y-4 lg:col-span-2">
          <Card title="Chi colpisce l'Italia · 12 mesi" action={<Link href="/minacce" className="text-xs text-accent hover:underline">Dettagli →</Link>}>
            <ol className="space-y-1.5 text-sm">
              {top.map((r, i) => (
                <li key={r.group} className="flex items-center justify-between gap-3">
                  <span>
                    <span className="mr-2 tabular-nums text-muted">{i + 1}.</span>
                    {r.profile ? (
                      <Link href={`/minacce/${r.profile.slug}`} className="font-medium hover:underline">{r.profile.name}</Link>
                    ) : (
                      <span className="font-mono text-xs">{r.group}</span>
                    )}
                  </span>
                  <span className="tabular-nums text-muted">{r.current}</span>
                </li>
              ))}
            </ol>
          </Card>
          <Card title="Rivendicazioni per mese">
            <VictimsChart data={victimsByMonth(last12, today, 12)} label="Rivendicazioni ransomware contro organizzazioni italiane per mese, ultimi 12 mesi" />
          </Card>
        </div>
      </div>

      <Card title="Ultimi report" action={<Link href="/briefs" className="text-xs text-accent hover:underline">Tutti →</Link>}>
        <ul className="divide-y divide-line">
          {reports.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
              <TlpLabel tlp={r.tlp} />
              {r.is_example && <Badge tone="warn">ESEMPIO</Badge>}
              <Link href={`/briefs/${r.slug}`} className="font-medium hover:underline">{r.title}</Link>
              <span className="ml-auto text-xs text-muted">{formatDate(r.published_at)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
