import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActionForm } from "@/components/report/action-form";
import { Field, inputClass } from "@/components/report/fields";
import { TlpLabel } from "@/components/report/tlp";
import { Badge, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { listOwn } from "@/lib/data/reports";
import { SECTORS, formatDateTime } from "@/lib/format";
import { publicDb } from "@/lib/supabase/public";
import { getViewer, sessionDb } from "@/lib/supabase/server";
import { createReport } from "./actions";

export const metadata: Metadata = { title: "I miei report" };

const STATUS = { draft: "bozza", final: "finale", published: "pubblicato" } as const;

export default function ReportListPage() {
  return (
    <>
      <PageHeader title="I miei report">
        Area dell&apos;analista: crea e modifica report. Quelli pubblicati (solo TLP:CLEAR) compaiono su{" "}
        <Link href="/briefs" className="underline">/briefs</Link> e nel feed RSS.
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const viewer = await getViewer();
  if (!viewer?.isAnalyst) {
    return (
      <EmptyState>
        Quest&apos;area è riservata all&apos;analista. I report pubblicati sono su <Link href="/briefs" className="underline">/briefs</Link>
        {!viewer && <> · <Link href="/login?next=/report" className="underline">Accedi</Link></>}.
      </EmptyState>
    );
  }
  const [reports, groups] = await Promise.all([
    listOwn(await sessionDb(), viewer.userId),
    publicDb().from("v_group_summary").select("id, external_id, name").order("name"),
  ]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title={`Report (${reports.length})`} className="lg:col-span-2">
        {reports.length === 0 ? (
          <p className="text-sm text-muted">Nessun report: creane uno con il modulo qui accanto.</p>
        ) : (
          <ul className="divide-y divide-line">
            {reports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <Link href={`/report/${r.id}`} className="font-medium hover:underline">{r.title}</Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <TlpLabel tlp={r.tlp} />
                    <Badge tone={r.status === "published" ? "accent" : "neutral"}>{STATUS[r.status]}</Badge>
                    {r.auto_generated && <Badge tone="warn">bozza automatica</Badge>}
                    modificato {formatDateTime(r.updated_at)}
                  </div>
                </div>
                {r.status === "published" && <Link href={`/briefs/${r.slug}`} className="text-xs text-accent hover:underline">Vedi su /briefs →</Link>}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Nuovo report">
        <ActionForm action={createReport} submit="Crea bozza">
          <Field label="Titolo"><input name="title" required maxLength={200} className={inputClass} /></Field>
          <Field label="Tipo" hint="Il soggetto si sceglie nel campo corrispondente al tipo.">
            <select name="kind" className={inputClass} defaultValue="attore">
              <option value="attore">Profilo attore</option>
              <option value="settore">Analisi di settore</option>
              <option value="evento">Evento</option>
            </select>
          </Field>
          <Field label="Attore (se tipo = attore)">
            <select name="subject_attore" className={inputClass} defaultValue="">
              <option value="">—</option>
              {(groups.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.name} ({g.external_id})</option>)}
            </select>
          </Field>
          <Field label="Settore (se tipo = settore)">
            <select name="subject_settore" className={inputClass} defaultValue="">
              <option value="">—</option>
              {SECTORS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Evento (se tipo = evento)">
            <input name="subject_evento" maxLength={300} placeholder="es. Campagna phishing a tema fatture" className={inputClass} />
          </Field>
          <p className="text-xs text-muted">Parte come bozza TLP:AMBER: nessuno la vede finché non la pubblichi come TLP:CLEAR.</p>
        </ActionForm>
      </Card>
    </div>
  );
}
