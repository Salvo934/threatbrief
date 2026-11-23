import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CountryList, MotivationBadges, SectorBadges } from "@/components/actors/attribute-badges";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { listGroups } from "@/lib/data/attack";
import { SECTORS, sectorName } from "@/lib/format";
import { SubNav, MINACCE_TABS } from "@/components/ui/sub-nav";

export const metadata: Metadata = { title: "Attori" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function AttoriPage(props: PageProps<"/attori">) {
  return (
    <>
      <SubNav items={MINACCE_TABS} current="/attori" />
      <PageHeader title="Threat actor">
        Gruppi documentati in MITRE ATT&CK Enterprise. Settori, paesi e motivazioni sono{" "}
        <strong>derivati automaticamente</strong> dalle descrizioni: la scheda di ogni attore mostra la frase da
        cui sono stati estratti.
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ActorTable searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function ActorTable({ searchParams }: { searchParams: PageProps<"/attori">["searchParams"] }) {
  const sp = await searchParams;
  const q = first(sp.q)?.slice(0, 60) ?? "";
  const sector = SECTORS.some((s) => s.id === first(sp.settore)) ? first(sp.settore) : undefined;
  const groups = await listGroups({ q, sector });

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-3" action="/attori">
        <label className="flex w-full flex-col gap-1 text-xs text-muted sm:w-auto">
          Cerca (nome, alias, ID)
          <input
            name="q"
            defaultValue={q}
            placeholder="es. APT28, Sandworm, G0016"
            className="w-full rounded-md sm:w-64 border border-line bg-surface px-2.5 py-1.5 text-sm text-fg"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Settore colpito
          <select
            name="settore"
            defaultValue={sector ?? ""}
            className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-fg"
          >
            <option value="">Tutti i settori</option>
            {SECTORS.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <button className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white">Filtra</button>
        {(q || sector) && (
          <Link href="/attori" className="py-1.5 text-sm text-muted underline">Azzera</Link>
        )}
        <span className="ml-auto py-1.5 text-sm text-muted tabular-nums">
          {groups.length} attori{sector ? ` · settore ${sectorName(sector)}` : ""}
        </span>
      </form>

      {groups.length === 0 ? (
        <EmptyState>Nessun attore corrisponde ai filtri. Se il database è vuoto, esegui l&apos;ingestion ATT&CK.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Attore</th>
                <th className="px-3 py-2 font-medium">Motivazione</th>
                <th className="px-3 py-2 font-medium">Settori</th>
                <th className="px-3 py-2 font-medium">Paesi colpiti</th>
                <th className="px-3 py-2 text-right font-medium">Tecniche</th>
                <th className="px-3 py-2 text-right font-medium">Software</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {groups.map((g) => (
                <tr key={g.id} className="align-top hover:bg-surface-2">
                  <td className="px-3 py-2">
                    <Link href={`/attori/${g.external_id}`} className="font-medium text-accent hover:underline">
                      {g.name}
                    </Link>
                    <span className="ml-2 font-mono text-xs text-muted">{g.external_id}</span>
                    {g.aliases.length > 0 && (
                      <div className="mt-0.5 line-clamp-1 max-w-sm text-xs text-muted" title={g.aliases.join(", ")}>
                        {g.aliases.join(", ")}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2"><MotivationBadges ids={g.motivations} /></td>
                  <td className="px-3 py-2"><SectorBadges ids={g.sectors} /></td>
                  <td className="px-3 py-2 text-xs"><CountryList codes={g.countries} /></td>
                  <td className="px-3 py-2 text-right tabular-nums">{g.technique_count}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{g.software_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
