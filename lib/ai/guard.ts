/**
 * Controlli sulle risposte dell'IA (puri, testabili senza chiamate). L'IA propone, questo modulo
 * scarta tutto ciò che non è verificabile: citazioni che non esistono nel testo della fonte,
 * tecniche ATT&CK inesistenti, numeri che non compaiono nei dati.
 */

/** Confronto tollerante su spazi, maiuscole e virgolette tipografiche. */
export const normalizeForMatch = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

/** La citazione esiste davvero nella fonte (almeno 20 caratteri, per evitare frammenti generici). */
export function quoteInSource(quote: string, source: string) {
  const q = normalizeForMatch(quote).replace(/^["'«…]+|["'»…]+$/g, "").trim();
  return q.length >= 20 && normalizeForMatch(source).includes(q);
}

export const clip = (s: string, n: number) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, t.lastIndexOf(" ", n - 1))}…`;
};

export type AdvisoryAiRaw = {
  summary: string;
  impact: string;
  actions: string[];
  facts: { text: string; quote: string }[];
  techniques: { id: string; quote: string }[];
};

export type AdvisoryAi = {
  summary: string;
  impact: string;
  actions: string[];
  facts: { text: string; quote: string }[];
  techniques: { id: string; quote: string }[];
  /** quante proposte dell'IA sono state scartate dai controlli */
  rejected: number;
};

/**
 * Tiene solo ciò che è verificabile: fatti con citazione presente nell'avviso, tecniche esistenti
 * in ATT&CK con citazione presente. Restituisce null se manca il minimo (sintesi e un fatto).
 */
export function validateAdvisoryAi(raw: AdvisoryAiRaw, source: string, validTechniques: Set<string>): AdvisoryAi | null {
  let rejected = 0;
  const facts = raw.facts.filter((f) => {
    const ok = f.text.trim().length > 0 && quoteInSource(f.quote, source);
    if (!ok) rejected++;
    return ok;
  });
  const seen = new Set<string>();
  const techniques = raw.techniques.filter((t) => {
    const id = t.id.trim().toUpperCase();
    const ok = /^T\d{4}(?:\.\d{3})?$/.test(id) && validTechniques.has(id) && !seen.has(id) && quoteInSource(t.quote, source);
    if (ok) seen.add(id);
    else rejected++;
    return ok;
  });
  if (!raw.summary.trim() || facts.length === 0) return null;
  return {
    summary: clip(raw.summary, 900),
    impact: clip(raw.impact, 500),
    actions: raw.actions.map((a) => clip(a, 160)).filter(Boolean).slice(0, 3),
    facts: facts.slice(0, 4).map((f) => ({ text: clip(f.text, 280), quote: clip(f.quote, 600) })),
    techniques: techniques.map((t) => ({ id: t.id.trim().toUpperCase(), quote: clip(t.quote, 300) })),
    rejected,
  };
}

/** Numeri scritti dall'IA che non compaiono nei dati: se ce ne sono, il testo viene scartato. */
export function unknownNumbers(text: string, data: unknown) {
  const allowed = new Set((JSON.stringify(data).match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(",", ".")));
  allowed.add("24"); // «ultime 24 ore»
  return (text.match(/\d+(?:[.,]\d+)?/g) ?? [])
    .map((n) => n.replace(/\./g, "").replace(",", ".")) // 1.339 → 1339
    .filter((n) => !allowed.has(n));
}
