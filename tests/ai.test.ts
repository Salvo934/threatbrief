import { describe, expect, it } from "vitest";
import { normalizeForMatch, quoteInSource, unknownNumbers, validateAdvisoryAi } from "@/lib/ai/guard";
import { mergeAiDraft } from "@/lib/defense/ai-draft";
import { composeDraft } from "@/lib/defense/rules";

const source = "LAUNDRY BEAR has targeted users in organizations associated with the Defense Industrial Base (DIB). The actors sent spearphishing emails with malicious SVG attachments.";

describe("IA: controlli sulle risposte", () => {
  it("accetta solo citazioni presenti nella fonte, tollerando spazi e virgolette tipografiche", () => {
    expect(normalizeForMatch("  A  “b”  ")).toBe('a "b"');
    expect(quoteInSource("“The actors sent  spearphishing emails with malicious SVG attachments.”", source)).toBe(true);
    expect(quoteInSource("The actors exploited a VPN zero-day in the DIB", source)).toBe(false);
    expect(quoteInSource("the DIB", source)).toBe(false); // troppo corta per dimostrare qualcosa
  });

  it("scarta fatti con citazioni inventate e tecniche inesistenti o senza prova", () => {
    const ai = validateAdvisoryAi(
      {
        summary: "Un gruppo russo ha colpito la filiera della difesa.",
        impact: "Rilevante per i fornitori.",
        actions: ["Bloccare gli allegati SVG dalla posta esterna."],
        facts: [
          { text: "Colpita la filiera della difesa.", quote: "has targeted users in organizations associated with the Defense Industrial Base" },
          { text: "Usato uno zero-day.", quote: "exploited a previously unknown vulnerability in the VPN" },
        ],
        techniques: [
          { id: "t1566.001", quote: "sent spearphishing emails with malicious SVG attachments" },
          { id: "T9999", quote: "sent spearphishing emails with malicious SVG attachments" },
          { id: "T1190", quote: "exploited a public-facing application of the victim" },
          { id: "T1566.001", quote: "sent spearphishing emails with malicious SVG attachments" },
        ],
      },
      source,
      new Set(["T1566.001", "T1190"]),
    );
    expect(ai?.facts.map((f) => f.text)).toEqual(["Colpita la filiera della difesa."]);
    expect(ai?.techniques.map((t) => t.id)).toEqual(["T1566.001"]);
    expect(ai?.rejected).toBe(4);
  });

  it("senza almeno un fatto verificabile la bozza resta a modello", () => {
    expect(validateAdvisoryAi({ summary: "x", impact: "", actions: [], facts: [{ text: "x", quote: "inventata di sana pianta, non nel testo" }], techniques: [] }, source, new Set())).toBeNull();
  });

  it("trova i numeri che non compaiono nei dati", () => {
    const data = { rivendicazioni: 54, malware: [{ segnalazioni: 1339 }] };
    expect(unknownNumbers("Nelle ultime 24 ore 54 rivendicazioni e 1.339 segnalazioni.", data)).toEqual([]);
    expect(unknownNumbers("Le rivendicazioni sono 60, il 20% in più.", data)).toEqual(["60", "20"]);
  });
});

describe("IA: bozza unita", () => {
  const draft = composeDraft({
    advisory: { title: "Russian actors", url: "https://www.cisa.gov/x", published_at: "2026-07-21T12:00:00Z", summaryEn: "A group..." },
    reasons: [{ label: "cita la filiera della difesa (Defense Industrial Base)", evidence: "targeted the DIB." }],
    actors: [],
    techniqueCount: 3,
    cves: [{ id: "CVE-2025-66376", kev: true, ransomware: false }],
    mitigations: [],
    d3fend: [],
  });
  const ai = {
    summary: "Sintesi IA.", impact: "Impatto IA.", actions: ["Bloccare gli SVG.", "Formare gli utenti."],
    facts: [{ text: "Colpita la difesa.", quote: "targeted users in the DIB sector" }], techniques: [], rejected: 0,
  };

  it("tiene la patch delle CVE sfruttate come prima azione e dichiara l'IA", () => {
    const m = mergeAiDraft(draft, ai, ["CVE-2025-66376"]);
    expect(m.actions[0]).toContain("CVE-2025-66376");
    expect(m.actions).toHaveLength(3);
    expect(m.impact).toContain("scritto con IA");
    expect(m.tech_notes).toMatch(/^Sintesi, impatto, azioni e fatti chiave scritti con IA/);
  });

  it("mantiene la valutazione del rischio come regola e i fatti IA con la citazione", () => {
    const m = mergeAiDraft(draft, ai, []);
    expect(m.risk).toBe(draft.risk);
    expect(m.statements.filter((s) => s.kind === "valutazione")).toHaveLength(1);
    expect(m.statements.some((s) => s.section === "tecnica" && s.body.includes("«targeted users in the DIB sector»"))).toBe(true);
    expect(m.statements.filter((s) => s.section === "executive").length).toBeLessThanOrEqual(4);
  });
});
