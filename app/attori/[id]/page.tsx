import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AttackMatrix, MatrixLegend } from "@/components/attack/attack-matrix";
import { ViewToggle } from "@/components/attack/view-toggle";
import { RankedMitigations } from "@/components/mitigations/ranked-mitigations";
import { Badge, Card, PageHeader, Skeleton } from "@/components/ui/primitives";
import { buildMatrix } from "@/lib/attack/matrix";
import { cleanAttackText } from "@/lib/attack/text";
import {
  getActiveTechniques,
  getGroupAttributes,
  getGroupByExternalId,
  getGroupProcedures,
  getGroupSoftware,
  getGroupUsage,
  getTactics,
  toFlags,
} from "@/lib/data/attack";
import { rankForTechniques } from "@/lib/data/mitigations";
import type { ActorAttribute } from "@/lib/db/types";
import { countryName, formatDate, motivationName, sectorName } from "@/lib/format";

type Props = PageProps<"/attori/[id]">;

export default function AttorePage(props: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-[600px]" />}>
      <Actor params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

const METHOD_LABEL: Record<ActorAttribute["method"], string> = {
  fonte: "dichiarato dalla fonte",
  derivato: "derivato automaticamente",
  analista: "valutazione analista",
};

function attributeLabel(a: ActorAttribute) {
  if (a.attribute === "settore") return sectorName(a.value);
  if (a.attribute === "paese") return countryName(a.value);
  return motivationName(a.value);
}

async function Actor({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const { id } = await params;
  const sp = await searchParams;
  const onlyUsed = sp.vista === "usate";

  const group = await getGroupByExternalId(id);
  if (!group) notFound();

  const [tactics, techniques, usage, attributes, software] = await Promise.all([
    getTactics(),
    getActiveTechniques(),
    getGroupUsage(group.id),
    getGroupAttributes(group.id),
    getGroupSoftware(group.id),
  ]);
  const [procedures, mitigations] = await Promise.all([
    getGroupProcedures(group.id, techniques),
    rankForTechniques(new Map([...usage.keys()].map((t) => [t, 1]))),
  ]);
  const columns = buildMatrix(tactics, techniques, toFlags(techniques, usage), { onlyUsed });
  const direct = [...usage.values()].filter((u) => u === "diretta").length;

  const byAttr = (k: ActorAttribute["attribute"]) => attributes.filter((a) => a.attribute === k);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/attori" className="text-sm text-muted hover:underline">← Attori</Link>
        <PageHeader
          title={
            <>
              {group.name} <span className="font-mono text-base font-normal text-muted">{group.external_id}</span>
            </>
          }
        >
          {group.aliases.length > 0 && <>Alias: {group.aliases.join(", ")}. </>}
          Ultima modifica ATT&CK: {formatDate(group.modified_at)}.{" "}
          {group.url && (
            <a href={group.url} target="_blank" rel="noreferrer" className="underline">Scheda MITRE</a>
          )}
        </PageHeader>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Descrizione (fonte: MITRE ATT&CK)" className="lg:col-span-2">
          <p className="whitespace-pre-line text-sm leading-relaxed">{cleanAttackText(group.description)}</p>
        </Card>
        <Card title="Profilo">
          <dl className="space-y-3 text-sm">
            {(["motivazione", "settore", "paese"] as const).map((k) => (
              <div key={k}>
                <dt className="text-xs capitalize text-muted">{k === "paese" ? "Paesi colpiti" : k === "settore" ? "Settori colpiti" : "Motivazione"}</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {byAttr(k).length === 0 ? (
                    <span className="text-muted">Non indicato nella fonte</span>
                  ) : (
                    byAttr(k).map((a) => (
                      <Badge
                        key={a.value + a.method}
                        tone={a.method === "derivato" ? "warn" : "accent"}
                        title={`${METHOD_LABEL[a.method]} · confidenza ${a.confidence ?? "n.d."}\nEvidenza: ${a.evidence ?? "—"}`}
                      >
                        {attributeLabel(a)}
                      </Badge>
                    ))
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-muted">
            <Badge tone="warn">giallo</Badge> = derivato automaticamente dal testo, confidenza bassa. Passa il mouse
            per vedere la frase di evidenza.
          </p>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Heatmap ATT&CK</h2>
            <p className="text-sm text-muted tabular-nums">
              {direct} tecniche con uso diretto documentato · {usage.size - direct} solo tramite software
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/matrice?a=${group.external_id}`} className="text-sm text-accent hover:underline">
              Confronta con un altro attore →
            </Link>
            <ViewToggle base={`/attori/${group.external_id}`} params={{}} onlyUsed={onlyUsed} />
          </div>
        </div>
        <MatrixLegend mode="single" />
        <AttackMatrix columns={columns} />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={`Procedure documentate (${procedures.length})`} className="lg:col-span-2">
          {procedures.length === 0 ? (
            <p className="text-sm text-muted">Nessuna procedura con uso diretto documentata.</p>
          ) : (
            <ul className="max-h-[520px] divide-y divide-line overflow-y-auto text-sm">
              {procedures.map((p) => (
                <li key={p.technique.id} className="py-2">
                  <a
                    href={`https://attack.mitre.org/techniques/${p.technique.external_id.replace(".", "/")}/`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium hover:underline"
                  >
                    <span className="font-mono text-xs text-muted">{p.technique.external_id}</span> {p.technique.name}
                  </a>
                  {p.description && <p className="mt-0.5 text-muted">{cleanAttackText(p.description)}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={`Software usato (${software.length})`}>
          {software.length === 0 ? (
            <p className="text-sm text-muted">Nessun software associato.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {software.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2">
                  <a href={s.url ?? undefined} target="_blank" rel="noreferrer" className="hover:underline">
                    {s.name} <span className="font-mono text-xs text-muted">{s.external_id}</span>
                  </a>
                  <Badge>{s.type}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Mitigazioni prioritarie contro questo attore">
        <RankedMitigations items={mitigations.slice(0, 10)} scoreLabel={(r) => `copre ${r.techniques} delle ${usage.size} tecniche usate`} />
        <p className="mt-3 text-xs text-muted">
          Ordinate per numero di tecniche dell&apos;attore che mitigano (fonte: relazioni &laquo;mitigates&raquo; ATT&CK).
          Le lettere NIS2 sono una <Link href="/mitigazioni" className="underline">mappatura del progetto</Link> sull&apos;art. 24, c. 2 D.Lgs. 138/2024.
        </p>
      </Card>
    </div>
  );
}
