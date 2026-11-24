import { stableUuid, stixPattern, TLP_MARKINGS } from "@/lib/report/stix";
import type { OsintLookup } from "@/lib/osint/export";
import { getViewer, sessionDb } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONFIDENCE: Record<string, number> = { malevolo: 85, sospetto: 50, "nessuna evidenza": 15 };

/** STIX 2.1 di un'indagine OSINT: indicatore (se malevolo o sospetto) e nota con giudizio, segnali e fonti. */
export async function GET(_req: Request, ctx: RouteContext<"/osint/[id]/stix">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response("Non trovato", { status: 404 });
  const viewer = await getViewer();
  if (!viewer?.isAnalyst) return new Response("Riservato all'analista", { status: 403 });
  const { data } = await (await sessionDb()).from("osint_lookups").select("*").eq("id", id).maybeSingle();
  if (!data) return new Response("Non trovato", { status: 404 });
  const l = data as OsintLookup;
  const ind = (l.result.indicator ?? {}) as { kind?: string; value?: string };
  const created = new Date(l.created_at).toISOString();
  const identity = { type: "identity", spec_version: "2.1", id: `identity--${stableUuid("identity|ThreatBrief")}`, created, modified: created, name: "ThreatBrief", identity_class: "organization" };
  const pattern = ind.kind && ind.value ? stixPattern(ind.kind, ind.value) : null;
  const indicator = pattern && l.verdict !== "nessuna evidenza" ? {
    type: "indicator", spec_version: "2.1", id: `indicator--${stableUuid(`osint|${l.id}`)}`, created, modified: created,
    created_by_ref: identity.id, name: `${ind.value}`, pattern, pattern_type: "stix", valid_from: created,
    indicator_types: [l.verdict === "malevolo" ? "malicious-activity" : "anomalous-activity"],
    confidence: CONFIDENCE[l.verdict] ?? 15, object_marking_refs: [TLP_MARKINGS.CLEAR],
  } : null;
  const note = {
    type: "note", spec_version: "2.1", id: `note--${stableUuid(`osint-note|${l.id}`)}`, created, modified: created, created_by_ref: identity.id,
    abstract: `Indagine OSINT passiva: ${l.verdict} (Admiralty ${l.admiralty})`,
    content: [
      `Giudizio: ${l.verdict} (Admiralty ${l.admiralty}).`,
      ...l.signals.map((s) => `- [${s.level}] ${s.text} (fonte: ${s.source})`),
      "Fonti consultate:",
      ...l.sources.map((s) => `- ${s.name}: ${s.url} (${s.fetched_at}, ${s.ok ? "ok" : "errore"})`),
      l.note ? `Nota dell'analista: ${l.note}` : "",
    ].filter(Boolean).join("\n"),
    object_refs: [indicator?.id ?? identity.id],
    object_marking_refs: [TLP_MARKINGS.CLEAR],
  };
  const bundle = { type: "bundle", id: `bundle--${stableUuid(`osint-bundle|${l.id}`)}`, objects: [identity, ...(indicator ? [indicator] : []), note] };
  return new Response(JSON.stringify(bundle, null, 2), {
    headers: { "content-type": "application/stix+json;version=2.1", "content-disposition": `attachment; filename="osint-${l.id.slice(0, 8)}.stix.json"`, "cache-control": "private, no-store" },
  });
}
