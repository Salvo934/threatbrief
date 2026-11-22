"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { loadReport } from "@/lib/data/reports";
import { extractIocs } from "@/lib/ioc/extract";
import { publicationProblems, slugify } from "@/lib/report/validate";
import {
  CONFIDENCE_LEVELS,
  EXEC_LIMITS,
  REPORT_KINDS,
  RISK_LEVELS,
  TLP_LEVELS,
} from "@/lib/report/types";
import { SECTORS } from "@/lib/format";
import { getViewer, sessionDb } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (f: FormData, k: string, max = 5000) => String(f.get(k) ?? "").trim().slice(0, max);
const oneOf = <T extends string>(v: string, list: readonly T[]): T | null => ((list as readonly string[]).includes(v) ? (v as T) : null);

/** Ogni scrittura passa dalla RLS (owner + is_analyst); il controllo qui serve solo a dare un messaggio chiaro. */
async function analystDb() {
  const viewer = await getViewer();
  if (!viewer?.isAnalyst) throw new Error("Solo gli analisti autenticati possono modificare i report.");
  return { db: await sessionDb(), viewer };
}

async function guarded(fn: () => Promise<FormState>): Promise<FormState> {
  try {
    return await fn();
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e; // redirect()/notFound() di Next
    return { error: e instanceof Error ? e.message : "Operazione non riuscita." };
  }
}

function reportId(form: FormData) {
  const id = str(form, "report_id", 40);
  if (!UUID.test(id)) throw new Error("Report non valido.");
  return id;
}

export async function createReport(_prev: FormState, form: FormData): Promise<FormState> {
  return guarded(async () => {
    const { db, viewer } = await analystDb();
    const title = str(form, "title", 200);
    const kind = oneOf(str(form, "kind"), REPORT_KINDS);
    if (!title) return { error: "Serve un titolo." };
    if (!kind) return { error: "Tipo di report non valido." };
    const subject = str(form, `subject_${kind}`, 300);
    if (!subject) return { error: "Indica il soggetto del report." };
    if (kind === "settore" && !SECTORS.some((s) => s.id === subject)) return { error: "Settore non valido." };

    const base = slugify(title) || "report";
    let id: string | null = null;
    for (let attempt = 0; attempt < 3 && !id; attempt++) {
      const slug = attempt === 0 ? base : `${base}-${crypto.randomUUID().slice(0, 6)}`;
      const { data, error } = await db
        .from("reports")
        .insert({
          title,
          slug,
          kind,
          owner_id: viewer.userId,
          confidence: "medio",
          tlp: "AMBER",
          subject_group_id: kind === "attore" ? subject : null,
          subject_sector_id: kind === "settore" ? subject : null,
          subject_event: kind === "evento" ? subject : null,
        })
        .select("id")
        .single();
      if (data) id = data.id;
      else if (error?.code !== "23505") return { error: "Creazione non riuscita: controlla il soggetto scelto." };
    }
    if (!id) return { error: "Creazione non riuscita." };
    redirect(`/report/${id}`);
  });
}

export async function updateReport(_prev: FormState, form: FormData): Promise<FormState> {
  return guarded(async () => {
    const { db } = await analystDb();
    const id = reportId(form);
    const tlp = oneOf(str(form, "tlp"), TLP_LEVELS);
    const confidence = oneOf(str(form, "confidence"), CONFIDENCE_LEVELS);
    const risk = str(form, "exec_risk");
    const actions = form.getAll("exec_actions").map((a) => String(a).trim()).filter(Boolean);
    if (!tlp || !confidence) return { error: "TLP o confidenza non validi." };
    if (actions.length > EXEC_LIMITS.actions) return { error: "Al massimo 3 azioni." };
    const { data: current } = await db.from("reports").select("status").eq("id", id).single();
    if (current?.status === "published" && tlp !== "CLEAR") {
      return { error: "Un report pubblicato deve restare TLP:CLEAR: ritiralo prima di cambiare TLP." };
    }
    const { error } = await db
      .from("reports")
      .update({
        title: str(form, "title", 200) || undefined,
        tlp,
        confidence,
        exec_risk: risk ? oneOf(risk, RISK_LEVELS) : null,
        exec_summary: str(form, "exec_summary", EXEC_LIMITS.summary) || null,
        exec_impact: str(form, "exec_impact", EXEC_LIMITS.impact) || null,
        exec_actions: actions.map((a) => a.slice(0, EXEC_LIMITS.action)),
        tech_notes: str(form, "tech_notes", 8000) || null,
      })
      .eq("id", id);
    if (error) return { error: "Salvataggio non riuscito." };
    refresh();
    return { ok: "Salvato." };
  });
}

