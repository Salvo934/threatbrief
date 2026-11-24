import { readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchCisaAdvisories } from "../defense/cisa-feed";
import { ADVISORY_CHARS, AGENT_MODEL, AGENT_NAME, AGENT_SYSTEM, DOSSIER_FORMAT, MAX_GRADER_ITERATIONS, MAX_PAGE_TOKENS, RUBRIC, SESSION_BUDGET_CENTS, TRUSTED_SOURCES, allowedHosts } from "./config";
import { citedUrls, composeDossierReport, DossierSchema, htmlToText, verifyDossier } from "./rules";

// Import relativi: modulo usato solo dagli script (GitHub Actions), mai dal Worker.
const STATE_FILE = "data/investigator.json";
type State = { agent_id?: string; environment_id?: string };

const readState = (): State => {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8")) as State;
  } catch {
    return {};
  }
};

const LOOKUP_TOOL = {
  type: "custom" as const,
  name: "threatbrief_lookup",
  description:
    "Interroga il database di ThreatBrief (sola lettura, dati pubblici): gruppo MITRE ATT&CK per nome o alias, CVE nel catalogo CISA KEV, tecnica ATT&CK per ID.",
  input_schema: {
    type: "object" as const,
    properties: {
      kind: { type: "string", enum: ["group", "cve", "technique"], description: "Tipo di ricerca" },
      query: { type: "string", description: "Nome o alias del gruppo, ID CVE, oppure ID tecnica (es. T1566.001)" },
    },
    required: ["kind", "query"],
  },
};

function agentParams() {
  const domains = TRUSTED_SOURCES.map((s) => s.domain);
  return {
    name: AGENT_NAME,
    description: "Approfondisce un avviso ufficiale confrontando fonti autorizzate e consegna un dossier con citazioni verificabili.",
    model: AGENT_MODEL,
    system: AGENT_SYSTEM,
    tools: [
      {
        type: "agent_toolset_20260401" as const,
        default_config: { enabled: false, permission_policy: { type: "auto" as const } },
        configs: [
          { name: "read" as const, enabled: true },
          { name: "write" as const, enabled: true },
          { name: "web_search" as const, enabled: true, allowed_domains: domains },
          { name: "web_fetch" as const, enabled: true, allowed_domains: domains, max_content_tokens: MAX_PAGE_TOKENS },
        ],
      },
      LOOKUP_TOOL,
    ],
  };
}

/** Crea o aggiorna ambiente e agente (una volta, o quando cambia la configurazione). */
export async function setupInvestigator() {
  const client = new Anthropic();
  const state = readState();
  const envParams = {
    name: "threatbrief-investigatore",
    config: { type: "cloud" as const, networking: { type: "limited" as const, allowed_hosts: allowedHosts() } },
  };
  const env = state.environment_id
    ? await client.beta.environments.update(state.environment_id, envParams)
    : await client.beta.environments.create(envParams);
  const agent = state.agent_id
    ? await client.beta.agents.update(state.agent_id, agentParams() as Parameters<typeof client.beta.agents.update>[1])
    : await client.beta.agents.create(agentParams() as Parameters<typeof client.beta.agents.create>[0]);
  writeFileSync(STATE_FILE, `${JSON.stringify({ agent_id: agent.id, environment_id: env.id }, null, 2)}\n`);
  return { agent_id: agent.id, version: agent.version, environment_id: env.id };
}

