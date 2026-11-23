import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge, Card, PageHeader, Skeleton } from "@/components/ui/primitives";
import { getRansomwareRanking } from "@/lib/data/threats";
import { formatDate, formatNumber } from "@/lib/format";
import { PROFILES } from "@/lib/threats/profiles";

export const metadata: Metadata = { title: "Minacce principali" };

export default function MinaccePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Minacce principali per l'Italia">
        Chi colpisce di più le organizzazioni italiane, cosa usa, come attacca e come difendersi. La classifica si basa sulle
        rivendicazioni ransomware raccolte da ransomware.live (dichiarazioni dei gruppi, <strong>non verificate</strong>); le
        schede descrivono i gruppi solo con fatti tratti da MITRE ATT&CK e dagli avvisi ufficiali CISA/FBI, in italiano.
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-[600px]" />}>
        <Content />
      </Suspense>
    </div>
  );
}

function Trend({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <Badge tone="warn">nuovo</Badge>;
  const delta = current - previous;
  const Icon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  return (
    <span className={`inline-flex items-center gap-0.5 tabular-nums ${delta > 0 ? "text-err" : delta < 0 ? "text-ok" : "text-muted"}`}>
      <Icon aria-hidden className="size-3.5" />
      {delta > 0 ? `+${delta}` : delta}
    </span>
  );
}

async function Content() {
  await connection(); // la finestra di 12 mesi dipende dalla data della richiesta
  const { ranking, total12, since12 } = await getRansomwareRanking(new Date());
  const top3 = ranking.slice(0, 3).reduce((s, r) => s + r.current, 0);

  return (
    <div className="space-y-6">
      <Card title={`Ransomware: i gruppi più attivi contro organizzazioni italiane`}>
        <p className="mb-3 text-sm text-muted">
          Dal {formatDate(since12)} a oggi: <strong className="text-fg">{formatNumber(total12)}</strong> rivendicazioni contro organizzazioni
          italiane; i primi tre gruppi ne contano {formatNumber(top3)} ({total12 ? Math.round((top3 / total12) * 100) : 0}%). La tendenza
          confronta con i 12 mesi precedenti.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-1.5 pr-3 font-medium">#</th>
                <th className="py-1.5 pr-3 font-medium">Gruppo</th>
                <th className="py-1.5 pr-3 text-right font-medium">12 mesi</th>
                <th className="py-1.5 pr-3 font-medium">Tendenza</th>
                <th className="py-1.5 pr-3 font-medium">Settore più colpito</th>
                <th className="py-1.5 font-medium">Scheda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ranking.map((r, i) => (
                <tr key={r.group}>
                  <td className="py-2 pr-3 tabular-nums text-muted">{i + 1}</td>
                  <td className="py-2 pr-3 font-medium">{r.profile?.name ?? <span className="font-mono text-xs">{r.group}</span>}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.current}</td>
                  <td className="py-2 pr-3 text-xs"><Trend current={r.current} previous={r.previous} /></td>
                  <td className="py-2 pr-3 text-muted">{r.topSector ?? "—"}</td>
                  <td className="py-2">
                    {r.profile ? (
                      <Link href={`/minacce/${r.profile.slug}`} className="inline-flex items-center gap-1 text-accent hover:underline">
                        Apri <ArrowRight aria-hidden className="size-3.5" />
                      </Link>
                    ) : (
                      <span className="text-xs text-muted" title="Il gruppo non è documentato in MITRE ATT&CK né in avvisi ufficiali tra le fonti del progetto">
                        nessuna fonte tecnica verificata
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          Le rivendicazioni sono dichiarazioni dei criminali: possono essere false o gonfiate, e chi paga spesso non compare. Il
          settore è quello assegnato da ransomware.live, tradotto in italiano. Per i gruppi senza scheda abbiamo solo i dati delle rivendicazioni: scrivere una
          descrizione tecnica senza fonti affidabili significherebbe inventarla.
        </p>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Le schede dettagliate</h2>
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {PROFILES.map((p) => (
            <li key={p.slug}>
              <Link href={`/minacce/${p.slug}`} className="flex h-full flex-col rounded-lg border border-line bg-surface p-4 hover:border-accent">
                <span className="flex items-center gap-2 font-semibold">
                  <ShieldAlert aria-hidden className="size-4 text-err" /> {p.name}
                </span>
                {p.aliases.length > 0 && <span className="mt-0.5 text-xs text-muted">alias: {p.aliases.join(", ")}</span>}
                <span className="mt-2 text-sm text-muted">{p.inShort}</span>
                <span className="mt-auto pt-3 text-xs text-accent">Come attacca e come difendersi →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Card title="E gli attori statali?">
        <p className="text-sm leading-relaxed">
          Per lo spionaggio e gli attacchi sponsorizzati da stati non esiste una fonte aperta che permetta una classifica affidabile
          «per l&apos;Italia»: le descrizioni di MITRE ATT&CK citano l&apos;Italia esplicitamente solo per pochissimi gruppi, e una
          classifica costruita su questo sarebbe fuorviante. Per capire quali attori statali contano per un&apos;organizzazione, parti dal
          suo <Link href="/settori" className="text-accent hover:underline">settore</Link> e dai{" "}
          <Link href="/attori" className="text-accent hover:underline">profili degli attori</Link>, oppure confrontane due nella{" "}
          <Link href="/matrice" className="text-accent hover:underline">matrice</Link>.
        </p>
      </Card>
    </div>
  );
}
