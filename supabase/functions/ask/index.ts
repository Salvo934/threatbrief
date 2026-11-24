/**
 * Edge Function «ask» — Chiedi a ThreatBrief. Claude risponde a domande in italiano usando solo
 * strumenti di sola lettura sul database (tools.ts) e cita le fonti [n]. La risposta passa dai
 * controlli di guard.ts: numeri presenti nei dati, citazioni a fonti consultate. Solo per
 * l'analista; chiave nei segreti di Supabase (ANTHROPIC_API_KEY), mai nel Worker.
 */
import Anthropic from "npm:@anthropic-ai/sdk@1.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.119.2";
import { badCitations, citedSources, unknownNumbers, type SourceRef } from "./guard.ts";
import { runTool, TOOLS } from "./tools.ts";

const MODEL = "claude-opus-5-5";
const MAX_TURNS = 7;
const ALLOWED_ORIGINS = ["https://threatbrief.salvo-bonavita9808.workers.dev", "http://localhost:3100"];
const cors = (origin: string | null) => ({
  "access-control-allow-origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  vary: "origin",
});

const system = () => `Sei l'assistente di ThreatBrief, una piattaforma di cyber threat intelligence italiana. Oggi è il ${new Date().toISOString().slice(0, 10)}.
Rispondi in italiano, in modo chiaro e conciso (massimo 8-10 frasi o un breve elenco), come un analista CTI.
Regole:
- Ogni dato (numeri, nomi, date) deve venire dai risultati degli strumenti: usali sempre prima di rispondere. Ogni risultato ha un numero di fonte: cita [n] subito dopo il dato.
- Non scrivere numeri che non compaiono nei risultati degli strumenti: la risposta viene controllata automaticamente.
- Le rivendicazioni ransomware sono dichiarazioni dei gruppi, non verificate; i collegamenti malware-gruppi sono indizi, non attribuzioni.
- Se i dati non bastano per rispondere, dillo e indica cosa servirebbe. Non inventare.
- Puoi spiegare concetti generali (cos'è una tecnica, un catalogo), ma senza numeri e senza presentarli come dati dell'app.`;

type Block = Anthropic.Beta.BetaContentBlock;

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
  if (!analyst) return json({ error: "Assistente riservato all'analista" }, 403);
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "IA non configurata: manca il segreto ANTHROPIC_API_KEY." }, 503);

  let question = "";
  try {
    question = String(((await req.json()) as { question?: unknown }).question ?? "").trim().slice(0, 800);
  } catch {
    return json({ error: "Richiesta non valida" }, 400);
  }
  if (question.length < 5) return json({ error: "Scrivi una domanda." }, 400);

  const client = new Anthropic({ apiKey: key });
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: question }];
  const sources: SourceRef[] = [];
  const outputs: string[] = [];
  let retried = false;
  let model = MODEL;

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const res = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 6000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium" },
        system: system(),
        tools: TOOLS as Anthropic.Beta.BetaToolUnion[],
        messages,
      });
      model = res.model;
      if (res.stop_reason === "refusal") return json({ error: "Il modello ha rifiutato la domanda." }, 422);
      messages.push({ role: "assistant", content: res.content as Block[] });

      if (res.stop_reason === "tool_use") {
        const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
        for (const b of res.content) {
          if (b.type !== "tool_use") continue;
          const out = await runTool(db, b.name, (b.input ?? {}) as Record<string, unknown>);
          const n = sources.length + 1;
          sources.push({ n, tool: b.name, title: out.title, link: out.link });
          const text = JSON.stringify({ fonte: n, titolo: out.title, dati: out.data }).slice(0, 12000);
          outputs.push(text);
          results.push({ type: "tool_result", tool_use_id: b.id, content: text });
        }
        messages.push({ role: "user", content: results });
        continue;
      }

      const answer = res.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n").trim();
      const badNums = unknownNumbers(answer, outputs, question);
      const badRefs = badCitations(answer, sources);
      if ((badNums.length || badRefs.length) && !retried && turn < MAX_TURNS - 1) {
        retried = true;
        messages.push({
          role: "user",
          content: `Controllo automatico: ${badNums.length ? `questi numeri non compaiono nei dati degli strumenti: ${badNums.join(", ")}. ` : ""}${badRefs.length ? `queste citazioni non corrispondono a fonti consultate: ${badRefs.map((n) => `[${n}]`).join(", ")}. ` : ""}Riscrivi la risposta usando solo i dati degli strumenti.`,
        });
        continue;
      }
      return json({
        answer,
        sources: citedSources(answer, sources),
        consulted: sources.length,
        warning: badNums.length || badRefs.length ? `Attenzione: la risposta contiene dati non verificati (${[...badNums, ...badRefs.map((n) => `[${n}]`)].join(", ")}).` : null,
        corrected: retried,
        model,
      });
    }
    return json({ error: "Domanda troppo complessa: riformulala in modo più specifico." }, 422);
  } catch (err) {
    const msg = err instanceof Anthropic.RateLimitError ? "limite di richieste raggiunto" : err instanceof Anthropic.APIError ? `errore API ${err.status ?? ""}` : err instanceof Error ? err.message : String(err);
    return json({ error: `Assistente non disponibile: ${msg}` }, 502);
  }
});
