/**
 * Edge Function «sigma»: propone regole di rilevamento Sigma per le tecniche ATT&CK di un report.
 * L'IA restituisce oggetti strutturati; rules.ts li valida (tecnica del report, logsource noto,
 * condizione coerente, IP e hash solo del report) e scrive lo YAML. Le regole valide sostituiscono
 * quelle precedenti del report. Solo per l'analista; chiave nei segreti di Supabase.
 */
import Anthropic from "npm:@anthropic-ai/sdk@1.7.0";
import { betaZodOutputFormat } from "npm:@anthropic-ai/sdk@1.7.0/helpers/beta/zod";
import { createClient } from "npm:@supabase/supabase-js@2.119.2";
import { z } from "npm:zod@4.6.7";
import { CATEGORIES, LEVELS, MODIFIERS, PRODUCTS, toYaml, validateRule, type SigmaRaw } from "./rules.ts";

const MODEL = "claude-opus-5-5";
const MAX_TECHNIQUES = 6;
const SITE = "https://threatbrief.salvo-bonavita9808.workers.dev";
const ALLOWED_ORIGINS = [SITE, "http://localhost:3100"];
const cors = (origin: string | null) => ({
  "access-control-allow-origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  vary: "origin",
});

const SYSTEM = `Sei un detection engineer. Scrivi regole Sigma per i log di un SOC, una per tecnica ATT&CK indicata, basate sul comportamento descritto nel report e sulla tua conoscenza della tecnica.
Regole:
- Solo le tecniche elencate. Se una tecnica non è rilevabile in modo sensato dai log (es. ricognizione esterna, acquisto di infrastruttura), saltala.
- logsource: product tra ${PRODUCTS.join(", ")}; category tra ${CATEGORIES.join(", ")}; oppure un service (es. security, sysmon, cloudtrail).
- Campi nello schema Sigma/Sysmon standard (Image, CommandLine, ParentImage, TargetFilename, DestinationIp, QueryName, EventID…). Modificatori ammessi: ${MODIFIERS.join(", ")}.
- Nomi delle selezioni in minuscolo (selection, selection_xxx, filter_xxx). Condizione con and/or/not, "1 of", "all of", parentesi e i soli nomi delle selezioni: niente aggregazioni.
- In una selezione ogni campo (con lo stesso modificatore) compare una sola volta: per due condizioni in AND sullo stesso campo usa due selezioni e uniscile nella condizione.
- IP pubblici e hash SOLO se presenti tra gli indicatori del report; mai inventarli.
- Preferisci regole comportamentali, robuste e con pochi falsi positivi; indica i falsi positivi realistici. Titolo in inglese come da convenzione Sigma, descrizione e falsi positivi in italiano.`;

