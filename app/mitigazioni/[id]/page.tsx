import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, PageHeader, Skeleton } from "@/components/ui/primitives";
import { cleanAttackText } from "@/lib/attack/text";
import { getMitigatedTechniques, getMitigationByExternalId } from "@/lib/data/mitigations";
import { measureRef, nis2ForMitigation, nis2Measure } from "@/lib/nis2/mapping";

type Props = PageProps<"/mitigazioni/[id]">;

export default function MitigazionePage(props: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-[600px]" />}>
      <Detail params={props.params} />
    </Suspense>
  );
}

async function Detail({ params }: Pick<Props, "params">) {
  const { id } = await params;
  if (!/^M\d{4}$/i.test(id)) notFound();
  const mitigation = await getMitigationByExternalId(id);
  if (!mitigation) notFound();
  const techniques = await getMitigatedTechniques(mitigation.id);
  const nis2 = nis2ForMitigation(mitigation.external_id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/mitigazioni" className="text-sm text-muted hover:underline">← Mitigazioni</Link>
        <PageHeader
          title={
            <>
              {mitigation.name} <span className="font-mono text-base font-normal text-muted">{mitigation.external_id}</span>
            </>
          }
        >
          {mitigation.url && (
            <a href={mitigation.url} target="_blank" rel="noreferrer" className="underline">Scheda MITRE</a>
          )}
        </PageHeader>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Descrizione (fonte: MITRE ATT&CK)" className="lg:col-span-2">
          <p className="whitespace-pre-line text-sm leading-relaxed">{cleanAttackText(mitigation.description)}</p>
        </Card>
        <Card title="Misure NIS2 (D.Lgs. 138/2024)">
          {!nis2?.measures.length ? (
            <p className="text-sm text-muted">{nis2?.rationale ?? "Non associata a una misura dell'art. 24."}</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {nis2.measures.map((m) => (
                <li key={m}>
                  <Link href={`/mitigazioni#lett-${m}`} className="font-medium hover:underline">
                    {measureRef(m)} — {nis2Measure(m)?.short}
                  </Link>
                  <p className="mt-0.5 text-xs italic text-muted">&laquo;{nis2Measure(m)?.text}&raquo;</p>
                </li>
              ))}
              <li className="text-xs text-muted">Motivazione: {nis2.rationale}</li>
            </ul>
          )}
          <p className="mt-4 text-xs text-muted">Abbinamento = valutazione del progetto, non tabella ufficiale.</p>
        </Card>
      </div>

      <Card title={`Tecniche mitigate (${techniques.length})`}>
        {techniques.length === 0 ? (
          <p className="text-sm text-muted">Nessuna tecnica attiva collegata.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {techniques.map((t) => (
              <li key={t.id} className="py-2">
                <a
                  href={`https://attack.mitre.org/techniques/${t.external_id.replace(".", "/")}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium hover:underline"
                >
                  <span className="font-mono text-xs text-muted">{t.external_id}</span> {t.name}
                </a>
                {t.guidance && <p className="mt-0.5 text-muted">{cleanAttackText(t.guidance)}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
