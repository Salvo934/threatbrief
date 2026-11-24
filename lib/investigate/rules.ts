/**
 * Verifica del dossier dell'agente (regole pure, testabili). L'agente propone; qui si tiene solo
 * ciò che è verificabile: fonti autorizzate, citazioni ritrovate nella pagina, tecniche esistenti.
 * Il codice Admiralty è calcolato: affidabilità dalla tabella delle fonti, credibilità dal numero
 * di editori indipendenti che confermano l'affermazione.
 */
import { z } from "zod";
import { clip, quoteInSource } from "../ai/guard";
import { TRUSTED_SOURCES, type TrustedSource } from "./config";

const Src = z.object({ url: z.string(), quote: z.string() });
export const DossierSchema = z.object({
  subject: z.string().default(""),
  summary_it: z.string().default(""),
  aliases: z.array(z.object({ name: z.string(), url: z.string(), quote: z.string() })).default([]),
  claims: z.array(z.object({ text_it: z.string(), sources: z.array(Src).default([]) })).default([]),
  assessments: z.array(z.object({ text_it: z.string(), confidence: z.string() })).default([]),
  techniques: z.array(z.object({ id: z.string(), url: z.string(), quote: z.string() })).default([]),
  contradictions: z.array(z.object({ text_it: z.string(), sources: z.array(Src).default([]) })).default([]),
  actions_it: z.array(z.string()).default([]),
  gaps: z.array(z.string()).default([]),
});
export type Dossier = z.infer<typeof DossierSchema>;

/** Fonte autorizzata a cui appartiene l'URL (dominio o sottodominio), altrimenti null. */
export function trustedSourceFor(url: string): TrustedSource | null {
  let host: string;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    host = u.hostname.toLowerCase();
  } catch {
    return null;
  }
  return TRUSTED_SOURCES.find((s) => host === s.domain || host.endsWith(`.${s.domain}`)) ?? null;
}

/** URL senza frammento e senza slash finale, per riconoscere la stessa pagina. */
export const canonicalUrl = (url: string) => {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
};

/** Testo leggibile di una pagina HTML (senza script, stili e tag). */
export function htmlToText(html: string) {
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;|&ndash;/g, "-")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export type VerifiedSource = { url: string; quote: string; source: TrustedSource };
export type VerifiedClaim = { text: string; sources: VerifiedSource[]; publishers: number; credibility: 1 | 2 | 3 };

/** Admiralty, credibilità: 1 confermata da editori indipendenti; 2 probabilmente vera; 3 possibilmente vera. */
export function credibilityFor(sources: VerifiedSource[]): 1 | 2 | 3 {
  const publishers = new Set(sources.map((s) => s.source.publisher));
  if (publishers.size >= 2) return 1;
  return sources.some((s) => s.source.reliability === "A") ? 2 : 3;
}

/**
 * `pages` contiene il testo delle pagine citate (null = non raggiungibile). Una fonte è valida se
 * il sito è autorizzato e la citazione si ritrova nella pagina.
 */
export function verifyDossier(d: Dossier, pages: Map<string, string | null>, validTechniques: Set<string>) {
  const stats = { claimsProposed: d.claims.length, claimsKept: 0, sourcesRejected: 0, techniquesRejected: 0 };
  const check = (s: { url: string; quote: string }): VerifiedSource | null => {
    const source = trustedSourceFor(s.url);
    const text = pages.get(canonicalUrl(s.url));
    if (!source || !text || !quoteInSource(s.quote, text)) {
      stats.sourcesRejected++;
      return null;
    }
    return { url: canonicalUrl(s.url), quote: clip(s.quote, 300), source };
  };

  const claims: VerifiedClaim[] = [];
  for (const c of d.claims) {
    const sources = c.sources.map(check).filter((s): s is VerifiedSource => s !== null);
    if (!c.text_it.trim() || !sources.length) continue;
    claims.push({ text: clip(c.text_it, 280), sources, publishers: new Set(sources.map((s) => s.source.publisher)).size, credibility: credibilityFor(sources) });
  }
  stats.claimsKept = claims.length;

  const seen = new Set<string>();
  const techniques = d.techniques.flatMap((t) => {
    const id = t.id.trim().toUpperCase();
    const src = check(t);
    if (!validTechniques.has(id) || seen.has(id) || !src) {
      stats.techniquesRejected++;
      return [];
    }
    seen.add(id);
    return [{ id, source: src }];
  });

  const aliases = d.aliases.flatMap((a) => {
    const src = check(a);
    return src && a.name.trim() ? [{ name: clip(a.name, 80), source: src }] : [];
  });
  const contradictions = d.contradictions.flatMap((c) => {
    const sources = c.sources.map(check).filter((s): s is VerifiedSource => s !== null);
    return sources.length && c.text_it.trim() ? [{ text: clip(c.text_it, 400), sources }] : [];
  });
  const assessments = d.assessments
    .filter((a) => a.text_it.trim())
    .slice(0, 4)
    .map((a) => ({
      text: clip(a.text_it, 280),
      confidence: (["alto", "medio", "basso"].includes(a.confidence.trim().toLowerCase()) ? a.confidence.trim().toLowerCase() : "basso") as "alto" | "medio" | "basso",
    }));

  return {
    subject: clip(d.subject, 120),
    summary: clip(d.summary_it, 900),
    claims,
    techniques,
    aliases,
    contradictions,
    assessments,
    actions: d.actions_it.map((a) => clip(a, 160)).filter(Boolean).slice(0, 3),
    gaps: d.gaps.map((g) => clip(g, 300)).filter(Boolean).slice(0, 8),
    stats,
  };
}

