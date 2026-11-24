import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActionForm, RemoveButton } from "@/components/report/action-form";
import { Field, inputClass } from "@/components/report/fields";
import { TlpLabel } from "@/components/report/tlp";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { loadReport } from "@/lib/data/reports";
import { CONFIDENCE_LABEL, CREDIBILITY, RELIABILITY, admiraltyCode } from "@/lib/report/admiralty";
import { EXEC_LIMITS, RISK_LEVELS, TLP_LEVELS, type ReportFull } from "@/lib/report/types";
import { publicationProblems } from "@/lib/report/validate";
import { getViewer, sessionDb } from "@/lib/supabase/server";
import {
  addIocs, addSource, addStatement, addTechniques, deleteIoc, deleteReport, deleteSource, deleteStatement,
  deleteTechnique, requestInvestigation, setStatus, updateReport,
} from "../actions";

type Props = PageProps<"/report/[id]">;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS = { draft: "bozza", final: "finale", published: "pubblicato su /briefs" } as const;

export default function ReportEditorPage(props: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-[800px]" />}>
      <Editor params={props.params} />
    </Suspense>
  );
}

async function Editor({ params }: Pick<Props, "params">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const viewer = await getViewer();
  if (!viewer?.isAnalyst) {
    return <EmptyState>Area riservata all&apos;analista. <Link href={`/login?next=/report/${id}`} className="underline">Accedi</Link></EmptyState>;
  }
  const db = await sessionDb();
  const full = await loadReport(db, { id });
  if (!full) notFound();
  const { report: r } = full;
  const problems = publicationProblems(full);
  const { data: investigations } = await db
    .from("investigations")
    .select("id, status, requested_at, finished_at, session_id, dossier_report_id, list_cost_usd, summary, error")
    .eq("report_id", r.id)
    .order("requested_at", { ascending: false })
    .limit(5);
  const openInvestigation = (investigations ?? []).some((i) => i.status === "richiesta" || i.status === "in_corso");
  const hidden = <input type="hidden" name="report_id" value={r.id} />;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Link href="/report" className="text-sm text-muted hover:underline">← I miei report</Link>
        <h1 className="text-2xl font-semibold tracking-tight">{r.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <TlpLabel tlp={r.tlp} />
          <Badge tone={r.status === "published" ? "accent" : "neutral"}>{STATUS[r.status]}</Badge>
          <span className="text-muted">Soggetto: {full.subject.label}</span>
          <span className="ml-auto flex gap-3">
            <Link href={`/report/${r.id}/anteprima`} className="text-accent hover:underline">Anteprima e PDF</Link>
            <a href={`/report/${r.id}/stix`} className="text-accent hover:underline" download>STIX 2.1</a>
            {r.status === "published" && <Link href={`/briefs/${r.slug}`} className="text-accent hover:underline">/briefs/{r.slug}</Link>}
          </span>
        </div>
      </div>

      {r.auto_generated && (
        <div className="rounded-lg border border-warn-bg bg-warn-bg/40 px-4 py-3 text-sm">
          <strong>Bozza creata automaticamente</strong> da un avviso ufficiale su difesa e aerospazio.{" "}
          {r.ai_assisted ? (
            <>
              Sintesi, impatto, azioni e fatti chiave sono <strong>scritti con IA</strong> usando solo il testo dell&apos;avviso: ogni
              fatto riporta la citazione originale, verificata automaticamente. Il rischio resta una regola esplicita.
            </>
          ) : (
            <>Fatti, tecniche e fonte vengono dall&apos;avviso; rischio, impatto e azioni sono <strong>suggerimenti da verificare</strong>.</>
          )}{" "}
          Controlla, correggi e poi pubblica: la pubblicazione resta una tua scelta.
        </div>
      )}

      <Card title="Approfondimento con l'agente investigatore">
        <div className="space-y-3 text-sm">
          <p className="text-muted">
            L&apos;agente parte dalla fonte del report, cerca conferme su siti autorizzati (agenzie governative, CERT, vendor
            affermati) e consegna un dossier come nuova bozza: ogni affermazione con citazione ricontrollata sulla pagina e
            codice Admiralty calcolato. Tetto di spesa: 2 dollari per indagine.
          </p>
          {(investigations ?? []).length > 0 && (
            <ul className="divide-y divide-line rounded-md border border-line">
              {(investigations ?? []).map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
                  <Badge tone={i.status === "completata" ? "accent" : i.status === "fallita" ? "warn" : "neutral"}>{i.status.replace("_", " ")}</Badge>
                  <span className="text-muted">{new Date(i.requested_at).toLocaleString("it-IT")}</span>
                  {i.summary && <span>{i.summary}</span>}
                  {i.error && <span className="text-err">{i.error}</span>}
                  {i.list_cost_usd != null && <span className="text-muted">${Number(i.list_cost_usd).toFixed(2)}</span>}
                  {i.dossier_report_id && <Link href={`/report/${i.dossier_report_id}`} className="text-accent hover:underline">Apri il dossier →</Link>}
                  {i.session_id && (
                    <a href={`https://platform.claude.com/workspaces/default/sessions/${i.session_id}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                      Sessione nella Console
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
          {openInvestigation ? (
            <p className="text-xs text-muted">Approfondimento in coda o in corso: aggiorna la pagina tra qualche minuto.</p>
          ) : (
            <ActionForm action={requestInvestigation} submit="Approfondisci">{hidden}</ActionForm>
          )}
        </div>
      </Card>

      <Card title="Stato e pubblicazione">
        {problems.length > 0 ? (
          <ul className="mb-3 list-disc space-y-0.5 pl-5 text-sm text-muted">
            {problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        ) : (
          <p className="mb-3 text-sm text-muted">Pronto per la pubblicazione su /briefs.</p>
        )}
        <div className="flex flex-wrap gap-3">
          {(["draft", "final", "published"] as const).filter((s) => s !== r.status).map((s) => (
            <ActionForm key={s} action={setStatus} submit={s === "published" ? "Pubblica su /briefs" : s === "final" ? "Segna come finale" : "Riporta in bozza"} className="flex items-center gap-2">
              {hidden}
              <input type="hidden" name="status" value={s} />
            </ActionForm>
          ))}
        </div>
      </Card>

      <MetaForm full={full} hidden={hidden} />
      <SourcesSection full={full} hidden={hidden} />
      <StatementsSection full={full} hidden={hidden} />
      <TechniquesSection full={full} hidden={hidden} />
      <IocsSection full={full} hidden={hidden} />

      <Card title="Elimina">
        <ActionForm action={deleteReport} submit="Elimina il report" danger confirm="Eliminare definitivamente il report con fonti, fatti, tecniche e IOC allegati?">
          {hidden}
          <p className="text-sm text-muted">Operazione definitiva: rimuove anche fonti, fatti/valutazioni e collegamenti.</p>
        </ActionForm>
      </Card>
    </div>
  );
}

function MetaForm({ full, hidden }: { full: ReportFull; hidden: React.ReactNode }) {
  const r = full.report;
  return (
    <Card title="Metadati e brief esecutivo">
      {/* key: dopo il salvataggio il form riparte dai valori aggiornati */}
      <ActionForm key={r.updated_at} action={updateReport} submit="Salva">
        {hidden}
        <Field label="Titolo"><input name="title" defaultValue={r.title} maxLength={200} className={inputClass} /></Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="TLP 2.0" hint="Solo TLP:CLEAR può essere pubblicato.">
            <select name="tlp" defaultValue={r.tlp} className={inputClass}>{TLP_LEVELS.map((t) => <option key={t} value={t}>TLP:{t}</option>)}</select>
          </Field>
          <Field label="Confidenza complessiva">
            <select name="confidence" defaultValue={r.confidence} className={inputClass}>
              {(["alto", "medio", "basso"] as const).map((c) => <option key={c} value={c}>{CONFIDENCE_LABEL[c]}</option>)}
            </select>
          </Field>
          <Field label="Livello di rischio">
            <select name="exec_risk" defaultValue={r.exec_risk ?? ""} className={inputClass}>
              <option value="">—</option>
              {RISK_LEVELS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Sintesi (linguaggio non tecnico)" hint={`Massimo ${EXEC_LIMITS.summary} caratteri: il brief deve stare in una pagina.`}>
          <textarea name="exec_summary" defaultValue={r.exec_summary ?? ""} maxLength={EXEC_LIMITS.summary} rows={5} className={inputClass} />
        </Field>
        <Field label="Impatto per l'organizzazione" hint={`Massimo ${EXEC_LIMITS.impact} caratteri.`}>
          <textarea name="exec_impact" defaultValue={r.exec_impact ?? ""} maxLength={EXEC_LIMITS.impact} rows={3} className={inputClass} />
        </Field>
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-muted">Azioni consigliate (massimo 3)</legend>
          {[0, 1, 2].map((i) => (
            <input key={i} name="exec_actions" defaultValue={r.exec_actions[i] ?? ""} maxLength={EXEC_LIMITS.action} placeholder={`Azione ${i + 1}`} className={inputClass} />
          ))}
        </fieldset>
        <Field label="Note tecniche (scheda tecnica: detection, contesto)">
          <textarea name="tech_notes" defaultValue={r.tech_notes ?? ""} rows={4} className={inputClass} />
        </Field>
      </ActionForm>
    </Card>
  );
}

function SourcesSection({ full, hidden }: { full: ReportFull; hidden: React.ReactNode }) {
  return (
    <Card title={`Fonti (${full.sources.length})`}>
      {full.sources.length > 0 && (
        <ol className="mb-4 space-y-1.5 text-sm">
          {full.sources.map((s, i) => (
            <li key={s.id} className="flex items-start justify-between gap-3">
              <span>
                [{i + 1}] <span className="rounded border border-line px-1 font-mono text-xs">{admiraltyCode(s.reliability, s.credibility)}</span> {s.title}
                {s.publisher && <span className="text-muted"> · {s.publisher}</span>}
              </span>
              <RemoveButton action={deleteSource} fields={{ report_id: full.report.id, id: s.id }} />
            </li>
          ))}
        </ol>
      )}
      <ActionForm action={addSource} submit="Aggiungi fonte" className="grid gap-3 sm:grid-cols-2">
        {hidden}
        <Field label="Titolo"><input name="title" required maxLength={300} className={inputClass} /></Field>
        <Field label="Editore / organizzazione"><input name="publisher" maxLength={200} className={inputClass} /></Field>
        <Field label="URL"><input name="url" type="url" maxLength={1000} className={inputClass} /></Field>
        <Field label="Consultata il"><input name="accessed_at" type="date" className={inputClass} /></Field>
        <Field label="Affidabilità della fonte">
          <select name="reliability" defaultValue="B" className={inputClass}>
            {Object.entries(RELIABILITY).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
          </select>
        </Field>
        <Field label="Credibilità dell'informazione">
          <select name="credibility" defaultValue="2" className={inputClass}>
            {Object.entries(CREDIBILITY).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
          </select>
        </Field>
      </ActionForm>
    </Card>
  );
}

function StatementsSection({ full, hidden }: { full: ReportFull; hidden: React.ReactNode }) {
  const n = new Map(full.sources.map((s, i) => [s.id, i + 1]));
  return (
    <Card title="Fatti e valutazioni">
      {(["executive", "tecnica"] as const).map((section) => {
        const items = full.statements.filter((s) => s.section === section);
        if (!items.length) return null;
        return (
          <div key={section} className="mb-4">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{section === "executive" ? "Brief esecutivo" : "Scheda tecnica"}</h3>
            <ul className="space-y-1.5 text-sm">
              {items.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3">
                  <span>
                    <Badge tone={s.kind === "fatto" ? "accent" : "warn"}>
                      {s.kind === "fatto" ? `fatto [${n.get(s.source_id ?? "")}]` : `valutazione · ${s.confidence ? CONFIDENCE_LABEL[s.confidence] : "?"}`}
                    </Badge>{" "}
                    {s.body}
                  </span>
                  <RemoveButton action={deleteStatement} fields={{ report_id: full.report.id, id: s.id }} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <ActionForm action={addStatement} submit="Aggiungi" className="grid gap-3 sm:grid-cols-2">
        {hidden}
        <Field label="Sezione">
          <select name="section" className={inputClass}><option value="executive">Brief esecutivo</option><option value="tecnica">Scheda tecnica</option></select>
        </Field>
        <Field label="Tipo" hint="Fatto = verificabile, cita una fonte. Valutazione = giudizio dell'analista, con confidenza.">
          <select name="kind" className={inputClass}><option value="fatto">Fatto</option><option value="valutazione">Valutazione</option></select>
        </Field>
        <Field label="Fonte (per i fatti)">
          <select name="source_id" className={inputClass} defaultValue="">
            <option value="">—</option>
            {full.sources.map((s, i) => <option key={s.id} value={s.id}>[{i + 1}] {s.title}</option>)}
          </select>
        </Field>
        <Field label="Confidenza (per le valutazioni)">
          <select name="confidence" className={inputClass} defaultValue="">
            <option value="">—</option>
            {(["alto", "medio", "basso"] as const).map((c) => <option key={c} value={c}>{CONFIDENCE_LABEL[c]}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Testo" hint={`Nel brief esecutivo: massimo ${EXEC_LIMITS.statements} voci da ${EXEC_LIMITS.statementBody} caratteri.`}>
            <textarea name="body" required rows={3} maxLength={1500} className={inputClass} />
          </Field>
        </div>
      </ActionForm>
    </Card>
  );
}

function TechniquesSection({ full, hidden }: { full: ReportFull; hidden: React.ReactNode }) {
  return (
    <Card title={`Tecniche ATT&CK (${full.techniques.length})`}>
      {full.techniques.length > 0 && (
        <ul className="mb-4 space-y-1 text-sm">
          {full.techniques.map((t) => (
            <li key={t.id} className="flex items-start justify-between gap-3">
              <span><span className="font-mono text-xs text-muted">{t.external_id}</span> {t.name}{t.note && <span className="text-muted"> — {t.note}</span>}</span>
              <RemoveButton action={deleteTechnique} fields={{ report_id: full.report.id, technique_id: t.id }} />
            </li>
          ))}
        </ul>
      )}
      <ActionForm action={addTechniques} submit="Aggiungi tecniche" className="grid gap-3 sm:grid-cols-2">
        {hidden}
        <Field label="ID ATT&CK" hint="Uno o più, separati da spazi o virgole (es. T1566.001, T1059.001)."><input name="ids" required className={inputClass} /></Field>
        <Field label="Procedura osservata / nota (facoltativa)"><input name="note" maxLength={1000} className={inputClass} /></Field>
      </ActionForm>
    </Card>
  );
}

function IocsSection({ full, hidden }: { full: ReportFull; hidden: React.ReactNode }) {
  return (
    <Card title={`IOC allegati (${full.iocs.length})`}>
      {full.iocs.length > 0 && (
        <ul className="mb-4 space-y-1 text-sm">
          {full.iocs.map((i) => (
            <li key={i.id} className="flex items-start justify-between gap-3">
              <span className="break-all"><span className="font-mono text-xs uppercase text-muted">{i.type}</span> <span className="font-mono text-xs">{i.value}</span></span>
              <RemoveButton action={deleteIoc} fields={{ report_id: full.report.id, ioc_id: i.id }} />
            </li>
          ))}
        </ul>
      )}
      <ActionForm action={addIocs} submit="Allega IOC">
        {hidden}
        <Field label="Testo o lista di IOC" hint="Si allegano solo gli IOC già presenti nelle fonti raccolte: così ognuno ha una provenienza verificabile.">
          <textarea name="text" rows={4} className={`${inputClass} font-mono text-xs`} />
        </Field>
      </ActionForm>
    </Card>
  );
}
