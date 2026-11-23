import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { listBriefings } from "@/lib/data/briefings";

export const metadata: Metadata = { title: "Briefing" };

export default async function BriefingListPage() {
  const briefings = await listBriefings();
  return (
    <div className="space-y-5">
      <PageHeader title="Briefing">
        I punti più importanti del periodo per un&apos;organizzazione italiana: cosa è successo, perché conta, cosa fare. Al
        massimo cinque punti, scelti e commentati dall&apos;analista.
      </PageHeader>
      {briefings.length === 0 ? (
        <EmptyState>Nessun briefing pubblicato.</EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {briefings.map((b) => (
            <li key={b.brief_date} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
              <Link href={`/briefing/${b.brief_date}`} className="font-medium hover:underline">{b.title}</Link>
              <span className="text-xs text-muted">
                {new Date(`${b.brief_date}T12:00:00Z`).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })} · {b.items.length} punti
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
