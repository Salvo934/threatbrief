import keywordsJson from "@/data/technique-keywords.json";

export type TechniqueRef = { id: string; external_id: string; name: string };
export type HintMethod = "id" | "nome" | "parola chiave";
/** sameName: altre tecniche con lo stesso nome (es. "Spearphishing Attachment" in T1566 e T1598). */
export type TechniqueHint = { technique: TechniqueRef; method: HintMethod; evidence: string; sameName?: string[] };
export type SoftwareRef = { id: string; external_id: string; name: string; aliases: string[] };
export type SoftwareHint = { software: SoftwareRef; evidence: string };

// Nomi ATT&CK troppo generici per essere un indizio se compaiono nel testo.
const GENERIC_NAMES = new Set(["proxy", "web service", "tool", "malware", "server", "domains", "software", "botnet", "code signing", "email accounts"]);

const KEYWORDS = keywordsJson.keywords.map((k) => ({ re: new RegExp(k.pattern, "i"), technique: k.technique }));

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function snippet(text: string, index: number, length: number) {
  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, index + length + 60);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).replace(/\s+/g, " ").trim()}${end < text.length ? "…" : ""}`;
}

/**
 * Suggerisce tecniche ATT&CK citate nel testo: per ID (T1059.001), per nome ufficiale,
 * o per parole chiave tipiche dei report. Sono indizi per l'analista, da confermare.
 */
export function suggestTechniques(text: string, techniques: TechniqueRef[]): TechniqueHint[] {
  const byExt = new Map(techniques.map((t) => [t.external_id, t]));
  const out = new Map<string, TechniqueHint>();
  const add = (t: TechniqueRef | undefined, method: HintMethod, evidence: string) => {
    if (t && !out.has(t.external_id)) out.set(t.external_id, { technique: t, method, evidence });
  };

  for (const m of text.matchAll(/\bT\d{4}(?:\.\d{3})?\b/g)) add(byExt.get(m[0]), "id", snippet(text, m.index, m[0].length));

  // Nomi condivisi da più tecniche: un solo suggerimento, con le alternative indicate.
  const byName = new Map<string, TechniqueRef[]>();
  for (const t of techniques) {
    const key = t.name.toLowerCase();
    byName.set(key, [...(byName.get(key) ?? []), t]);
  }
  for (const [name, list] of byName) {
    if (name.length < 5 || GENERIC_NAMES.has(name)) continue;
    const m = new RegExp(`\\b${escape(list[0].name)}\\b`, "i").exec(text);
    if (!m || list.some((t) => out.has(t.external_id))) continue;
    const [first, ...others] = [...list].sort((a, b) => a.external_id.localeCompare(b.external_id));
    add(first, "nome", snippet(text, m.index, m[0].length));
    if (others.length) out.get(first.external_id)!.sameName = others.map((o) => o.external_id);
  }

  for (const k of KEYWORDS) {
    const m = k.re.exec(text);
    if (m) add(byExt.get(k.technique), "parola chiave", snippet(text, m.index, m[0].length));
  }

  return [...out.values()].sort((a, b) => a.technique.external_id.localeCompare(b.technique.external_id));
}

/** Software ATT&CK nominati nel testo (nome o alias di almeno 5 caratteri, per evitare falsi positivi). */
export function suggestSoftware(text: string, software: SoftwareRef[]): SoftwareHint[] {
  const out: SoftwareHint[] = [];
  for (const s of software) {
    for (const n of [s.name, ...s.aliases]) {
      if (n.length < 5) continue;
      const m = new RegExp(`(?<![\\w-])${escape(n)}(?![\\w-])`, "i").exec(text);
      if (m) {
        out.push({ software: s, evidence: snippet(text, m.index, m[0].length) });
        break;
      }
    }
  }
  return out.sort((a, b) => a.software.name.localeCompare(b.software.name));
}