export async function setStatus(_prev: FormState, form: FormData): Promise<FormState> {
  return guarded(async () => {
    const { db } = await analystDb();
    const id = reportId(form);
    const status = str(form, "status");
    if (status === "published") {
      const full = await loadReport(db, { id });
      if (!full) return { error: "Report non trovato." };
      const problems = publicationProblems(full);
      if (problems.length) return { error: `Non pubblicabile: ${problems.join(" ")}` };
      const { error } = await db.from("reports").update({ status, published_at: new Date().toISOString() }).eq("id", id);
      if (error) return { error: "Pubblicazione non riuscita." };
      refresh();
      return { ok: "Pubblicato su /briefs." };
    }
    if (status !== "draft" && status !== "final") return { error: "Stato non valido." };
    const { error } = await db.from("reports").update({ status, published_at: null }).eq("id", id);
    if (error) return { error: "Aggiornamento non riuscito." };
    refresh();
    return { ok: status === "draft" ? "Riportato in bozza." : "Segnato come finale (non pubblicato)." };
  });
}

export async function deleteReport(_prev: FormState, form: FormData): Promise<FormState> {
  return guarded(async () => {
    const { db } = await analystDb();
    const { error } = await db.from("reports").delete().eq("id", reportId(form));
    if (error) return { error: "Eliminazione non riuscita." };
    redirect("/report");
  });
}

