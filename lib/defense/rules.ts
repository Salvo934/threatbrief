/**
 * Difesa e aerospazio: regole pure per riconoscere gli avvisi rilevanti e comporre la bozza di
 * report. Nessuna intelligenza artificiale: solo corrispondenze esplicite nel testo dell'avviso,
 * ognuna con la frase che la giustifica. Import relativi: usato anche dallo script di ingestion.
 */

/** Motivi di rilevanza. `core` = basta da solo per segnalare l'avviso. */
const REASONS: { re: RegExp; label: string; core: boolean }[] = [
  { re: /Defen[cs]e Industrial Base|\bDIB\b/g, label: "cita la filiera della difesa (Defense Industrial Base)", core: true },
  { re: /\baerospace\b|\baviation\b|\bavionics\b/gi, label: "cita il settore aerospaziale", core: true },
  { re: /\bdefen[cs]e (?:sector|contractors?|industry|industries|companies|organi[sz]ations?|ministr(?:y|ies)|entities)\b/gi, label: "cita aziende o enti della difesa", core: true },
  { re: /\bmilitary (?:targets?|networks?|organi[sz]ations?|entities|personnel|units?)\b|\barmed forces\b/gi, label: "cita obiettivi militari", core: true },
  { re: /\bNATO\b/g, label: "cita la NATO", core: true },
  { re: /Italian (?:External|Internal) Intelligence and Security Agency|Agenzia per la Cybersicurezza Nazionale|National Cybersecurity Agency of Italy/g, label: "è firmato anche da agenzie italiane", core: false },
  { re: /\bItal(?:y|ian)\b/g, label: "cita l'Italia", core: false },
  { re: /state[- ](?:sponsored|supported|backed)|government[- ]linked|nation[- ]state/gi, label: "attribuisce l'attività a un attore legato a uno stato", core: false },
];

/**
 * Frasi «di servizio» presenti in molti avvisi (contatti, guide, elenco delle agenzie firmatarie):
 * una corrispondenza lì non dice nulla sulle vittime. Es. il contatto NSA «Defense Industrial Base Inquiries».
 */
