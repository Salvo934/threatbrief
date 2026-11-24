import { describe, expect, it } from "vitest";
import { composeDraft, defenseReasons, executiveSummary, extractCves, extractTechniques, findActors } from "@/lib/defense/rules";

describe("Difesa e aerospazio: rilevamento", () => {
  it("segnala l'avviso quando le vittime includono la filiera della difesa, con la frase come prova", () => {
    const r = defenseReasons("The group has targeted organizations in the Defense Industrial Base (DIB), energy and media. Other text.");
    expect(r[0].label).toMatch(/Defense Industrial Base/);
    expect(r[0].evidence).toContain("has targeted organizations");
  });

  it("ignora le frasi di servizio (contatti NSA, guide)", () => {
    const text = "Phishing against AI companies. For PDNS see: NSA's Protective DNS Service offerings for the US Defense Industrial Base. Defense Industrial Base Inquiries and Cybersecurity Services: DIB_Defense@cyber.nsa.gov. See NSA's Attack Surface Management for the US Defense Industrial Base (DIB).";
    expect(defenseReasons(text)).toEqual([]);
  });

  it("non scambia un'agenzia firmataria militare per un obiettivo, ma riconosce le agenzie italiane", () => {
    const text = "Authored by: 7 Italian External Intelligence and Security Agency (AISE) 8 The Military Counterintelligence Service of Poland (SKW). Targets include NATO members.";
    const labels = defenseReasons(text).map((r) => r.label);
    expect(labels).toContain("cita la NATO");
    expect(labels).toContain("è firmato anche da agenzie italiane");
    expect(labels).not.toContain("cita obiettivi militari");
  });

  it("considera anche il titolo dell'avviso", () => {
    const labels = defenseReasons("Targets include the Defense Industrial Base (DIB).", "Russian State-Sponsored Targeting").map((r) => r.label);
    expect(labels).toContain("attribuisce l'attività a un attore legato a uno stato");
  });

  it("senza un motivo principale (difesa, aerospazio, NATO…) non segnala nulla", () => {
    expect(defenseReasons("Russian state-sponsored actors targeted Italian hospitals.")).toEqual([]);
  });

  it("estrae tecniche e CVE senza duplicati", () => {
    expect(extractTechniques("T1566.001 and T1566.001, T1059")).toEqual(["T1059", "T1566.001"]);
    expect(extractCves("cve-2024-1234 CVE-2024-1234")).toEqual(["CVE-2024-1234"]);
  });

  it("trova i gruppi citati per nome o alias esatto, non le parole comuni", () => {
    const groups = [
      { id: "g1", external_id: "G0035", name: "Dragonfly", aliases: ["Berserk Bear", "TEMP"] },
      { id: "g2", external_id: "G0020", name: "Equation", aliases: [] },
    ];
    expect(findActors("Also tracked as Berserk Bear by industry. The equation is simple. Equation", groups)).toEqual([
      { id: "g1", external_id: "G0035", name: "Dragonfly", alias: "Berserk Bear" },
    ]);
  });

  it("legge la sintesi esecutiva dell'avviso", () => {
    expect(executiveSummary("Title X Executive Summary This advisory details activity.")).toBe("This advisory details activity.");
    expect(executiveSummary("Executive summary A group of actors.")).toBe("A group of actors.");
  });
});

describe("Difesa e aerospazio: bozza di report", () => {
  const base = {
    advisory: { title: "Russian State-Supported Actors", url: "https://www.cisa.gov/x", published_at: "2026-07-21T12:00:00Z", summaryEn: "A group..." },
    reasons: [
      { label: "cita la filiera della difesa (Defense Industrial Base)", evidence: "targeted the DIB." },
      { label: "attribuisce l'attività a un attore legato a uno stato", evidence: "state-supported" },
    ],
    actors: [{ external_id: "G0035", name: "Dragonfly", alias: "Berserk Bear" }],
    techniqueCount: 12,
    cves: [{ id: "CVE-2025-1", kev: true, ransomware: false }, { id: "CVE-2025-2", kev: false, ransomware: false }],
    mitigations: [{ external_id: "M1032", name: "Autenticazione a più fattori", techniques: 5 }],
    d3fend: [{ label: "Multi-factor Authentication", tactic: "Harden" }],
  };

  it("usa solo fatti dell'avviso e dichiara come valutazione automatica il rischio", () => {
    const d = composeDraft(base);
    expect(d.summary).toContain("Il 21 luglio 2026");
    expect(composeDraft({ ...base, advisory: { ...base.advisory, published_at: "2026-07-08T12:00:00Z" } }).summary).toMatch(/^L'8 luglio/);
    expect(d.summary).toContain("2 vulnerabilità (CVE), di cui 1 già sfruttata");
    expect(d.summary).toContain("Berserk Bear (Dragonfly)");
    expect(d.risk).toBe("alto");
    const val = d.statements.filter((s) => s.kind === "valutazione");
    expect(val).toHaveLength(1);
    expect(val[0].body).toMatch(/^Valutazione automatica, da confermare/);
    expect(val[0].body).toContain("1 vulnerabilità già sfruttata (CISA KEV)");
    expect(d.statements.filter((s) => s.section === "executive").length).toBeLessThanOrEqual(4);
  });

  it("mette per prima la patch delle CVE già sfruttate e rispetta i limiti del brief", () => {
    const d = composeDraft(base);
    expect(d.actions[0]).toContain("CVE-2025-1");
    expect(d.actions[0]).not.toContain("CVE-2025-2");
    expect(d.actions.length).toBeLessThanOrEqual(3);
    expect(d.actions.every((a) => a.length <= 160)).toBe(true);
    expect(d.summary.length).toBeLessThanOrEqual(900);
    expect(d.statements.filter((s) => s.section === "executive").every((s) => s.body.length <= 300)).toBe(true);
  });

  it("senza attore statale né CVE sfruttate il rischio suggerito è medio", () => {
    const d = composeDraft({ ...base, reasons: [base.reasons[0]], cves: [], mitigations: [] });
    expect(d.risk).toBe("medio");
    expect(d.actions).toHaveLength(1); // azione di ripiego: il brief non resta senza azioni
  });
});
