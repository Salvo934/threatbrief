import { describe, expect, it } from "vitest";
import { allowedHosts, TRUSTED_SOURCES } from "@/lib/investigate/config";
import { canonicalUrl, citedUrls, composeDossierReport, credibilityFor, DossierSchema, htmlToText, trustedSourceFor, verifyDossier } from "@/lib/investigate/rules";

const CISA = "https://www.cisa.gov/news-events/cybersecurity-advisories/aa26-202a";
const MS = "https://www.microsoft.com/en-us/security/blog/2026/05/void-blizzard";
const PAGES = new Map<string, string | null>([
  [CISA, "LAUNDRY BEAR has targeted users in organizations associated with the Defense Industrial Base (DIB). The actors sent spearphishing emails with malicious SVG attachments."],
  [MS, "Microsoft tracks this actor as Void Blizzard. Void Blizzard has targeted defense organizations in Europe and NATO member states since 2024."],
]);

describe("Agente investigatore: fonti autorizzate", () => {
  it("riconosce domini e sottodomini autorizzati, rifiuta gli altri e gli schemi strani", () => {
    expect(trustedSourceFor("https://www.cisa.gov/x")?.reliability).toBe("A");
    expect(trustedSourceFor("https://unit42.paloaltonetworks.com/a")?.reliability).toBe("B");
    expect(trustedSourceFor("https://cisa.gov.evil.example/x")).toBeNull();
    expect(trustedSourceFor("https://evilcisa.gov/x")).toBeNull();
    expect(trustedSourceFor("javascript:alert(1)")).toBeNull();
  });

  it("tiene entro i limiti di Managed Agents la lista dei domini", () => {
    expect(TRUSTED_SOURCES.length).toBeLessThanOrEqual(64);
    expect(new Set(TRUSTED_SOURCES.map((s) => s.domain)).size).toBe(TRUSTED_SOURCES.length);
    expect(allowedHosts()).toContain("*.cisa.gov");
  });

  it("estrae il testo da HTML ignorando script e stili", () => {
    expect(htmlToText("<p>Ciao&nbsp;<b>mondo</b></p><script>alert('x')</script><style>p{}</style>")).toBe("Ciao mondo");
  });

  it("credibilità Admiralty: 1 con editori indipendenti, 2 con una sola fonte governativa, 3 con un solo vendor", () => {
    const a = { url: CISA, quote: "q", source: trustedSourceFor(CISA)! };
    const b = { url: MS, quote: "q", source: trustedSourceFor(MS)! };
    expect(credibilityFor([a, b])).toBe(1);
    expect(credibilityFor([a])).toBe(2);
    expect(credibilityFor([b])).toBe(3);
  });
});

describe("Agente investigatore: verifica del dossier", () => {
  const dossier = DossierSchema.parse({
    subject: "LAUNDRY BEAR / Void Blizzard",
    summary_it: "Sintesi.",
    aliases: [{ name: "Void Blizzard", url: MS, quote: "Microsoft tracks this actor as Void Blizzard." }],
    claims: [
      { text_it: "Colpisce la filiera della difesa.", sources: [
        { url: CISA, quote: "has targeted users in organizations associated with the Defense Industrial Base" },
        { url: MS + "#top", quote: "Void Blizzard has targeted defense organizations in Europe and NATO member states" },
      ] },
      { text_it: "Usa allegati SVG.", sources: [{ url: CISA, quote: "sent spearphishing emails with malicious SVG attachments" }] },
      { text_it: "Inventata.", sources: [{ url: CISA, quote: "exploited a zero-day in the VPN appliance of the victim" }] },
      { text_it: "Da sito non autorizzato.", sources: [{ url: "https://blog.example.com/x", quote: "sent spearphishing emails with malicious SVG attachments" }] },
    ],
    assessments: [{ text_it: "Probabile spionaggio.", confidence: "Medio" }],
    techniques: [
      { id: "T1566.001", url: CISA, quote: "sent spearphishing emails with malicious SVG attachments" },
      { id: "T9999", url: CISA, quote: "sent spearphishing emails with malicious SVG attachments" },
    ],
    gaps: ["Nessun IOC pubblico."],
  });

  it("scarica solo le pagine dei siti autorizzati, senza duplicati", () => {
    expect(citedUrls(dossier)).toEqual([CISA, MS]);
    expect(canonicalUrl(MS + "#top")).toBe(MS);
  });

  it("tiene solo affermazioni con citazioni ritrovate nella pagina e calcola la credibilità", () => {
    const v = verifyDossier(dossier, PAGES, new Set(["T1566.001"]));
    expect(v.claims.map((c) => [c.text, c.credibility])).toEqual([
      ["Colpisce la filiera della difesa.", 1],
      ["Usa allegati SVG.", 2],
    ]);
    expect(v.techniques.map((t) => t.id)).toEqual(["T1566.001"]);
    expect(v.aliases.map((a) => a.name)).toEqual(["Void Blizzard"]);
    expect(v.assessments[0].confidence).toBe("medio");
    expect(v.stats).toMatchObject({ claimsProposed: 4, claimsKept: 2, techniquesRejected: 1 });
  });

  it("compone il report: una fonte per URL con Admiralty, fatti nel brief entro i limiti", () => {
    const c = composeDossierReport(verifyDossier(dossier, PAGES, new Set(["T1566.001"])), { title: "Avviso" });
    expect(c.sources).toEqual([
      { url: CISA, publisher: "CISA (USA)", reliability: "A", credibility: 1 },
      { url: MS, publisher: "Microsoft Threat Intelligence", reliability: "B", credibility: 1 },
    ]);
    const exec = c.statements.filter((s) => s.section === "executive");
    expect(exec.length).toBeLessThanOrEqual(4);
    expect(exec.every((s) => s.body.length <= 300)).toBe(true);
    expect(exec[0].body).toContain("confermata da editori indipendenti: 2 editori");
    expect(c.notes).toContain("Void Blizzard (Microsoft Threat Intelligence)");
    expect(c.notes).toContain("Nessun IOC pubblico.");
  });
});