export type VerifiedDossier = ReturnType<typeof verifyDossier>;

/** Tutti gli URL citati nel dossier (da scaricare e verificare). */
export function citedUrls(d: Dossier) {
  const all = [
    ...d.claims.flatMap((c) => c.sources),
    ...d.techniques,
    ...d.aliases,
    ...d.contradictions.flatMap((c) => c.sources),
  ].map((s) => s.url);
  return [...new Set(all.filter((u) => trustedSourceFor(u)).map(canonicalUrl))];
}

const CRED_LABEL = { 1: "confermata da editori indipendenti", 2: "probabilmente vera", 3: "possibilmente vera" } as const;

/** Contenuto della bozza di report: fonti (una per URL, con Admiralty), fatti, valutazioni, note. */
export function composeDossierReport(v: VerifiedDossier, origin: { title: string }) {
  // Una riga fonte per URL; credibilità = la migliore tra le affermazioni che la usano.
  const sources = new Map<string, { url: string; publisher: string; reliability: "A" | "B"; credibility: 1 | 2 | 3 }>();
  for (const c of v.claims) {
    for (const s of c.sources) {
      const prev = sources.get(s.url);
      sources.set(s.url, { url: s.url, publisher: s.source.publisher, reliability: s.source.reliability, credibility: prev ? (Math.min(prev.credibility, c.credibility) as 1 | 2 | 3) : c.credibility });
    }
  }
  const sorted = [...v.claims].sort((a, b) => a.credibility - b.credibility || b.publishers - a.publishers);
  const statements = [
    ...sorted.slice(0, 3).map((c) => ({ section: "executive" as const, kind: "fatto" as const, url: c.sources[0].url, body: clip(`${c.text} (${CRED_LABEL[c.credibility]}${c.publishers > 1 ? `: ${c.publishers} editori` : ""})`, 300) })),
    ...v.assessments.slice(0, 1).map((a) => ({ section: "executive" as const, kind: "valutazione" as const, confidence: a.confidence, body: clip(`${a.text} (valutazione scritta con IA, da confermare)`, 300) })),
    ...sorted.map((c) => ({
      section: "tecnica" as const, kind: "fatto" as const, url: c.sources[0].url,
      body: clip(`${c.text} — ${c.sources.map((s) => `${s.source.publisher}: «${s.quote}»`).join(" · ")}`, 1000),
    })),
    ...v.assessments.slice(1).map((a) => ({ section: "tecnica" as const, kind: "valutazione" as const, confidence: a.confidence, body: clip(`${a.text} (valutazione scritta con IA)`, 1000) })),
  ];
  const notes = [
    `Dossier dell'agente investigatore a partire da «${origin.title}». Affermazioni proposte: ${v.stats.claimsProposed}, verificate: ${v.stats.claimsKept}; fonti scartate perché la citazione non si ritrova nella pagina o il sito non è autorizzato: ${v.stats.sourcesRejected}. Codice Admiralty calcolato: affidabilità dalla tabella delle fonti, credibilità dal numero di editori indipendenti.`,
    v.aliases.length ? `Nomi usati da altre fonti: ${v.aliases.map((a) => (a.name.includes("(") ? a.name : `${a.name} (${a.source.source.publisher})`)).join("; ")}.` : "",
    v.contradictions.length ? `Dove le fonti non concordano:\n${v.contradictions.map((c) => `- ${c.text} [${c.sources.map((s) => s.source.publisher).join(", ")}]`).join("\n")}` : "",
    v.gaps.length ? `Lacune:\n${v.gaps.map((g) => `- ${g}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");

  return { sources: [...sources.values()], statements, notes };
}
