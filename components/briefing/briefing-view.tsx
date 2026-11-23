import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { TlpLabel } from "@/components/report/tlp";
import type { Briefing } from "@/lib/data/briefings";

const TAG = {
  azione: { label: "Azione", cls: "bg-err text-white" },
  monitorare: { label: "Monitorare", cls: "bg-warn-bg text-warn-text" },
  info: { label: "Info", cls: "bg-surface-2 text-muted" },
} as const;

/** Briefing pubblico: al massimo 5 punti, ciascuno con fatti, perché conta e cosa fare. */
export function BriefingView({ briefing, compact = false }: { briefing: Briefing; compact?: boolean }) {
  const date = new Date(`${briefing.brief_date}T12:00:00Z`).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <article className="space-y-4">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <TlpLabel tlp="CLEAR" />
          <span className="capitalize">{date}</span>
        </div>
        {compact ? (
          <Link href={`/briefing/${briefing.brief_date}`} className="block text-lg font-semibold hover:underline">{briefing.title}</Link>
        ) : (
          <h1 className="text-2xl font-semibold tracking-tight">{briefing.title}</h1>
        )}
        {briefing.intro && <p className="text-sm text-muted">{briefing.intro}</p>}
      </header>
      <ol className="space-y-3">
        {briefing.items.map((item, i) => (
          <li key={i} className="rounded-lg border border-line bg-surface p-4">
            <div className="flex flex-wrap items-start gap-2">
              <span className="tabular-nums font-semibold text-muted">{i + 1}.</span>
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase ${TAG[item.priority].cls}`}>{TAG[item.priority].label}</span>
              <span className="font-medium">{item.title}</span>
            </div>
            {!compact && <p className="mt-2 text-sm">{item.facts}</p>}
            {item.relevance && <p className="mt-2 text-sm"><span className="font-medium">Perché conta: </span>{item.relevance}</p>}
            <p className="mt-1 text-sm"><span className="font-medium">Cosa fare: </span>{item.action ?? "nessuna azione, da seguire."}</p>
            {!compact && (
              <p className="mt-2 text-xs text-muted">
                Fonte:{" "}
                {item.source.url ? (
                  <a href={item.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-accent hover:underline">
                    {item.source.name} <ExternalLink aria-hidden className="size-3" />
                  </a>
                ) : (
                  item.source.name
                )}
              </p>
            )}
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted">
        Preparato a partire da una bozza automatica sui dati raccolti, rivisto e firmato dall&apos;analista: le priorità e le
        righe «perché conta» e «cosa fare» sono valutazioni dell&apos;analista. Le rivendicazioni ransomware non sono verificate.
      </p>
    </article>
  );
}
