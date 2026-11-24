/**
 * Regole Sigma dalle tecniche di un report: controlli puri (testati in tests/sigma.test.ts).
 * L'IA propone la regola come oggetto strutturato; qui il codice la valida e scrive lo YAML,
 * così nessun testo libero del modello finisce nel file. Ogni regola nasce «experimental».
 */

export type SigmaField = { field: string; modifier?: string; all?: boolean; values: string[] };
export type SigmaRaw = {
  technique: string;
  title: string;
  description: string;
  logsource: { product?: string; category?: string; service?: string };
  selections: { name: string; fields: SigmaField[] }[];
  condition: string;
  falsepositives: string[];
  level: string;
};
export type SigmaRule = SigmaRaw & { technique: string };
export type Ctx = { techniques: Set<string>; iocs: Set<string> };

export const LEVELS = ["informational", "low", "medium", "high", "critical"] as const;
export const PRODUCTS = ["windows", "linux", "macos", "azure", "aws", "gcp", "m365", "okta", "github", "cisco", "fortinet", "paloalto", "zeek"] as const;
export const CATEGORIES = [
  "process_creation", "network_connection", "dns_query", "file_event", "file_access", "file_delete", "registry_set", "registry_event",
  "registry_add", "image_load", "ps_script", "ps_module", "pipe_created", "driver_load", "create_remote_thread", "process_access",
  "wmi_event", "proxy", "firewall", "webserver", "dns", "antivirus", "application",
] as const;
export const MODIFIERS = ["contains", "startswith", "endswith", "re", "cidr", "windash", "base64offset"] as const;

const NAME = /^[a-z][a-z0-9_]{0,30}$/;
const FIELD = /^[A-Za-z][A-Za-z0-9_.-]{0,60}$/;
const TECH = /^T\d{4}(\.\d{3})?$/;
const IPV4 = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const HASH = /\b(?:[a-f0-9]{64}|[a-f0-9]{40}|[a-f0-9]{32})\b/gi;
const KEYWORDS = new Set(["and", "or", "not", "of", "them", "all", "1"]);

/** Indirizzi non instradabili (loopback, privati, link-local): non sono indicatori. */
export const isNonRoutable = (ip: string) => /^(0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);

/** Verifica che la condizione sia ben formata e citi solo selezioni definite. */
export function conditionErrors(condition: string, names: string[]) {
  const errors: string[] = [];
  const tokens = condition.match(/\(|\)|[A-Za-z0-9_*]+|\S/g) ?? [];
  let depth = 0;
  let refs = 0;
  for (const t of tokens) {
    if (t === "(") depth++;
    else if (t === ")") {
      if (--depth < 0) errors.push("parentesi non bilanciate");
    } else if (KEYWORDS.has(t)) continue;
    else if (/^[A-Za-z0-9_*]+$/.test(t)) {
      const re = new RegExp(`^${t.replace(/\*/g, ".*")}$`);
      if (names.some((n) => re.test(n))) refs++;
      else errors.push(`la condizione cita «${t}», che non è una selezione`);
    } else errors.push(`simbolo non ammesso nella condizione: «${t}»`);
  }
  if (depth > 0) errors.push("parentesi non bilanciate");
  if (!refs && !/\bthem\b/.test(condition)) errors.push("la condizione non usa nessuna selezione");
  return [...new Set(errors)];
}