const Rule = z.object({
  technique: z.string().describe("ID ATT&CK, uno di quelli forniti"),
  title: z.string().describe("Titolo breve in inglese, max 100 caratteri"),
  description: z.string().describe("Cosa rileva e perché, in italiano, max 400 caratteri"),
  logsource: z.object({ product: z.string().optional(), category: z.string().optional(), service: z.string().optional() }),
  selections: z.array(z.object({
    name: z.string(),
    fields: z.array(z.object({ field: z.string(), modifier: z.string().optional(), all: z.boolean().optional(), values: z.array(z.string()) })),
  })),
  condition: z.string(),
  falsepositives: z.array(z.string()),
  level: z.enum(LEVELS),
});
const Schema = z.object({ rules: z.array(Rule) });

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "content-type": "application/json" } });
  if (req.method !== "POST") return json({ error: "Metodo non consentito" }, 405);

  const auth = req.headers.get("authorization") ?? "";
  const apikey = req.headers.get("apikey") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const db = createClient(Deno.env.get("SUPABASE_URL")!, apikey, { global: { headers: { authorization: auth } } });
  let userId: string | undefined;
  try {
    userId = (JSON.parse(atob((auth.replace(/^Bearer\s+/i, "").split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/"))) as { sub?: string }).sub;
  } catch {
    userId = undefined;
  }
  if (!userId) return json({ error: "Accesso richiesto" }, 401);
  const { data: analyst } = await db.from("analysts").select("user_id").eq("user_id", userId).maybeSingle();
  if (!analyst) return json({ error: "Funzione riservata all'analista" }, 403);
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "IA non configurata: manca il segreto ANTHROPIC_API_KEY." }, 503);

  let reportId = "";
  try {
    reportId = String(((await req.json()) as { report_id?: unknown }).report_id ?? "");
  } catch {
    return json({ error: "Richiesta non valida" }, 400);
  }
  if (!/^[0-9a-f-]{36}$/.test(reportId)) return json({ error: "Report non valido" }, 400);

  const [{ data: report }, { data: techs }, { data: iocRows }] = await Promise.all([
    db.from("reports").select("id, slug, title, exec_summary, tech_notes").eq("id", reportId).maybeSingle(),
    db.from("report_techniques").select("technique_id, note").eq("report_id", reportId),
    db.from("report_iocs").select("iocs(type, value)").eq("report_id", reportId).limit(200),
  ]);
  if (!report) return json({ error: "Report non trovato" }, 404);
  // report_techniques.technique_id è l'ID STIX (attack-pattern--…), non il codice T
  const techIds = [...new Set((techs ?? []).map((t) => String(t.technique_id)))];
  if (!techIds.length) return json({ error: "Il report non ha tecniche ATT&CK: aggiungile prima." }, 422);
  const { data: names } = await db.from("attack_techniques").select("id, external_id, name, tactics").in("id", techIds).eq("revoked", false);
  // Prima le tecniche rilevabili dagli endpoint/rete (escluse ricognizione e preparazione risorse)
  const pre = new Set(["reconnaissance", "resource-development"]);
  const chosen = (names ?? [])
    .filter((t) => !(t.tactics as string[]).every((x) => pre.has(x)))
    .slice(0, MAX_TECHNIQUES);
  if (!chosen.length) return json({ error: "Le tecniche del report non sono rilevabili dai log (solo ricognizione o preparazione)." }, 422);
  const notes = new Map((techs ?? []).map((t) => [String(t.technique_id), t.note as string | null]));
  const iocs = (iocRows ?? []).map((r) => r.iocs as unknown as { type: string; value: string } | null).filter((x): x is { type: string; value: string } => !!x);

  const input = {
    report: { titolo: report.title, sintesi: String(report.exec_summary ?? "").slice(0, 1500), note_tecniche: String(report.tech_notes ?? "").slice(0, 2500) },
    tecniche: chosen.map((t) => ({ id: t.external_id, nome: t.name, tattiche: t.tactics, nota: notes.get(t.id as string) ?? null })),
    indicatori: iocs.slice(0, 60),
  };

  try {
    const client = new Anthropic({ apiKey: key });
    const res = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 12000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(Schema) },
      system: SYSTEM,
      messages: [{ role: "user", content: `Dati del report:\n${JSON.stringify(input)}` }],
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) return json({ error: "Il modello non ha prodotto regole." }, 422);

    const ctx = { techniques: new Set(chosen.map((t) => t.external_id as string)), iocs: new Set(iocs.map((i) => i.value.toLowerCase())) };
    const date = new Date().toISOString().slice(0, 10);
    const valid: { technique_id: string; title: string; level: string; logsource: string; yaml: string; model: string }[] = [];
    const rejected: { title: string; errors: string[] }[] = [];
    for (const raw of res.parsed_output.rules as SigmaRaw[]) {
      const { rule, errors } = validateRule(raw, ctx);
      if (!rule) {
        rejected.push({ title: String(raw.title ?? "senza titolo"), errors });
        continue;
      }
      valid.push({
        technique_id: rule.technique,
        title: rule.title,
        level: rule.level,
        logsource: [rule.logsource.product, rule.logsource.category ?? rule.logsource.service].filter(Boolean).join(" / "),
        yaml: toYaml(rule, { id: crypto.randomUUID(), date, reference: `${SITE}/briefs/${report.slug}` }),
        model: res.model,
      });
    }
    if (!valid.length) return json({ error: "Nessuna regola ha superato i controlli.", rejected }, 422);

    await db.from("detection_rules").delete().eq("report_id", reportId);
    const { data: saved, error } = await db.from("detection_rules").insert(valid.map((v) => ({ ...v, report_id: reportId }))).select("id, technique_id, title, level, logsource, yaml, created_at");
    if (error) return json({ error: "Salvataggio non riuscito." }, 500);
    return json({ rules: saved, rejected, skipped: techIds.length - chosen.length, model: res.model });
  } catch (err) {
    const msg = err instanceof Anthropic.RateLimitError ? "limite di richieste raggiunto" : err instanceof Anthropic.APIError ? `errore API ${err.status ?? ""}` : err instanceof Error ? err.message : String(err);
    return json({ error: `Generazione non disponibile: ${msg}` }, 502);
  }
});