const BOILERPLATE = /Inquiries|@|Contact|Attack Surface Management|Cybersecurity Services|NSA['’]s|offerings? for the|\bsee:|Intelligence and Security Agency|Counterintelligence|Intelligence Service|National Cyber Security Centre|Cybersecurity Agency|Download the PDF/i;

export type Reason = { label: string; evidence: string };

/** Frase che contiene la corrispondenza, accorciata a ~220 caratteri. */
function sentenceAround(text: string, index: number) {
  const start = Math.max(text.lastIndexOf(". ", index) + 2, index - 160, 0);
  const endDot = text.indexOf(". ", index);
  const end = Math.min(endDot === -1 ? text.length : endDot + 1, index + 160);
  const s = text.slice(start, end).trim();
  return (start > 0 && text[start - 2] !== "." ? "…" : "") + s + (end < text.length && !s.endsWith(".") ? "…" : "");
}

/** Motivi per cui l'avviso riguarda la difesa; vuoto se nessun motivo «core». */
export function defenseReasons(body: string, title = ""): Reason[] {
  // Il titolo conta come prima frase (es. «Russian State-Sponsored Targeting»).
  const text = title ? `${title}. ${body}` : body;
  const out: Reason[] = [];
  for (const r of REASONS) {
    const signed = r.label.startsWith("è firmato");
    for (const m of text.matchAll(r.re)) {
      const evidence = sentenceAround(text, m.index);
      // Per le agenzie firmatarie la frase di servizio è proprio l'evidenza; per gli altri motivi no.
      if (!signed && BOILERPLATE.test(evidence)) continue;
      out.push({ label: r.label, evidence: signed ? m[0] : evidence });
      break;
    }
  }
  return out.some((o) => REASONS.find((r) => r.label === o.label)!.core) ? out : [];
}

export const extractTechniques = (text: string) =>
  [...new Set(text.match(/\bT1\d{3}(?:\.\d{3})?\b/g) ?? [])].sort();
export const extractCves = (text: string) =>
  [...new Set((text.match(/\bCVE-\d{4}-\d{4,}\b/gi) ?? []).map((c) => c.toUpperCase()))].sort();

export type GroupRef = { id: string; external_id: string; name: string; aliases: string[] };

/** Alias che sono anche parole comuni in inglese: troppo rischiosi da cercare in un testo. */
const RISKY_ALIASES = new Set(["Equation", "Leviathan", "Moonstone", "Ember", "Static", "Indrik", "Storm"]);

/**
 * Gruppi ATT&CK citati per nome o alias (maiuscole esatte, parola intera, almeno 5 caratteri).
 * È un fatto («l'avviso cita X»), non un'attribuzione fatta dall'app.
 */
export function findActors(text: string, groups: GroupRef[]) {
  const out: { id: string; external_id: string; name: string; alias: string }[] = [];
  for (const g of groups) {
    for (const a of [g.name, ...g.aliases]) {
      if (a.length < 5 || RISKY_ALIASES.has(a)) continue;
      const re = new RegExp(`(?<![\\w-])${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`);
      if (re.test(text)) {
        out.push({ id: g.id, external_id: g.external_id, name: g.name, alias: a });
        break;
      }
    }
  }
  return out;
}

/** «Executive Summary» dell'avviso CISA (in inglese), se presente. */
export function executiveSummary(text: string, max = 280) {
  const m = /Executive Summary\s+([\s\S]+)/i.exec(text);
  if (!m) return null;
  const s = m[1].replace(/\s+/g, " ").trim();
  return s.length <= max ? s : `${s.slice(0, s.lastIndexOf(" ", max - 1))}…`;
}

const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, s.lastIndexOf(" ", n - 1))}…`);

export type DraftInput = {
  advisory: { title: string; url: string; published_at: string; summaryEn: string | null };
  reasons: Reason[];
  actors: { external_id: string; name: string; alias: string }[];
  techniqueCount: number;
  cves: { id: string; kev: boolean; ransomware: boolean }[];
  mitigations: { external_id: string; name: string; techniques: number }[];
  d3fend: { label: string; tactic: string }[];
};

/**
 * Bozza di report: testo in italiano costruito solo con fatti dell'avviso. Le parti di giudizio
 * (rischio, impatto) sono suggerimenti dichiarati, con confidenza bassa, da confermare.
 */
export function composeDraft(i: DraftInput) {
  const day = new Date(i.advisory.published_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });
  const on = /^(8|11) /.test(day) ? `L'${day}` : `Il ${day}`;
  const date = day;
  const kev = i.cves.filter((c) => c.kev);
  const stateLinked = i.reasons.some((r) => r.label.startsWith("attribuisce"));
  const defenseReasonsText = i.reasons.filter((r) => !r.label.startsWith("attribuisce")).map((r) => r.label);
  const actorNames = i.actors.map((a) => (a.alias === a.name ? a.name : `${a.alias} (${a.name})`));

  const risk: "alto" | "medio" = (stateLinked && defenseReasonsText.length > 0) || kev.length > 0 ? "alto" : "medio";
  const riskWhy = [
    stateLinked && "attore legato a uno stato",
    defenseReasonsText.length && "obiettivi nella difesa",
    kev.length && `${kev.length} ${kev.length === 1 ? "vulnerabilità già sfruttata" : "vulnerabilità già sfruttate"} (CISA KEV)`,
  ].filter(Boolean).join(", ");

  const summary = clip(
    `${on} la CISA, con agenzie partner, ha pubblicato l'avviso «${i.advisory.title}». ` +
      `L'avviso ${defenseReasonsText.join(", ")}` +
      (actorNames.length ? `; attori citati: ${actorNames.join(", ")}` : "") +
      `. Documenta ${i.techniqueCount} tecniche MITRE ATT&CK` +
      (i.cves.length
        ? ` e ${i.cves.length} vulnerabilità (CVE)` +
          (kev.length === 0 ? "" : kev.length === i.cves.length ? `, ${i.cves.length === 1 ? "già sfruttata" : "tutte già sfruttate"} secondo il catalogo CISA KEV` : `, di cui ${kev.length} già ${kev.length === 1 ? "sfruttata" : "sfruttate"} secondo il catalogo CISA KEV`)
        : "") +
      ".",
    900,
  );

  const actions: string[] = [];
  if (kev.length) {
    const list = kev.slice(0, 4).map((c) => c.id).join(", ") + (kev.length > 4 ? ` e altre ${kev.length - 4}` : "");
    actions.push(clip(`Applicare con priorità le patch per ${list} (già sfruttate, catalogo CISA KEV).`, 160));
  }
  for (const m of i.mitigations) {
    if (actions.length >= 3) break;
    actions.push(clip(`${m.name} (${m.external_id}): copre ${m.techniques} tecniche descritte nell'avviso.`, 160));
  }

  if (!actions.length) actions.push("Verificare l'esposizione ai sistemi citati e applicare le raccomandazioni della sezione «Mitigations» dell'avviso.");

  const statements = [
    { section: "executive" as const, kind: "fatto" as const, body: clip(`L'avviso «${i.advisory.title}» è stato pubblicato il ${date} dalla CISA con agenzie partner.`, 300) },
    ...i.reasons.slice(0, 2).map((r) => ({ section: "executive" as const, kind: "fatto" as const, body: clip(`L'avviso ${r.label}: «${r.evidence}»`, 300) })),
    {
      section: "executive" as const, kind: "valutazione" as const, confidence: "basso" as const,
      body: clip(`Valutazione automatica, da confermare: rischio ${risk}${riskWhy ? ` (${riskWhy})` : ""}.`, 300),
    },
    ...(i.advisory.summaryEn ? [{ section: "tecnica" as const, kind: "fatto" as const, body: clip(`Sintesi dell'avviso (originale in inglese): «${i.advisory.summaryEn}»`, 1000) }] : []),
    ...(actorNames.length ? [{ section: "tecnica" as const, kind: "fatto" as const, body: `Attori citati nell'avviso (corrispondenza con MITRE ATT&CK): ${i.actors.map((a) => `${a.alias} = ${a.name} ${a.external_id}`).join("; ")}.` }] : []),
    ...(i.cves.length ? [{ section: "tecnica" as const, kind: "fatto" as const, body: `Vulnerabilità citate: ${i.cves.map((c) => `${c.id}${c.kev ? (c.ransomware ? " (KEV, usata dal ransomware)" : " (KEV)") : ""}`).join(", ")}.` }] : []),
  ];

  const tech_notes = [
    "Bozza generata automaticamente da ThreatBrief a partire dall'avviso ufficiale: da verificare prima della pubblicazione.",
    i.d3fend.length ? `Contromisure MITRE D3FEND suggerite per le tecniche dell'avviso: ${i.d3fend.map((d) => `${d.label} (${d.tactic})`).join(", ")}.` : "",
  ].filter(Boolean).join("\n\n");

  return {
    risk,
    summary,
    impact: clip(
      `Da confermare: potenzialmente rilevante per le organizzazioni della difesa e dell'aerospazio e per i loro fornitori, ` +
        `che possono essere usati come punto di ingresso verso il committente.`,
      500,
    ),
    actions,
    statements,
    tech_notes,
  };
}
