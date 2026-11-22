import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sectorName } from "@/lib/format";
import type { ReportFull, ReportIoc, ReportRow, ReportSource, ReportStatement, ReportTechnique } from "@/lib/report/types";

const REPORT_COLUMNS =
  "id, slug, title, kind, subject_group_id, subject_sector_id, subject_event, tlp, confidence, status, published_at, exec_risk, exec_summary, exec_impact, exec_actions, tech_notes, is_example, created_at, updated_at";

export type ReportListItem = Pick<
  ReportRow,
  "id" | "slug" | "title" | "kind" | "tlp" | "status" | "published_at" | "exec_risk" | "exec_summary" | "is_example" | "updated_at" | "confidence"
>;
const LIST_COLUMNS = "id, slug, title, kind, tlp, status, published_at, exec_risk, exec_summary, is_example, updated_at, confidence";

function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

/** Report pubblicati su /briefs (la RLS anon mostra solo published + TLP:CLEAR). */
export async function listPublished(db: SupabaseClient, limit = 50): Promise<ReportListItem[]> {
  const res = await db
    .from("reports")
    .select(LIST_COLUMNS)
    .eq("status", "published")
    .eq("tlp", "CLEAR")
    .order("published_at", { ascending: false })
    .limit(limit);
  return check(res, "report pubblicati");
}

/** Report dell'analista (tutti gli stati). */
export async function listOwn(db: SupabaseClient, userId: string): Promise<ReportListItem[]> {
  const res = await db.from("reports").select(LIST_COLUMNS).eq("owner_id", userId).order("updated_at", { ascending: false });
  return check(res, "i miei report");
}

/**
 * Report completo. Con il client pubblico si vedono solo i report pubblicati; con quello
 * di sessione anche le bozze dell'analista: lo decide la RLS, non questo codice.
 */
export async function loadReport(db: SupabaseClient, by: { slug: string } | { id: string }): Promise<ReportFull | null> {
  const q = db.from("reports").select(REPORT_COLUMNS);
  const res = await ("slug" in by ? q.eq("slug", by.slug) : q.eq("id", by.id)).maybeSingle();
  const report = check(res, "report") as ReportRow | null;
  if (!report) return null;

  const [sources, statements, techLinks, iocLinks, group] = await Promise.all([
    db.from("report_sources").select("id, title, url, publisher, reliability, credibility, accessed_at").eq("report_id", report.id).order("accessed_at").order("title"),
    db.from("report_statements").select("id, section, kind, body, source_id, confidence, position").eq("report_id", report.id).order("section").order("position"),
    db.from("report_techniques").select("technique_id, note").eq("report_id", report.id),
    db.from("report_iocs").select("ioc_id").eq("report_id", report.id),
    report.subject_group_id
      ? db.from("attack_groups").select("external_id, name").eq("id", report.subject_group_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const links = check(techLinks, "tecniche report") as { technique_id: string; note: string | null }[];
  const iocIds = (check(iocLinks, "IOC report") as { ioc_id: number }[]).map((l) => l.ioc_id);

  const [techs, iocs] = await Promise.all([
    links.length
      ? db.from("attack_techniques").select("id, external_id, name").in("id", links.map((l) => l.technique_id))
      : Promise.resolve({ data: [], error: null }),
    iocIds.length
      ? db.from("iocs").select("id, type, value, first_seen, last_seen").in("id", iocIds).order("type").order("value")
      : Promise.resolve({ data: [], error: null }),
  ]);
  const notes = new Map(links.map((l) => [l.technique_id, l.note]));
  const techniques: ReportTechnique[] = (check(techs, "nomi tecniche") as Omit<ReportTechnique, "note">[])
    .map((t) => ({ ...t, note: notes.get(t.id) ?? null }))
    .sort((a, b) => a.external_id.localeCompare(b.external_id));

  const g = check(group, "attore del report") as { external_id: string; name: string } | null;
  const subject =
    report.kind === "attore"
      ? { label: g?.name ?? "Attore", href: g ? `/attori/${g.external_id}` : null, externalId: g?.external_id ?? null }
      : report.kind === "settore"
        ? { label: sectorName(report.subject_sector_id ?? ""), href: `/settori/${report.subject_sector_id}`, externalId: null }
        : { label: report.subject_event ?? "Evento", href: null, externalId: null };

  return {
    report: { ...report, exec_actions: report.exec_actions ?? [] },
    subject,
    sources: check(sources, "fonti report") as ReportSource[],
    statements: check(statements, "fatti e valutazioni") as ReportStatement[],
    techniques,
    iocs: check(iocs, "IOC") as ReportIoc[],
  };
}
