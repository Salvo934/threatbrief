import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, PageHeader, Skeleton } from "@/components/ui/primitives";
import { getMitigatesLinks, getMitigations } from "@/lib/data/mitigations";
import { formatDate } from "@/lib/format";
import { NIS2, measureRef, mitigationsForMeasure } from "@/lib/nis2/mapping";
import { SubNav, SETTORI_TABS } from "@/components/ui/sub-nav";

export const metadata: Metadata = { title: "Mitigazioni e NIS2" };

export default function MitigazioniPage() {
  return (
    <>
      <SubNav items={SETTORI_TABS} current="/mitigazioni" />
      <PageHeader title="Mitigazioni e misure NIS2">
        Le mitigazioni MITRE ATT&CK collegate alle misure minime dell&apos;
        <a href={NIS2.source.url} target="_blank" rel="noreferrer" className="underline">
          art. 24, comma 2, D.Lgs. 138/2024
        </a>{" "}
        (recepimento NIS2). Il testo delle lettere è quello ufficiale; l&apos;abbinamento con ATT&CK è una{" "}
        <strong>valutazione di questo progetto</strong> (versione {NIS2.version}), non una tabella ACN: serve a dare
        priorità, non a dimostrare la conformità.
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-[600px]" />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const [mitigations, links] = await Promise.all([getMitigations(), getMitigatesLinks()]);
  const byExt = new Map(mitigations.map((m) => [m.external_id, m]));
  const covered = new Map<string, number>();
  for (const l of links) covered.set(l.mitigation_id, (covered.get(l.mitigation_id) ?? 0) + 1);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {NIS2.measures.map((measure) => {
          const mapped = mitigationsForMeasure(measure.id).filter((m) => byExt.has(m.mitigation));
          return (
            <Card
              key={measure.id}
              title={
                <span id={`lett-${measure.id}`} className="scroll-mt-20">
                  Lett. {measure.id}) {measure.short}
                </span>
              }
              action={<Badge>{mapped.length} mitigazioni</Badge>}
            >
              <blockquote className="border-l-2 border-line pl-3 text-xs italic text-muted">
                &laquo;{measure.text}&raquo; — {measureRef(measure.id)}
              </blockquote>
              {mapped.length === 0 ? (
                <p className="mt-3 text-sm text-muted">{measure.id === "d" ? NIS2.unmappedNote : "Nessuna mitigazione ATT&CK associata."}</p>
              ) : (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {mapped.map((m) => {
                    const mit = byExt.get(m.mitigation)!;
                    return (
                      <li key={m.mitigation}>
                        <Link href={`/mitigazioni/${m.mitigation}`} className="font-medium hover:underline">
                          {mit.name}
                        </Link>{" "}
                        <span className="font-mono text-xs text-muted">{m.mitigation}</span>{" "}
                        <span className="text-xs text-muted tabular-nums">· {covered.get(mit.id) ?? 0} tecniche</span>
                        <span className="block text-xs text-muted">{m.rationale}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        Fonte normativa: {NIS2.source.title}, testo in vigore dal {formatDate(NIS2.source.in_force_since)}, consultato il{" "}
        {formatDate(NIS2.source.retrieved)} su Normattiva. Mappatura in <code>data/nis2-mapping.json</code>, versionata
        con il codice. M1055 (Do Not Mitigate) e M1056 (Pre-compromise) non sono associate: non sono controlli che il
        soggetto può applicare sui propri sistemi.
      </p>
    </div>
  );
}
