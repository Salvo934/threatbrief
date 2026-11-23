import type { Metadata } from "next";
import { Suspense } from "react";
import { AttackMatrix, MatrixLegend } from "@/components/attack/attack-matrix";
import { ViewToggle } from "@/components/attack/view-toggle";
import { EmptyState, PageHeader, Skeleton, Stat } from "@/components/ui/primitives";
import { buildMatrix, overlapStats } from "@/lib/attack/matrix";
import { SubNav, MINACCE_TABS } from "@/components/ui/sub-nav";
import {
  getActiveTechniques,
  getGroupByExternalId,
  getGroupOptions,
  getGroupUsage,
  getTactics,
  toFlags,
} from "@/lib/data/attack";

export const metadata: Metadata = { title: "Matrice · confronto attori" };

type Props = PageProps<"/matrice">;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function MatricePage(props: Props) {
  return (
    <>
      <SubNav items={MINACCE_TABS} current="/matrice" />
      <PageHeader title="Matrice ATT&CK · confronto tra due attori">
        Sovrappone le tecniche di due gruppi per evidenziare TTP comuni (utili per detection condivise) ed
        esclusive (utili per distinguere un attore dall&apos;altro).
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-[600px]" />}>
        <Compare searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Compare({ searchParams }: { searchParams: Props["searchParams"] }) {
  const sp = await searchParams;
  const aId = first(sp.a);
  const bId = first(sp.b);
  const onlyUsed = first(sp.vista) !== "completa"; // nel confronto la vista compatta è più leggibile

  const [options, groupA, groupB] = await Promise.all([
    getGroupOptions(),
    aId ? getGroupByExternalId(aId) : null,
    bId ? getGroupByExternalId(bId) : null,
  ]);

  const selector = (
    <form action="/matrice" className="flex flex-wrap items-end gap-3">
      {(["a", "b"] as const).map((k) => (
        <label key={k} className="flex w-full flex-col gap-1 text-xs text-muted sm:w-auto">
          Attore {k.toUpperCase()}
          <select
            name={k}
            defaultValue={(k === "a" ? groupA : groupB)?.external_id ?? ""}
            className="w-full rounded-md sm:w-64 border border-line bg-surface px-2.5 py-1.5 text-sm text-fg"
          >
            <option value="">Seleziona…</option>
            {options.map((o) => (
              <option key={o.external_id} value={o.external_id}>{o.name} ({o.external_id})</option>
            ))}
          </select>
        </label>
      ))}
      <input type="hidden" name="vista" value={onlyUsed ? "usate" : "completa"} />
      <button className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white">Confronta</button>
    </form>
  );

  if (!groupA || !groupB) {
    return (
      <div className="space-y-4">
        {selector}
        <EmptyState>Scegli due attori da confrontare.</EmptyState>
      </div>
    );
  }

  const [tactics, techniques, usageA, usageB] = await Promise.all([
    getTactics(),
    getActiveTechniques(),
    getGroupUsage(groupA.id),
    getGroupUsage(groupB.id),
  ]);
  const flags = toFlags(techniques, usageA, usageB);
  const stats = overlapStats(buildMatrix(tactics, techniques, flags));
  const columns = buildMatrix(tactics, techniques, flags, { onlyUsed });

  return (
    <div className="space-y-4">
      {selector}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="In comune (A+B)" value={stats.both} />
        <Stat label={`Solo ${groupA.name}`} value={stats.onlyA} />
        <Stat label={`Solo ${groupB.name}`} value={stats.onlyB} />
        <Stat
          label="Similarità (Jaccard)"
          value={`${Math.round(stats.jaccard * 100)}%`}
          hint="tecniche comuni / tecniche totali"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MatrixLegend mode="compare" nameA={groupA.name} nameB={groupB.name} />
        <ViewToggle base="/matrice" params={{ a: groupA.external_id, b: groupB.external_id }} onlyUsed={onlyUsed} />
      </div>
      <AttackMatrix columns={columns} mode="compare" />
      <p className="text-xs text-muted">
        Conteggi sulle tecniche padre, includendo l&apos;uso tramite software. Una sovrapposizione alta non implica
        un legame tra gli attori: molte tecniche (es. PowerShell, phishing) sono comuni a quasi tutti.
      </p>
    </div>
  );
}