/** Risposta allo strumento threatbrief_lookup: solo dati pubblici del database. */
async function lookup(db: SupabaseClient, input: { kind?: string; query?: string }) {
  const q = String(input.query ?? "").trim().slice(0, 100);
  if (!q) return "Query vuota.";
  if (input.kind === "cve") {
    const { data } = await db.from("kev_vulnerabilities").select("cve_id, vendor_project, product, vulnerability_name, date_added, known_ransomware_use, short_description").eq("cve_id", q.toUpperCase()).maybeSingle();
    return data ? JSON.stringify({ catalogo: "CISA KEV", ...data }) : `${q}: non presente nel catalogo CISA KEV.`;
  }
  if (input.kind === "technique") {
    const { data } = await db.from("attack_techniques").select("external_id, name, tactics, url").eq("external_id", q.toUpperCase()).eq("revoked", false).maybeSingle();
    return data ? JSON.stringify(data) : `${q}: tecnica non trovata in ATT&CK.`;
  }
  const { data: groups } = await db.from("attack_groups").select("id, external_id, name, aliases, description, url").eq("revoked", false).eq("deprecated", false);
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const g = (groups ?? []).find((x) => [x.name, ...(x.aliases as string[])].some((a) => norm(a) === norm(q)));
  if (!g) return `${q}: nessun gruppo MITRE ATT&CK con questo nome o alias.`;
  const { data: tech } = await db.from("v_group_techniques").select("technique_id").eq("group_id", g.id).limit(500);
  const ids = [...new Set((tech ?? []).map((t) => t.technique_id as string))];
  const { data: names } = ids.length ? await db.from("attack_techniques").select("external_id").in("id", ids.slice(0, 200)) : { data: [] };
  return JSON.stringify({
    fonte: "MITRE ATT&CK",
    external_id: g.external_id, name: g.name, aliases: g.aliases, url: g.url,
    description: String(g.description ?? "").replace(/\(Citation:[^)]*\)/g, "").slice(0, 900),
    techniques: (names ?? []).map((n) => n.external_id).sort(),
  });
}

type Ev = { id: string; type: string; name?: string; input?: unknown; evaluated_permission?: string; stop_reason?: { type: string }; result?: string };

/** Segue la sessione a intervalli (robusto alle disconnessioni) e risponde agli strumenti. */
async function driveSession(client: Anthropic, db: SupabaseClient, sessionId: string, deadlineMs: number) {
  const answered = new Set<string>();
  let lastOutcome = "";
  for (;;) {
    const events: Ev[] = [];
    for await (const e of client.beta.sessions.events.list(sessionId)) events.push(e as unknown as Ev);
    for (const e of events) {
      if (answered.has(e.id)) continue;
      if (e.type === "agent.custom_tool_use") {
        const text = e.name === "threatbrief_lookup" ? await lookup(db, (e.input ?? {}) as { kind?: string; query?: string }) : `Strumento sconosciuto: ${e.name}`;
        await client.beta.sessions.events.send(sessionId, { events: [{ type: "user.custom_tool_result", custom_tool_use_id: e.id, content: [{ type: "text", text }] }] });
        answered.add(e.id);
      } else if ((e.type === "agent.tool_use" || e.type === "agent.mcp_tool_use") && e.evaluated_permission === "ask") {
        // Nessuno sta guardando: le chiamate in dubbio vengono negate.
        await client.beta.sessions.events.send(sessionId, { events: [{ type: "user.tool_confirmation", tool_use_id: e.id, result: "deny" }] });
        answered.add(e.id);
      } else if (e.type === "user.custom_tool_result" || e.type === "user.tool_confirmation") {
        // già risposto in un giro precedente
      }
      if (e.type === "span.outcome_evaluation_end" && e.result) lastOutcome = e.result;
    }
    const status = [...events].reverse().find((e) => e.type === "session.status_idle" || e.type === "session.status_running" || e.type === "session.status_terminated");
    if (status?.type === "session.status_terminated") return { end: "terminated", outcome: lastOutcome };
    if (status?.type === "session.status_idle" && status.stop_reason?.type !== "requires_action") {
      return { end: status.stop_reason?.type ?? "idle", outcome: lastOutcome };
    }
    if (Date.now() > deadlineMs) {
      await client.beta.sessions.events.send(sessionId, { events: [{ type: "user.interrupt" }] });
      return { end: "timeout", outcome: lastOutcome };
    }
    await new Promise((r) => setTimeout(r, 8000));
  }
}

