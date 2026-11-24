/**
 * «Chiedi a ThreatBrief»: controlli puri sulla risposta dell'assistente (testati in tests/ask.test.ts).
 * Ogni dato deve venire dagli strumenti: i numeri devono comparire nei loro risultati, e le
 * citazioni [n] devono rimandare a una fonte realmente consultata.
 */

export type SourceRef = { n: number; tool: string; title: string; link: string };

/** Numeri della risposta assenti dai dati degli strumenti e dalla domanda (cifra per cifra). */
export function unknownNumbers(answer: string, toolOutputs: string[], question: string) {
  const allowed = new Set([...toolOutputs, question].join(" ").match(/\d+/g) ?? []);
  // [n] sono citazioni, non dati
  return (answer.replace(/\[\d+\]/g, "").match(/\d+/g) ?? []).filter((n) => !allowed.has(n));
}

/** Citazioni [n] che non corrispondono a nessuna fonte consultata. */
export function badCitations(answer: string, sources: SourceRef[]) {
  const ok = new Set(sources.map((s) => s.n));
  return [...new Set([...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))].filter((n) => !ok.has(n));
}

/** Fonti effettivamente citate nella risposta, nell'ordine di numero. */
export function citedSources(answer: string, sources: SourceRef[]) {
  const used = new Set([...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
  return sources.filter((s) => used.has(s.n));
}

/** Testo libero dall'utente usato nei filtri: corto e senza caratteri speciali di PostgREST. */
export const cleanTerm = (v: unknown, max = 60) => String(v ?? "").replace(/[%,()*\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export const clampDays = (v: unknown, def = 30, max = 365) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : def;
};
