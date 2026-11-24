import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { AdvisoryAiRaw } from "./guard";

/**
 * Chiamate a Claude, SOLO dagli script di ingestion (GitHub Actions): il Worker non importa mai
 * questo modulo e non conosce la chiave. All'IA vanno solo testi pubblici (avvisi TLP:CLEAR e
 * dati aggregati del rapporto notturno). Senza ANTHROPIC_API_KEY tutto continua senza IA.
 */
export const AI_MODEL = "claude-opus-5-5";

export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

/** Esito di una chiamata: il testo strutturato, oppure il motivo per cui non c'è. */
export type AiResult<T> = { ok: true; value: T; model: string } | { ok: false; reason: string };

async function ask<T>(system: string, user: string, schema: z.ZodType<T>, maxTokens: number): Promise<AiResult<T>> {
  try {
    const res = await getClient().beta.messages.parse({
      model: AI_MODEL,
      max_tokens: maxTokens,
      // Se un classificatore di sicurezza rifiuta (i testi di cybersecurity possono attivarli),
      // la richiesta passa a un modello di riserva scelto dal server.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
      system,
      messages: [{ role: "user", content: user }],
    });
    if (res.stop_reason === "refusal") return { ok: false, reason: "richiesta rifiutata dal modello" };
    if (res.stop_reason === "max_tokens") return { ok: false, reason: "risposta troncata" };
    if (!res.parsed_output) return { ok: false, reason: "risposta non conforme allo schema" };
    return { ok: true, value: res.parsed_output as T, model: res.model };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return { ok: false, reason: "chiave API non valida" };
    if (err instanceof Anthropic.RateLimitError) return { ok: false, reason: "limite di richieste raggiunto" };
    if (err instanceof Anthropic.APIError) return { ok: false, reason: `errore API ${err.status ?? ""}`.trim() };
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

const AdvisorySchema = z.object({
  summary: z.string().describe("Sintesi in italiano per un dirigente non tecnico, 3-5 frasi, max 850 caratteri."),
  impact: z.string().describe("Perché conta per un'azienda della difesa o dell'aerospazio e per i suoi fornitori, max 450 caratteri."),
  actions: z.array(z.string()).describe("Fino a 3 azioni concrete e prioritarie, in italiano, max 150 caratteri ciascuna."),
  facts: z.array(z.object({
    text: z.string().describe("Il fatto, in italiano, max 260 caratteri."),
    quote: z.string().describe("Citazione ESATTA, copiata parola per parola dall'avviso in inglese, che dimostra il fatto (max 250 caratteri)."),
  })).describe("Da 2 a 4 fatti chiave: chi, cosa, quali obiettivi, come entrano."),
  techniques: z.array(z.object({
    id: z.string().describe("ID MITRE ATT&CK, es. T1566.001"),
    quote: z.string().describe("Citazione ESATTA dall'avviso che descrive il comportamento."),
  })).describe("Tecniche ATT&CK descritte nell'avviso, anche se l'avviso non ne riporta il codice. Massimo 15."),
});

const ADVISORY_SYSTEM = `Sei un analista di cyber threat intelligence italiano. Scrivi per un'azienda della difesa e dell'aerospazio.
Usa SOLO il testo dell'avviso fornito: nessuna conoscenza esterna, nessuna attribuzione oltre a quella dichiarata dall'avviso.
Ogni fatto e ogni tecnica deve avere una citazione copiata parola per parola dall'avviso: le citazioni vengono verificate automaticamente e quelle inesatte vengono scartate.
Se un'informazione non è nell'avviso, omettila. Italiano chiaro, frasi brevi, niente toni allarmistici.`;

export function draftAdvisoryWithAi(advisory: { title: string; date: string; text: string }) {
  return ask<AdvisoryAiRaw>(
    ADVISORY_SYSTEM,
    `Avviso: «${advisory.title}» (pubblicato il ${advisory.date})\n\n<avviso>\n${advisory.text}\n</avviso>`,
    AdvisorySchema as z.ZodType<AdvisoryAiRaw>,
    8000,
  );
}

const WorldSchema = z.object({
  reading: z.string().describe("Lettura in italiano, 3-5 frasi, max 650 caratteri."),
});

const WORLD_SYSTEM = `Sei un analista di cyber threat intelligence italiano. Ricevi i dati aggregati del rapporto della notte (e, se presenti, quelli del giorno prima).
Scrivi una lettura breve: cosa spicca, cosa è cambiato rispetto al giorno prima, quale difesa conta di più.
Usa SOLO i dati forniti: ogni numero che scrivi deve comparire nei dati (il testo viene scartato altrimenti). Le rivendicazioni non sono verificate e i collegamenti malware-gruppi sono indizi: non presentarli come certezze.`;

export function readWorldWithAi(today: unknown, previous: unknown | null) {
  return ask<{ reading: string }>(
    WORLD_SYSTEM,
    `<oggi>\n${JSON.stringify(today)}\n</oggi>` + (previous ? `\n<ieri>\n${JSON.stringify(previous)}\n</ieri>` : ""),
    WorldSchema,
    2000,
  );
}
