import { describe, expect, it } from "vitest";
import { parseAttackBundle, type StixObject } from "../ingest/sources/attack";
import { parseKev } from "../ingest/sources/kev";

const ref = (id: string) => [{ source_name: "mitre-attack", external_id: id, url: `https://attack.mitre.org/${id}` }];

const objects: StixObject[] = [
  { type: "x-mitre-collection", id: "x-mitre-collection--1", x_mitre_version: "20.1" },
  { type: "x-mitre-matrix", id: "x-mitre-matrix--1", tactic_refs: ["x-mitre-tactic--b", "x-mitre-tactic--a"] },
  { type: "x-mitre-tactic", id: "x-mitre-tactic--a", name: "Execution", x_mitre_shortname: "execution", external_references: ref("TA0002") },
  { type: "x-mitre-tactic", id: "x-mitre-tactic--b", name: "Initial Access", x_mitre_shortname: "initial-access", external_references: ref("TA0001") },
  {
    type: "attack-pattern", id: "attack-pattern--t", name: "Command and Scripting Interpreter", external_references: ref("T1059"),
    kill_chain_phases: [{ kill_chain_name: "mitre-attack", phase_name: "execution" }],
  },
  {
    type: "attack-pattern", id: "attack-pattern--sub", name: "PowerShell", external_references: ref("T1059.001"),
    x_mitre_is_subtechnique: true, kill_chain_phases: [{ kill_chain_name: "mitre-attack", phase_name: "execution" }],
  },
  { type: "attack-pattern", id: "attack-pattern--old", name: "Old", external_references: ref("T9999"), revoked: true },
  { type: "intrusion-set", id: "intrusion-set--g", name: "APT1", aliases: ["APT1", "Comment Crew"], external_references: ref("G0006"), description: "APT1 has targeted telecommunications companies." },
  { type: "malware", id: "malware--m", name: "Mimi", x_mitre_aliases: ["Mimi", "M1m1"], external_references: ref("S0001") },
  { type: "relationship", id: "relationship--1", relationship_type: "uses", source_ref: "intrusion-set--g", target_ref: "attack-pattern--sub" },
  { type: "relationship", id: "relationship--2", relationship_type: "uses", source_ref: "intrusion-set--g", target_ref: "attack-pattern--old" },
  { type: "relationship", id: "relationship--3", relationship_type: "detects", source_ref: "x-mitre-detection-strategy--d", target_ref: "attack-pattern--t" },
  { type: "relationship", id: "relationship--4", relationship_type: "uses", source_ref: "intrusion-set--g", target_ref: "malware--m", revoked: true },
];

describe("parseAttackBundle", () => {
  const p = parseAttackBundle({ type: "bundle", objects });

  it("legge la versione e ordina le tattiche come nella matrice", () => {
    expect(p.version).toBe("20.1");
    expect(p.tactics.map((t) => t.shortname)).toEqual(["initial-access", "execution"]);
  });

  it("riconosce le sotto-tecniche e il loro padre", () => {
    const sub = p.techniques.find((t) => t.external_id === "T1059.001")!;
    expect(sub.is_subtechnique).toBe(true);
    expect(sub.parent_external_id).toBe("T1059");
    expect(sub.tactics).toEqual(["execution"]);
  });

  it("toglie il nome dagli alias e legge x_mitre_aliases del software", () => {
    expect(p.groups[0].aliases).toEqual(["Comment Crew"]);
    expect(p.software[0].aliases).toEqual(["M1m1"]);
  });

  it("tiene solo relazioni attive tra oggetti attivi", () => {
    expect(p.relationships.map((r) => r.id)).toEqual(["relationship--1"]);
  });

  it("deriva gli attributi dell'attore con confidenza bassa", () => {
    expect(p.actorAttributes).toEqual([
      expect.objectContaining({ group_id: "intrusion-set--g", attribute: "settore", value: "telco", method: "derivato", confidence: "basso" }),
    ]);
  });
});

describe("parseKev", () => {
  it("normalizza e scarta righe non valide", () => {
    const p = parseKev({
      catalogVersion: "2026.11.20",
      count: 2,
      vulnerabilities: [
        { cveID: "CVE-2026-12345", vendorProject: "Acme", product: "Gw", vulnerabilityName: "Acme Gw RCE", dateAdded: "2026-11-20", knownRansomwareCampaignUse: "Known", cwes: ["CWE-78"] },
        { cveID: "not-a-cve", vendorProject: "X", product: "Y", vulnerabilityName: "Z", dateAdded: "2026-11-20" },
      ],
    });
    expect(p.total).toBe(2);
    expect(p.rows).toHaveLength(1);
    expect(p.rows[0]).toMatchObject({ cve_id: "CVE-2026-12345", known_ransomware_use: true, due_date: null });
  });
});
