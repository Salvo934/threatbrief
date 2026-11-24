import type { ReportFull } from "@/lib/report/types";

/** Report di prova per i test (dati fittizi, solo per verificare la struttura). */
export const fixtureReport: ReportFull = {
  report: {
    id: "3f0c6d2a-8b1e-4c7d-9a2f-1e2d3c4b5a69",
    slug: "test-attore",
    title: "Test attore",
    kind: "attore",
    subject_group_id: "intrusion-set--bef4c620-0787-42a8-a96d-b7eb6e85917c",
    subject_sector_id: null,
    subject_event: null,
    tlp: "CLEAR",
    confidence: "medio",
    status: "published",
    published_at: "2026-11-22T10:00:00Z",
    exec_risk: "alto",
    exec_summary: "Sintesi di prova.",
    exec_impact: "Impatto di prova.",
    exec_actions: ["Abilitare MFA"],
    tech_notes: null,
    is_example: true,
    auto_generated: false,
    created_at: "2026-11-22T09:00:00Z",
    updated_at: "2026-11-22T10:00:00Z",
  },
  subject: { label: "APT28", href: "/attori/G0007", externalId: "G0007" },
  sources: [
    { id: "s1", title: "Scheda ATT&CK", url: "https://attack.mitre.org/groups/G0007/", publisher: "MITRE", reliability: "A", credibility: 2, accessed_at: "2026-11-22" },
  ],
  statements: [
    { id: "f1", section: "executive", kind: "fatto", body: "Fatto di prova.", source_id: "s1", confidence: null, position: 0 },
    { id: "v1", section: "executive", kind: "valutazione", body: "Valutazione di prova.", source_id: null, confidence: "medio", position: 1 },
  ],
  techniques: [{ id: "attack-pattern--x", external_id: "T1566.001", name: "Spearphishing Attachment", note: "Allegati con macro" }],
  iocs: [
    { id: 1, type: "domain", value: "example.invalid", first_seen: "2026-11-01T00:00:00Z", last_seen: "2026-11-02T00:00:00Z" },
    { id: 2, type: "url", value: "http://example.invalid/a'b", first_seen: "2026-11-01T00:00:00Z", last_seen: "2026-11-02T00:00:00Z" },
    { id: 3, type: "sha256", value: "a".repeat(64), first_seen: "2026-11-01T00:00:00Z", last_seen: "2026-11-02T00:00:00Z" },
    { id: 4, type: "cve", value: "CVE-2023-4966", first_seen: "2026-11-01T00:00:00Z", last_seen: "2026-11-02T00:00:00Z" },
  ],
};
