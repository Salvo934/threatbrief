import sectorsJson from "../../data/sectors.json";
import motivationsJson from "../../data/motivations.json";
import { cleanAttackText } from "../../lib/attack/text";

export type DerivedAttribute = {
  attribute: "motivazione" | "settore" | "paese";
  value: string;
  evidence: string;
};

type Rule = { value: string; regexes: RegExp[] };

const compile = (patterns: string[]) => patterns.map((p) => new RegExp(p, "i"));

const SECTOR_RULES: Rule[] = sectorsJson.sectors.map((s) => ({
  value: s.id,
  regexes: compile(s.attack_patterns),
}));

const MOTIVATION_RULES: Rule[] = motivationsJson.motivations.map((m) => ({
  value: m.id,
  regexes: compile(m.patterns),
}));

// Nomi alternativi che Intl.DisplayNames non restituisce.
const COUNTRY_ALIASES: Record<string, string[]> = {
  US: ["U.S.", "USA", "United States of America"],
  GB: ["UK", "U.K.", "Britain", "Great Britain"],
  TR: ["Turkey", "Türkiye"],
  CZ: ["Czech Republic"],
  KR: ["Republic of Korea"],
  KP: ["Democratic People's Republic of Korea", "Democratic People’s Republic of Korea", "DPRK"],
  RU: ["Russian Federation"],
  AE: ["UAE"],
  CI: ["Ivory Coast"],
  MM: ["Burma"],
  PS: ["Palestine"],
};

// Codici che DisplayNames risolve ma che non sono paesi.
const NOT_COUNTRIES = new Set(["EU", "EZ", "UN", "QO", "XA", "XB", "ZZ", "AQ"]);

type CountryName = { code: string; regex: RegExp; length: number };

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildCountryNames(): CountryName[] {
  const dn = new Intl.DisplayNames(["en"], { type: "region" });
  const out: CountryName[] = [];
  const A = "A".charCodeAt(0);
  for (let i = 0; i < 26; i++) {
    for (let j = 0; j < 26; j++) {
      const code = String.fromCharCode(A + i, A + j);
      if (NOT_COUNTRIES.has(code)) continue;
      let name: string | undefined;
      try {
        name = dn.of(code);
      } catch {
        continue;
      }
      if (!name || name === code) continue;
      // Codici storici (VD = Vietnam del Nord, DD = Germania Est...) si canonicalizzano
      // su un altro codice: li saltiamo, altrimenti "ruberebbero" il nome del paese attuale.
      if (Intl.getCanonicalLocales(`und-${code}`)[0] !== `und-${code}`) continue;
      for (const n of [name, ...(COUNTRY_ALIASES[code] ?? [])]) {
        // Confini "di parola" che funzionano anche con nomi che finiscono col punto (U.S.)
        out.push({
          code,
          regex: new RegExp(`(?<![\\w.])${escapeRegex(n)}(?![\\w])`, "g"),
          length: n.length,
        });
      }
    }
  }
  // I nomi più lunghi prima: "Papua New Guinea" non deve contare anche "Guinea".
  return out.sort((a, b) => b.length - a.length);
}

let COUNTRY_NAMES: CountryName[] | null = null;

// Aggettivi di nazionalità più frequenti in ATT&CK. Sono ambigui ("Russian GRU" è attribuzione,
// "against Ukrainian companies" è vittima): li contiamo solo se preceduti da un verbo di attacco.
const DEMONYMS: Record<string, string> = {
  Ukrainian: "UA", Russian: "RU", Chinese: "CN", Taiwanese: "TW", Japanese: "JP", "South Korean": "KR",
  Korean: "KR", Vietnamese: "VN", Indian: "IN", Pakistani: "PK", Afghan: "AF", Iranian: "IR", Iraqi: "IQ",
  Israeli: "IL", Saudi: "SA", Emirati: "AE", Turkish: "TR", Syrian: "SY", Lebanese: "LB", Egyptian: "EG",
  Kuwaiti: "KW", Qatari: "QA", Jordanian: "JO", Palestinian: "PS", Georgian: "GE", Armenian: "AM",
  Azerbaijani: "AZ", Kazakh: "KZ", Belarusian: "BY", Polish: "PL", German: "DE", French: "FR", Italian: "IT",
  Spanish: "ES", Portuguese: "PT", Dutch: "NL", Belgian: "BE", British: "GB", American: "US", Canadian: "CA",
  Mexican: "MX", Brazilian: "BR", Colombian: "CO", Chilean: "CL", Australian: "AU", Mongolian: "MN",
  Thai: "TH", Filipino: "PH", Malaysian: "MY", Indonesian: "ID", Singaporean: "SG", Cambodian: "KH",
  Bangladeshi: "BD", Nepalese: "NP", "Sri Lankan": "LK", Tibetan: "CN", Uyghur: "CN",
};
const DEMONYM_ALT = Object.keys(DEMONYMS)
  .sort((a, b) => b.length - a.length)
  .join("|");