export async function addSource(_prev: FormState, form: FormData): Promise<FormState> {
  return guarded(async () => {
    const { db } = await analystDb();
    const title = str(form, "title", 300);
    const url = str(form, "url", 1000);
    const reliability = str(form, "reliability", 1);
    const credibility = Number(str(form, "credibility", 1));
    if (!title) return { error: "Serve il titolo della fonte." };
    if (url && !/^https?:\/\//i.test(url)) return { error: "L'URL deve iniziare con http:// o https://." };
    if (!/^[A-F]$/.test(reliability) || !(credibility >= 1 && credibility <= 6)) return { error: "Codice Admiralty non valido." };
    const { error } = await db.from("report_sources").insert({
      report_id: reportId(form),
      title,
      url: url || null,
      publisher: str(form, "publisher", 200) || null,
      reliability,
      credibility,
      accessed_at: str(form, "accessed_at", 10) || undefined,
    });
    if (error) return { error: "Fonte non salvata." };
    refresh();
    return { ok: "Fonte aggiunta." };
  });
}

export async function deleteSource(_prev: FormState, form: FormData): Promise<FormState> {
  return guarded(async () => {
    const { db } = await analystDb();
    const { error } = await db.from("report_sources").delete().eq("id", str(form, "id", 40)).eq("report_id", reportId(form));
    if (error) return { error: error.code === "23503" ? "La fonte è citata da un fatto: elimina prima il fatto." : "Eliminazione non riuscita." };
    refresh();
    return {};
  });
}

export async function addStatement(_prev: FormState, form: FormData): Promise<FormState> {
  return guarded(async () => {
    const { db } = await analystDb();
    const id = reportId(form);
    const section = str(form, "section") === "tecnica" ? "tecnica" : "executive";
    const kind = str(form, "kind") === "valutazione" ? "valutazione" : "fatto";
    const body = str(form, "body", 1500);
    const sourceId = str(form, "source_id", 40);
    const confidence = oneOf(str(form, "confidence"), CONFIDENCE_LEVELS);
    if (!body) return { error: "Scrivi il testo." };
    if (kind === "fatto" && !UUID.test(sourceId)) return { error: "Un fatto deve citare una fonte: aggiungila prima nella sezione Fonti." };
    if (kind === "valutazione" && !confidence) return { error: "Una valutazione deve dichiarare la confidenza." };
    if (section === "executive" && body.length > EXEC_LIMITS.statementBody) {
      return { error: `Nel brief esecutivo massimo ${EXEC_LIMITS.statementBody} caratteri: sposta i dettagli nella scheda tecnica.` };
    }
    const { count } = await db.from("report_statements").select("id", { count: "exact", head: true }).eq("report_id", id).eq("section", section);
    if (section === "executive" && (count ?? 0) >= EXEC_LIMITS.statements) {
      return { error: `Il brief esecutivo ammette al massimo ${EXEC_LIMITS.statements} fatti/valutazioni (deve stare in una pagina).` };
    }
    const { error } = await db.from("report_statements").insert({
      report_id: id,
      section,
      kind,
      body,
      source_id: kind === "fatto" ? sourceId : null,
      confidence: kind === "valutazione" ? confidence : null,
      position: count ?? 0,
    });
    if (error) return { error: "Non salvato." };
    refresh();
    return { ok: kind === "fatto" ? "Fatto aggiunto." : "Valutazione aggiunta." };
  });
}

export async function deleteStatement(_prev: FormState, form: FormData): Promise<FormState> {
  return guarded(async () => {
    const { db } = await analystDb();
    await db.from("report_statements").delete().eq("id", str(form, "id", 40)).eq("report_id", reportId(form));
    refresh();
    return {};
  });
}

export async function addTechniques(_prev: FormState, form: FormData): Promise<FormState> {
  return guarded(async () => {
    const { db } = await analystDb();
    const id = reportId(form);
    const ids = [...new Set(str(form, "ids", 2000).toUpperCase().match(/\bT\d{4}(?:\.\d{3})?\b/g) ?? [])];
    if (!ids.length) return { error: "Indica uno o più ID ATT&CK (es. T1566.001)." };
    const { data: techs } = await db.from("attack_techniques").select("id, external_id").in("external_id", ids).eq("revoked", false).eq("deprecated", false);
    const found = techs ?? [];
    const note = str(form, "note", 1000) || null;
    if (found.length) {
      const { error } = await db
        .from("report_techniques")
        .upsert(found.map((t) => ({ report_id: id, technique_id: t.id, note })), { onConflict: "report_id,technique_id" });
      if (error) return { error: "Tecniche non salvate." };
    }
    const missing = ids.filter((x) => !found.some((t) => t.external_id === x));
    refresh();
    return missing.length
      ? { error: `Aggiunte ${found.length}. Non trovate in ATT&CK (o revocate): ${missing.join(", ")}.` }
      : { ok: `Aggiunte ${found.length} tecniche.` };
  });
}

export async function deleteTechnique(_prev: FormState, form: FormData): Promise<FormState> {
  return guarded(async () => {
    const { db } = await analystDb();
    await db.from("report_techniques").delete().eq("report_id", reportId(form)).eq("technique_id", str(form, "technique_id", 100));
    refresh();
    return {};
  });
}

/**
 * Allega IOC al report: si possono allegare solo indicatori già raccolti dalle fonti
 * (il DB degli IOC lo scrive solo l'ingestion), così ogni IOC ha provenienza verificabile.
 */
export async function addIocs(_prev: FormState, form: FormData): Promise<FormState> {
  return guarded(async () => {
    const { db } = await analystDb();
    const id = reportId(form);
    const extracted = extractIocs(str(form, "text", 50_000)).slice(0, 200);
    if (!extracted.length) return { error: "Nessun IOC riconosciuto nel testo." };
    const { data: lookup, error: lookupError } = await db.rpc("lookup_iocs", { p_items: extracted.map(({ type, value }) => ({ type, value })) });
    if (lookupError) return { error: "Ricerca IOC non riuscita." };
    const known = (lookup as { ioc_id: number | null }[]).filter((r) => r.ioc_id).map((r) => r.ioc_id as number);
    if (known.length) {
      const { error } = await db.from("report_iocs").upsert(known.map((ioc_id) => ({ report_id: id, ioc_id })), { onConflict: "report_id,ioc_id" });
      if (error) return { error: "IOC non salvati." };
    }
    refresh();
    const skipped = extracted.length - known.length;
    return skipped
      ? { error: `Allegati ${known.length} IOC. ${skipped === 1 ? "1 indicatore non è" : `${skipped} indicatori non sono`} nelle fonti raccolte: non allegat${skipped === 1 ? "o" : "i"}.` }
      : { ok: `Allegati ${known.length} IOC.` };
  });
}

export async function deleteIoc(_prev: FormState, form: FormData): Promise<FormState> {
  return guarded(async () => {
    const { db } = await analystDb();
    await db.from("report_iocs").delete().eq("report_id", reportId(form)).eq("ioc_id", Number(str(form, "ioc_id", 20)));
    refresh();
    return {};
  });
}
