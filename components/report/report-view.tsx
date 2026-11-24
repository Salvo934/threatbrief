import Link from "next/link";
import type { ReactNode } from "react";
import { RankedMitigations } from "@/components/mitigations/ranked-mitigations";
import { Badge, Card } from "@/components/ui/primitives";
import type { RankedMitigation } from "@/lib/attack/mitigations";
import { CONFIDENCE_LABEL } from "@/lib/report/admiralty";
import type { ReportFull } from "@/lib/report/types";
import { formatDate } from "@/lib/format";
import { DetectionRules } from "./detection-rules";
import { Sources } from "./sources";
import { Statements } from "./statements";
import { TlpLabel } from "./tlp";

export type ReportViewMode = "brief" | "tecnica";

const KIND_LABEL = { attore: "Profilo attore", settore: "Analisi di settore", evento: "Evento" } as const;
const RISK_TONE = { critico: "bg-err text-white", alto: "bg-warn-bg text-warn-text", medio: "bg-surface-2 text-fg", basso: "bg-surface-2 text-muted" } as const;

export function ReportView({ full, mode, base, actions, mitigations }: {
  full: ReportFull;
  mode: ReportViewMode;
  base: string;
  actions?: ReactNode;
  mitigations: RankedMitigation[];
}) {
  const { report: r } = full;
  return (
    <article className="space-y-5">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <TlpLabel tlp={r.tlp} />
          <Badge>{KIND_LABEL[r.kind]}</Badge>
          {r.is_example && <Badge tone="warn">ESEMPIO · contenuto dimostrativo</Badge>}
          {r.ai_assisted && <Badge title="Parti testuali scritte con IA dalla fonte citata e verificate dall'analista">redatto con IA, rivisto dall&apos;analista</Badge>}
          {r.status !== "published" && <Badge>{r.status === "draft" ? "bozza" : "finale, non pubblicato"}</Badge>}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{r.title}</h1>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
          <div>
            <dt className="inline">Soggetto: </dt>
            <dd className="inline text-fg">{full.subject.href ? <Link href={full.subject.href} className="hover:underline">{full.subject.label}</Link> : full.subject.label}</dd>
          </div>
          <div>
            <dt className="inline">Data: </dt>
            <dd className="inline text-fg">{formatDate(r.published_at ?? r.updated_at)}</dd>
          </div>
          <div>
            <dt className="inline">Confidenza complessiva: </dt>
            <dd className="inline text-fg">{CONFIDENCE_LABEL[r.confidence]}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Vista" className="inline-flex rounded-md border border-line p-0.5 text-sm">
            {(["brief", "tecnica"] as const).map((m) => (
              <Link
                key={m}
                href={m === "brief" ? base : `${base}?vista=tecnica`}
                aria-current={mode === m ? "page" : undefined}
                className={`rounded px-3 py-1 ${mode === m ? "bg-accent-soft font-medium text-accent" : "text-muted hover:text-fg"}`}
              >
                {m === "brief" ? "Brief esecutivo" : "Scheda tecnica"}
              </Link>
            ))}
          </nav>
          {actions}
        </div>
      </header>

      {mode === "brief" ? <Brief full={full} /> : <Technical full={full} mitigations={mitigations} />}

      <Card title="Fonti e valutazione Admiralty">
        <Sources sources={full.sources} />
        <p className="mt-3 text-xs text-muted">
          Codice Admiralty: lettera = affidabilità della fonte (A–F), numero = credibilità dell&apos;informazione (1–6).
          Passa il mouse sul codice per la spiegazione.
        </p>
      </Card>
    </article>
  );
}

function Brief({ full }: { full: ReportFull }) {
  const { report: r } = full;
  return (
    <div className="space-y-4">
      <Card title="In sintesi" action={r.exec_risk && <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${RISK_TONE[r.exec_risk]}`}>Rischio {r.exec_risk}</span>}>
        <p className="whitespace-pre-line text-sm leading-relaxed">{r.exec_summary || "—"}</p>
        {r.exec_impact && (
          <>
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Impatto per l&apos;organizzazione</h3>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{r.exec_impact}</p>
          </>
        )}
      </Card>
      <Card title="Fatti e valutazioni">
        <Statements items={full.statements.filter((s) => s.section === "executive")} sources={full.sources} />
      </Card>
      {r.exec_actions.length > 0 && (
        <Card title="Azioni consigliate">
          <ol className="list-decimal space-y-1.5 pl-5 text-sm">
            {r.exec_actions.map((a) => <li key={a}>{a}</li>)}
          </ol>
        </Card>
      )}
    </div>
  );
}

function Technical({ full, mitigations }: { full: ReportFull; mitigations: RankedMitigation[] }) {
  const tech = full.statements.filter((s) => s.section === "tecnica");
  return (
    <div className="space-y-4">
      {tech.length > 0 && (
        <Card title="Fatti e valutazioni tecniche">
          <Statements items={tech} sources={full.sources} />
        </Card>
      )}
      <Card title={`Tecniche ATT&CK (${full.techniques.length})`}>
        {full.techniques.length === 0 ? (
          <p className="text-sm text-muted">Nessuna tecnica indicata.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr><th className="py-1 pr-3 font-medium">ID</th><th className="py-1 pr-3 font-medium">Tecnica</th><th className="py-1 font-medium">Procedura osservata / note</th></tr>
            </thead>
            <tbody className="divide-y divide-line align-top">
              {full.techniques.map((t) => (
                <tr key={t.id}>
                  <td className="py-1.5 pr-3 font-mono text-xs">
                    <a href={`https://attack.mitre.org/techniques/${t.external_id.replace(".", "/")}/`} target="_blank" rel="noreferrer" className="hover:underline">{t.external_id}</a>
                  </td>
                  <td className="py-1.5 pr-3">{t.name}</td>
                  <td className="py-1.5 text-muted">{t.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {mitigations.length > 0 && (
        <Card title="Mitigazioni prioritarie e misure NIS2">
          <RankedMitigations items={mitigations} scoreLabel={(m) => `copre ${m.techniques} delle ${full.techniques.length} tecniche del report`} />
        </Card>
      )}
      <Card title={`Indicatori di compromissione (${full.iocs.length})`}>
        {full.iocs.length === 0 ? (
          <p className="text-sm text-muted">Nessun IOC allegato.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr><th className="py-1 pr-3 font-medium">Tipo</th><th className="py-1 pr-3 font-medium">Valore</th><th className="py-1 font-medium">Visto</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {full.iocs.map((i) => (
                  <tr key={i.id}>
                    <td className="py-1.5 pr-3 font-mono text-xs uppercase text-muted">{i.type}</td>
                    <td className="break-all py-1.5 pr-3 font-mono text-xs">{i.value}</td>
                    <td className="whitespace-nowrap py-1.5 text-xs tabular-nums text-muted">{formatDate(i.first_seen)} → {formatDate(i.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-muted">Valori &laquo;refanged&raquo;: non aprirli nel browser. Disponibili anche nell&apos;export STIX 2.1.</p>
      </Card>
      {full.report.tech_notes && (
        <Card title="Note tecniche (detection, contesto)">
          <p className="whitespace-pre-line text-sm leading-relaxed">{full.report.tech_notes}</p>
        </Card>
      )}
      {(full.rules?.length ?? 0) > 0 && (
        <Card title={`Regole di rilevamento Sigma (${full.rules!.length})`}>
          <DetectionRules rules={full.rules!} />
        </Card>
      )}
    </div>
  );
}
