import { describe, expect, it } from "vitest";
import { buildStixBundle, stableUuid, stixPattern } from "@/lib/report/stix";
import { publicationProblems, slugify } from "@/lib/report/validate";
import { fixtureReport } from "./fixtures/report";

describe("STIX 2.1", () => {
  const bundle = buildStixBundle(fixtureReport, "https://example.test");
  const byType = (t: string) => bundle.objects.filter((o) => o.type === t);

  it("gli id sono stabili e in formato UUIDv4", () => {
    expect(stableUuid("a")).toBe(stableUuid("a"));
    expect(stableUuid("a")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("marca tutto con il TLP 2.0 ufficiale e collega attore, tecniche e IOC", () => {
    const [report] = byType("report");
    expect(byType("marking-definition")[0].id).toBe("marking-definition--94868c89-83c2-464b-929b-a1a8aa3c8487");
    expect(report.object_marking_refs).toEqual(["marking-definition--94868c89-83c2-464b-929b-a1a8aa3c8487"]);
    expect(report.confidence).toBe(50);
    expect(byType("intrusion-set")).toHaveLength(1);
    expect(byType("indicator")).toHaveLength(3);
    expect(byType("vulnerability")).toHaveLength(1);
    expect(byType("relationship").map((r) => r.relationship_type).sort()).toEqual(["indicates", "indicates", "indicates", "uses"]);
    const refs = new Set(report.object_refs as string[]);
    for (const o of bundle.objects) {
      if (["report", "marking-definition", "identity", "note"].includes(o.type)) continue;
      expect(refs.has(o.id)).toBe(true);
    }
  });

  it("separa fatti e valutazioni nelle note", () => {
    const notes = byType("note");
    expect(notes.map((n) => n.labels)).toEqual([["fatto", "executive"], ["valutazione", "executive"]]);
    expect(notes[1].confidence).toBe(50);
    expect(notes[0].external_references).toEqual([
      { source_name: "MITRE", description: "Scheda ATT&CK — Admiralty A2", url: "https://attack.mitre.org/groups/G0007/" },
    ]);
  });

  it("fa l'escape dei pattern", () => {
    expect(stixPattern("url", "http://x/a'b\\c")).toBe("[url:value = 'http://x/a\\'b\\\\c']");
    expect(stixPattern("sha1", "ab")).toBe("[file:hashes.'SHA-1' = 'ab']");
  });

  it("riesportare dà gli stessi id", () => {
    expect(buildStixBundle(fixtureReport, "https://example.test")).toEqual(bundle);
  });
});

describe("pubblicazione", () => {
  it("accetta un report completo e CLEAR", () => {
    expect(publicationProblems(fixtureReport)).toEqual([]);
  });
  it("blocca TLP diversi da CLEAR e brief incompleti", () => {
    const r = { ...fixtureReport, sources: [], report: { ...fixtureReport.report, tlp: "AMBER" as const, exec_summary: "" } };
    expect(publicationProblems(r)).toEqual([
      "Su /briefs vanno solo report TLP:CLEAR.",
      "Manca la sintesi del brief esecutivo.",
      "Serve almeno una fonte con valutazione Admiralty.",
    ]);
  });
});

describe("slugify", () => {
  it("toglie accenti e simboli", () => {
    expect(slugify("Sanità: ransomware & phishing — Q4 2026")).toBe("sanita-ransomware-phishing-q4-2026");
  });
});

describe("RSS", async () => {
  const { buildRss } = await import("@/lib/report/rss");
  it("fa l'escape e marca gli esempi", () => {
    const xml = buildRss(
      [{ id: "1", slug: "a-b", title: "R&D <test>", kind: "evento", tlp: "CLEAR", status: "published", published_at: "2026-11-22T10:00:00Z", exec_risk: "alto", exec_summary: "x", is_example: true, auto_generated: false, updated_at: "2026-11-22T10:00:00Z", confidence: "medio" }],
      "https://example.test",
    );
    expect(xml).toContain("<title>[ESEMPIO] R&amp;D &lt;test&gt;</title>");
    expect(xml).toContain("<link>https://example.test/briefs/a-b</link>");
    expect(xml).toContain("<pubDate>Sun, 22 Nov 2026 10:00:00 GMT</pubDate>");
  });
});
