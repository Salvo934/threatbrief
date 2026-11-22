import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader, Skeleton } from "@/components/ui/primitives";
import { listGroups } from "@/lib/data/attack";
import { getVictimsSince } from "@/lib/data/ransomware";
import { SECTORS, formatNumber } from "@/lib/format";
import { isoMonthsAgoStart } from "@/lib/kev-stats";

export const metadata: Metadata = { title: "Settori" };

export default function SettoriPage() {
  return (
    <>
      <PageHeader title="Settori italiani">
        Per ogni settore: attori ATT&CK che lo hanno colpito, tecniche più usate, mitigazioni prioritarie con la misura
        NIS2 corrispondente e rivendicazioni ransomware contro organizzazioni italiane.
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Grid />
      </Suspense>
    </>
  );
}

async function Grid() {
  await connection(); // la finestra di 12 mesi dipende dalla data della richiesta
  const since = isoMonthsAgoStart(new Date(), 12);
  const [groups, victims] = await Promise.all([listGroups({}), getVictimsSince(since)]);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {SECTORS.map((s) => {
        const actors = groups.filter((g) => g.sectors.includes(s.id)).length;
        const claims = victims.filter((v) => v.sector_id === s.id).length;
        return (
          <Link
            key={s.id}
            href={`/settori/${s.id}`}
            className="rounded-lg border border-line bg-surface px-4 py-3 hover:border-accent"
          >
            <div className="font-semibold">{s.name}</div>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted">
              <div>
                <dt>Attori ATT&CK</dt>
                <dd className="text-lg font-semibold text-fg tabular-nums">{formatNumber(actors)}</dd>
              </div>
              <div>
                <dt>Ransomware IT · 12 mesi</dt>
                <dd className="text-lg font-semibold text-fg tabular-nums">{s.id === "telco" ? "n.d." : formatNumber(claims)}</dd>
              </div>
            </dl>
          </Link>
        );
      })}
    </div>
  );
}