async function fetchPage(url: string) {
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; ThreatBrief-verify/0.1)", accept: "text/html,application/xhtml+xml" }, signal: AbortSignal.timeout(30_000), redirect: "follow" });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html") && !type.includes("text")) return null;
    return htmlToText(await res.text());
  } catch {
    return null;
  }
}

/** Prende in carico la richiesta più vecchia e produce il dossier. Restituisce un riepilogo o null. */
export async function processNextInvestigation(db: SupabaseClient) {
  const state = readState();
  if (!state.agent_id || !state.environment_id) throw new Error("agente non configurato: esegui prima `npm run ingest -- investigator-setup`");
  const { data: inv } = await db.from("investigations").select("id, report_id").eq("status", "richiesta").order("requested_at").limit(1).maybeSingle();
  if (!inv) return null;

  const fail = async (error: string, extra: Record<string, unknown> = {}) => {
    await db.from("investigations").update({ status: "fallita", error, finished_at: new Date().toISOString(), ...extra }).eq("id", inv.id);
    return { id: inv.id, ok: false, message: error };
  };

  const { data: report } = await db.from("reports").select("id, title, owner_id, subject_group_id").eq("id", inv.report_id).single();
  const { data: srcRows } = await db.from("report_sources").select("url, title").eq("report_id", inv.report_id);
  const origin = (srcRows ?? []).find((s) => s.url && /cisa\.gov/.test(s.url)) ?? (srcRows ?? [])[0];
  if (!report || !origin?.url) return fail("il report non ha una fonte di partenza con URL");

  let text = "";
  try {
    text = (await fetchCisaAdvisories()).find((a) => a.url === origin.url)?.text ?? "";
  } catch {
    // il testo completo è facoltativo: l'agente può leggerlo con web_fetch
  }

  const client = new Anthropic();
  await db.from("investigations").update({ status: "in_corso", started_at: new Date().toISOString() }).eq("id", inv.id);
  const session = await client.beta.sessions.create({
    agent: state.agent_id,
    environment_id: state.environment_id,
    title: `Approfondimento: ${origin.title ?? report.title}`.slice(0, 200),
    budget: { type: "limit", max_list_cost: { amount: SESSION_BUDGET_CENTS, currency: "USD" } },
    initial_events: [
      {
        type: "user.message",
        content: [{
          type: "text",
          text: `Avviso di partenza: «${origin.title}»\nURL: ${origin.url}\n\n${text ? `<avviso>\n${text.slice(0, ADVISORY_CHARS)}\n</avviso>` : "Leggi l'avviso con web_fetch."}\n\n${DOSSIER_FORMAT}`,
        }],
      },
      {
        type: "user.define_outcome",
        description: `Dossier di approfondimento sull'avviso «${origin.title}», con fonti indipendenti e citazioni verificabili, in /mnt/session/outputs/dossier.json`,
        rubric: { type: "text", content: RUBRIC },
        max_iterations: MAX_GRADER_ITERATIONS,
      },
    ],
  } as Parameters<typeof client.beta.sessions.create>[0]);
  await db.from("investigations").update({ session_id: session.id }).eq("id", inv.id);
  console.log(`  sessione ${session.id} avviata (tetto $${Number(SESSION_BUDGET_CENTS) / 100})`);

  const run = await driveSession(client, db, session.id, Date.now() + 25 * 60_000);
  const final = await client.beta.sessions.retrieve(session.id);
  const cost = Number((final as unknown as { usage?: { list_cost?: { amount?: string } } }).usage?.list_cost?.amount ?? 0) / 100;
  console.log(`  sessione terminata: ${run.end}, valutazione: ${run.outcome || "n.d."}, costo di listino $${cost.toFixed(2)}`);

  // Dossier scritto dall'agente.
  let raw: string | null = null;
  for (let i = 0; i < 4 && !raw; i++) {
    for await (const f of client.beta.files.list({ scope_id: session.id, betas: ["managed-agents-2026-04-01"] })) {
      if (f.filename.endsWith("dossier.json")) raw = await (await client.beta.files.download(f.id)).text();
    }
    if (!raw) await new Promise((r) => setTimeout(r, 3000));
  }
  if (!raw) return fail(`l'agente non ha consegnato il dossier (${run.end})`, { list_cost_usd: cost });
  let parsed;
  try {
    parsed = DossierSchema.parse(JSON.parse(raw));
  } catch {
    return fail("dossier non valido (JSON o formato)", { list_cost_usd: cost });
  }

  // Verifica: riapro ogni pagina citata e cerco la citazione.
  const urls = citedUrls(parsed);
  const pages = new Map<string, string | null>();
  for (const u of urls) pages.set(u, await fetchPage(u));
  if (text) pages.set(origin.url.replace(/\/$/, ""), `${pages.get(origin.url.replace(/\/$/, "")) ?? ""} ${text}`);
  const { data: techs } = await db.from("attack_techniques").select("id, external_id").eq("revoked", false).eq("deprecated", false).limit(2000);
  const techMap = new Map((techs ?? []).map((t) => [t.external_id as string, t.id as string]));
  const v = verifyDossier(parsed, pages, new Set(techMap.keys()));
  if (v.claims.length < 2) return fail(`troppo poche affermazioni verificabili (${v.claims.length})`, { list_cost_usd: cost });

  const c = composeDossierReport(v, { title: origin.title ?? report.title });
  const { data: created, error: rErr } = await db.from("reports").insert({
    owner_id: report.owner_id,
    slug: `dossier-${inv.id.slice(0, 8)}`,
    title: `Dossier: ${v.subject || origin.title}`.slice(0, 200),
    kind: report.subject_group_id ? "attore" : "evento",
    subject_group_id: report.subject_group_id,
    subject_event: report.subject_group_id ? null : (v.subject || origin.title),
    tlp: "CLEAR", confidence: "medio", status: "draft",
    exec_risk: null,
    exec_summary: v.summary || null,
    exec_impact: null,
    exec_actions: v.actions,
    tech_notes: c.notes,
    auto_generated: true, ai_assisted: true,
  }).select("id").single();
  if (rErr || !created) return fail(`creazione del report: ${rErr?.message}`, { list_cost_usd: cost });

  const srcIds = new Map<string, string>();
  for (const s of c.sources) {
    const { data } = await db.from("report_sources").insert({ report_id: created.id, title: s.url, url: s.url, publisher: s.publisher, reliability: s.reliability, credibility: s.credibility }).select("id").single();
    if (data) srcIds.set(s.url, data.id);
  }
  await db.from("report_statements").insert(c.statements.map((s, position) => ({
    report_id: created.id, section: s.section, kind: s.kind, body: s.body, position,
    source_id: "url" in s ? (srcIds.get(s.url) ?? null) : null,
    confidence: "confidence" in s ? s.confidence : null,
  })));
  if (v.techniques.length) {
    await db.from("report_techniques").insert(v.techniques.flatMap((t) => {
      const id = techMap.get(t.id);
      return id ? [{ report_id: created.id, technique_id: id, note: `${t.source.source.publisher}: «${t.source.quote}»` }] : [];
    }));
  }
  const summary = `${v.stats.claimsKept}/${v.stats.claimsProposed} affermazioni verificate, ${c.sources.length} fonti, ${v.stats.sourcesRejected} citazioni scartate, valutazione della griglia: ${run.outcome || "n.d."}`;
  await db.from("investigations").update({ status: "completata", finished_at: new Date().toISOString(), dossier_report_id: created.id, list_cost_usd: cost, summary }).eq("id", inv.id);
  return { id: inv.id, ok: true, message: summary, session: session.id };
}