// verbo di attacco, al massimo 4 parole (es. "the 2015 attacks against"), poi l'aggettivo
const DEMONYM_RE = new RegExp(
  `\\b(?:against|target(?:ed|ing|s)?|compromis(?:ed|ing)|attacks? on|victims? (?:in|include))\\s+(?:(?:the|several|multiple|various|numerous|many)\\s+)?(${DEMONYM_ALT})\\b`,
  "g",
);
// elenco subito dopo: "Ukrainian, Georgian and Polish"
const DEMONYM_LIST_RE = new RegExp(`^(?:,\\s*|,?\\s+(?:and|or)\\s+)(${DEMONYM_ALT})\\b`);

function matchDemonyms(sentence: string, found: Map<string, DerivedAttribute>) {
  const add = (word: string) => {
    const code = DEMONYMS[word];
    if (code && !found.has(code)) found.set(code, { attribute: "paese", value: code, evidence: clip(sentence) });
  };
  DEMONYM_RE.lastIndex = 0;
  for (let m; (m = DEMONYM_RE.exec(sentence)); ) {
    add(m[1]);
    let rest = sentence.slice(m.index + m[0].length);
    for (let l; (l = DEMONYM_LIST_RE.exec(rest)); rest = rest.slice(l[0].length)) add(l[1]);
  }
}

// Il paese nominato è l'ORIGINE dell'attore, non la vittima: lo scartiamo.
// Stesso discorso per arresti e per "fuori da X": il paese nominato non è una vittima.
// ")?" copre la sigla tra parentesi: "Republic of Korea (DPRK)-based" → "DPRK" seguito da ")-based"
const ATTRIBUTION_AFTER = /^\)?(?:\s*\([^)]*\))?(?:-based|-nexus|-linked|-sponsored|-aligned|['’]s\b)/i;
const ATTRIBUTION_BEFORE =
  /(?:based in|located in|operating (?:from|out of)|attributed to|on behalf of(?: the)?|originat\w* (?:from|in)|arrested in|extradited (?:to|from)|indicted in|outside(?: of)?)\s+(?:the\s+)?$/i;

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z"(])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function clip(s: string, max = 300) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function matchRules(sentences: string[], rules: Rule[], attribute: DerivedAttribute["attribute"]) {
  const found = new Map<string, DerivedAttribute>();
  for (const rule of rules) {
    for (const sentence of sentences) {
      if (rule.regexes.some((r) => r.test(sentence))) {
        found.set(rule.value, { attribute, value: rule.value, evidence: clip(sentence) });
        break; // basta la prima frase come evidenza
      }
    }
  }
  return [...found.values()];
}

function matchCountries(sentences: string[]): DerivedAttribute[] {
  COUNTRY_NAMES ??= buildCountryNames();
  const found = new Map<string, DerivedAttribute>();
  for (const sentence of sentences) {
    let masked = sentence;
    for (const c of COUNTRY_NAMES) {
      c.regex.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = c.regex.exec(masked))) {
        const start = m.index;
        const end = start + m[0].length;
        const before = masked.slice(0, start);
        const after = masked.slice(end);
        const isAttribution = ATTRIBUTION_AFTER.test(after) || ATTRIBUTION_BEFORE.test(before);
        if (!isAttribution && !found.has(c.code)) {
          found.set(c.code, { attribute: "paese", value: c.code, evidence: clip(sentence) });
        }
        // Maschera il match per non riconoscere sotto-nomi (Guinea dentro Papua New Guinea)
        masked = masked.slice(0, start) + "\u0000".repeat(m[0].length) + masked.slice(end);
        c.regex.lastIndex = end;
      }
    }
    matchDemonyms(sentence, found);
  }
  return [...found.values()];
}

/**
 * Deriva settori, paesi colpiti e motivazione dalla descrizione ATT&CK di un gruppo.
 * È una deduzione automatica: il chiamante la salva con method='derivato' e confidenza bassa.
 */
export function deriveActorAttributes(description: string | null | undefined): DerivedAttribute[] {
  const sentences = splitSentences(cleanAttackText(description));
  return [
    ...matchRules(sentences, MOTIVATION_RULES, "motivazione"),
    ...matchRules(sentences, SECTOR_RULES, "settore"),
    ...matchCountries(sentences),
  ];
}
