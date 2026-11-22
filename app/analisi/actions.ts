"use server";

import { refresh } from "next/cache";
import { analyzeText } from "@/lib/analysis/analyze";
import type { AnalysisResult } from "@/lib/analysis/types";
import { getViewer, sessionDb } from "@/lib/supabase/server";

export type AnalyzeState = {
  input?: string;
  result?: AnalysisResult;
  error?: string;
  saved?: { id: string; title: string };
};

/** Analisi senza salvataggio: disponibile a tutti (legge solo dati pubblici). */
export async function analyze(_prev: AnalyzeState, form: FormData): Promise<AnalyzeState> {
  const input = String(form.get("input") ?? "");
  if (!input.trim()) return { error: "Incolla del testo o una lista di IOC." };
  try {
    return { input, result: await analyzeText(input) };
  } catch {
    return { input, error: "Analisi non riuscita: riprova tra poco." };
  }
}

/**
 * Salva l'analisi. Il risultato viene ricalcolato sul server (non ci si fida di quello
 * inviato dal browser) e la scrittura passa dalla RLS: solo gli analisti possono salvare.
 */
export async function saveAnalysis(_prev: AnalyzeState, form: FormData): Promise<AnalyzeState> {
  const input = String(form.get("input") ?? "");
  const title = String(form.get("title") ?? "").trim().slice(0, 200) || "Analisi senza titolo";
  const viewer = await getViewer();
  if (!viewer?.isAnalyst) return { input, error: "Solo gli analisti autenticati possono salvare." };
  if (!input.trim()) return { error: "Niente da salvare." };

  const result = await analyzeText(input);
  const db = await sessionDb();
  const { data, error } = await db
    .from("analyses")
    .insert({ title, input_text: input, result, owner_id: viewer.userId })
    .select("id, title")
    .single();
  if (error) return { input, result, error: "Salvataggio non riuscito." };
  refresh();
  return { input, result, saved: data };
}
