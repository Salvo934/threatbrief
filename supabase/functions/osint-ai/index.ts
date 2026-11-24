/**
 * Edge Function «osint-ai»: nota dell'analista e prossimi passi per un'indagine OSINT, oppure la
 * descrizione dei gruppi di un triage. L'IA (Claude) riceve SOLO i dati già raccolti e salvati;
 * le risposte passano dai controlli di guard.ts. Solo per l'analista. Chiave: segreto
 * ANTHROPIC_API_KEY delle Edge Functions di Supabase (mai nel Worker).
 */
import Anthropic from "npm:@anthropic-ai/sdk@1.7.0";
import { betaZodOutputFormat } from "npm:@anthropic-ai/sdk@1.7.0/helpers/beta/zod";
import { createClient } from "npm:@supabase/supabase-js@2.119.2";
import { z } from "npm:zod@4.6.7";
import { compactLookup, validateBatch, validateSummary, type BatchRaw, type SummaryRaw } from "./guard.ts";

const MODEL = "claude-opus-5-5";
const ALLOWED_ORIGINS = ["https://threatbrief.salvo-bonavita9808.workers.dev", "http://localhost:3100"];
const cors = (origin: string | null) => ({
  "access-control-allow-origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  vary: "origin",
});

const SYSTEM = `Sei un analista di cyber threat intelligence italiano. Ricevi i dati di un'indagine OSINT passiva già raccolti da fonti aperte.
Usa SOLO questi dati: nessuna conoscenza esterna, nessuna attribuzione a gruppi oltre a quanto scritto nei dati. Ogni numero che scrivi deve comparire nei dati, altrimenti il testo viene scartato.
Distingui ciò che i dati mostrano da ciò che è un'ipotesi («potrebbe», «è compatibile con»). «Nessuna evidenza» non significa sicuro. Italiano chiaro, frasi brevi, tono professionale.`;

const SummarySchema = z.object({
  summary: z.string().describe("Nota dell'analista, 3-5 frasi, max 600 caratteri: cosa mostrano i dati, quanto è grave, cosa resta incerto."),
  next_steps: z.array(z.object({
    pivot: z.string().describe("Valore ESATTO di uno degli elementi in «collegamenti» da indagare"),
    why: z.string().describe("Perché è il passo più utile, max 200 caratteri"),
  })).describe("Fino a 3 collegamenti da indagare per primi, in ordine di priorità"),
});

const BatchSchema = z.object({
  clusters: z.array(z.object({
    id: z.string().describe("Lettera del gruppo, uguale a quella fornita"),
    title: z.string().describe("Titolo breve del gruppo, max 80 caratteri"),
    description: z.string().describe("Cosa accomuna gli indicatori e cosa suggerisce (ipotesi dichiarate come tali), max 450 caratteri"),
    action: z.string().describe("Azione consigliata per il SOC, max 200 caratteri"),
  })),
});

async function ask<T>(client: Anthropic, user: string, schema: z.ZodType<T>, maxTokens: number) {
  const res = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error("il modello non ha prodotto una risposta valida");
  return { value: res.parsed_output as T, model: res.model };
}

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
  if (!analyst) return json({ error: "Strumento riservato all'analista" }, 403);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "IA non configurata: manca il segreto ANTHROPIC_API_KEY nelle Edge Functions di Supabase." }, 503);
  const client = new Anthropic({ apiKey: key });

  let body: { lookup_id?: string; batch_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Richiesta non valida" }, 400);
  }

  try {
    if (body.lookup_id) {
      const { data: l } = await db.from("osint_lookups").select("query, kind, verdict, admiralty, signals, result").eq("id", body.lookup_id).maybeSingle();
      if (!l) return json({ error: "Indagine non trovata" }, 404);
      const data = compactLookup(l);
      const { value, model } = await ask<SummaryRaw>(client, `<dati>\n${JSON.stringify(data)}\n</dati>`, SummarySchema as z.ZodType<SummaryRaw>, 2000);
      const v = validateSummary(value, data);
      if (!v.ok) return json({ error: `Nota scartata dai controlli (${v.reason}). Riprova.` }, 422);
      const ai = { summary: v.summary, next_steps: v.next_steps, rejected: v.rejected, model, generated_at: new Date().toISOString() };
      await db.from("osint_lookups").update({ ai }).eq("id", body.lookup_id);
      return json({ ai });
    }
    if (body.batch_id) {
      const { data: b } = await db.from("osint_batches").select("clusters").eq("id", body.batch_id).maybeSingle();
      if (!b) return json({ error: "Triage non trovato" }, 404);
      const clusters = b.clusters as { id: string; members: string[]; reasons: string[] }[];
      if (!clusters.length) return json({ ai: { clusters: [], model: null } });
      const { data: rows } = await db.from("osint_lookups").select("query, kind, verdict, admiralty, signals, result").eq("batch_id", body.batch_id);
      const byQuery = new Map((rows ?? []).map((r) => [r.query as string, r]));
      const data = clusters.map((c) => ({
        id: c.id,
        motivi: c.reasons,
        indicatori: c.members.map((m) => {
          const r = byQuery.get(m);
          return r ? { indicatore: m, giudizio: r.verdict, segnali: (r.signals as { text: string }[]).map((s) => s.text) } : { indicatore: m };
        }),
      }));
      const { value, model } = await ask<BatchRaw>(client, `Descrivi ciascun gruppo (stessa lettera).\n<gruppi>\n${JSON.stringify(data)}\n</gruppi>`, BatchSchema as z.ZodType<BatchRaw>, 4000);
      const v = validateBatch(value, data, new Set(clusters.map((c) => c.id)));
      const ai = { clusters: v.clusters, rejected: v.rejected, model, generated_at: new Date().toISOString() };
      await db.from("osint_batches").update({ ai }).eq("id", body.batch_id);
      return json({ ai });
    }
    return json({ error: "Specifica lookup_id o batch_id" }, 400);
  } catch (err) {
    const msg = err instanceof Anthropic.AuthenticationError ? "chiave Anthropic non valida" : err instanceof Anthropic.RateLimitError ? "limite di richieste raggiunto" : err instanceof Anthropic.APIError ? `errore API ${err.status ?? ""}` : err instanceof Error ? err.message : String(err);
    return json({ error: `IA non disponibile: ${msg}` }, 502);
  }
});