/** Valida una regola proposta. Restituisce gli errori (vuoto = valida) e la regola normalizzata. */
export function validateRule(raw: SigmaRaw, ctx: Ctx): { rule: SigmaRule | null; errors: string[] } {
  const errors: string[] = [];
  const technique = String(raw.technique ?? "").trim().toUpperCase();
  if (!TECH.test(technique)) errors.push(`tecnica non valida: «${raw.technique}»`);
  else if (!ctx.techniques.has(technique)) errors.push(`la tecnica ${technique} non è tra quelle del report`);

  const title = String(raw.title ?? "").trim();
  if (title.length < 5 || title.length > 120) errors.push("titolo assente o troppo lungo");
  const description = String(raw.description ?? "").trim();
  if (description.length < 10 || description.length > 500) errors.push("descrizione assente o troppo lunga");
  if (!LEVELS.includes(raw.level as (typeof LEVELS)[number])) errors.push(`livello non valido: «${raw.level}»`);

  const ls = raw.logsource ?? {};
  if (ls.product && !PRODUCTS.includes(ls.product as (typeof PRODUCTS)[number])) errors.push(`prodotto non riconosciuto: «${ls.product}»`);
  if (ls.category && !CATEGORIES.includes(ls.category as (typeof CATEGORIES)[number])) errors.push(`categoria non riconosciuta: «${ls.category}»`);
  if (ls.service && !/^[a-z0-9_-]{2,30}$/.test(ls.service)) errors.push(`servizio non valido: «${ls.service}»`);
  if (!ls.category && !ls.service) errors.push("logsource senza categoria né servizio");

  const selections = raw.selections ?? [];
  const names = selections.map((s) => s.name);
  if (!selections.length) errors.push("nessuna selezione");
  if (new Set(names).size !== names.length) errors.push("nomi di selezione duplicati");
  for (const s of selections) {
    if (!NAME.test(s.name) || KEYWORDS.has(s.name)) errors.push(`nome di selezione non valido: «${s.name}»`);
    if (!s.fields?.length) errors.push(`la selezione «${s.name}» è vuota`);
    // la stessa chiave due volte nello YAML è un file non valido (o la seconda sovrascrive la prima)
    const keys = (s.fields ?? []).map((f) => [f.field, f.modifier ?? "", f.all ? "all" : ""].join("|"));
    if (new Set(keys).size !== keys.length) errors.push(`la selezione «${s.name}» ripete lo stesso campo: usa selezioni separate`);
    for (const f of s.fields ?? []) {
      if (!FIELD.test(f.field)) errors.push(`campo non valido: «${f.field}»`);
      if (f.modifier && !MODIFIERS.includes(f.modifier as (typeof MODIFIERS)[number])) errors.push(`modificatore non ammesso: «${f.modifier}»`);
      if (!f.values?.length || f.values.length > 30) errors.push(`il campo «${f.field}» ha 0 o troppi valori`);
      for (const v of f.values ?? []) {
        const val = String(v);
        if (!val.trim() || val.length > 300) errors.push(`valore vuoto o troppo lungo in «${f.field}»`);
        if (f.modifier === "re") {
          try {
            new RegExp(val);
          } catch {
            errors.push(`espressione regolare non valida in «${f.field}»`);
          }
        }
        // IP e hash: solo quelli del report, mai inventati
        for (const m of [...(val.match(IPV4) ?? []).filter((ip) => !isNonRoutable(ip)), ...(val.match(HASH) ?? [])]) {
          if (!ctx.iocs.has(m.toLowerCase())) errors.push(`l'indicatore ${m} non è tra quelli del report`);
        }
      }
    }
  }
  errors.push(...conditionErrors(String(raw.condition ?? ""), names));

  const falsepositives = (raw.falsepositives ?? []).map((x) => String(x).trim()).filter(Boolean).slice(0, 5);
  const unique = [...new Set(errors)];
  return unique.length
    ? { rule: null, errors: unique }
    : { rule: { ...raw, technique, title, description, falsepositives: falsepositives.length ? falsepositives : ["Da valutare nell'ambiente"] }, errors: [] };
}

/** Stringa YAML a virgolette singole: nessun carattere interpretato. */
const q = (s: string) => `'${String(s).replace(/'/g, "''").replace(/[\r\n]+/g, " ")}'`;

/** Scrive la regola in YAML Sigma. */
export function toYaml(rule: SigmaRule, meta: { id: string; date: string; reference: string }) {
  const lines = [
    `title: ${q(rule.title)}`,
    `id: ${meta.id}`,
    "status: experimental",
    `description: ${q(rule.description)}`,
    "references:",
    `  - ${q(meta.reference)}`,
    `author: ${q("ThreatBrief (bozza generata con IA, da testare)")}`,
    `date: ${meta.date.replace(/-/g, "/")}`,
    "tags:",
    `  - attack.${rule.technique.toLowerCase()}`,
    "logsource:",
    ...(["product", "category", "service"] as const).filter((k) => rule.logsource[k]).map((k) => `  ${k}: ${rule.logsource[k]}`),
    "detection:",
  ];
  for (const s of rule.selections) {
    lines.push(`  ${s.name}:`);
    for (const f of s.fields) {
      const key = [f.field, f.modifier, f.all && f.values.length > 1 ? "all" : null].filter(Boolean).join("|");
      lines.push(`    ${key}:`, ...f.values.map((v) => `      - ${q(v)}`));
    }
  }
  lines.push(`  condition: ${rule.condition.trim()}`, "falsepositives:", ...rule.falsepositives.map((f) => `  - ${q(f)}`), `level: ${rule.level}`);
  return `${lines.join("\n")}\n`;
}
