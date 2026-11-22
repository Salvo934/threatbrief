import { describe, expect, it } from "vitest";
import { buildMatrix, overlapStats, type Flags } from "@/lib/attack/matrix";
import type { Tactic, TechniqueLite } from "@/lib/db/types";

const tactics: Tactic[] = [
  { id: "t2", external_id: "TA0002", shortname: "execution", name: "Execution", sort_order: 1, url: null },
  { id: "t1", external_id: "TA0001", shortname: "initial-access", name: "Initial Access", sort_order: 0, url: null },
];
const tech = (external_id: string, name: string, tactic: string, parent?: string): TechniqueLite => ({
  id: `attack-pattern--${external_id}`, external_id, name, tactics: [tactic],
  is_subtechnique: !!parent, parent_external_id: parent ?? null,
});
const techniques = [
  tech("T1566", "Phishing", "initial-access"),
  tech("T1566.001", "Spearphishing Attachment", "initial-access", "T1566"),
  tech("T1059", "Command and Scripting Interpreter", "execution"),
  tech("T1059.001", "PowerShell", "execution", "T1059"),
  tech("T1204", "User Execution", "execution"),
];

describe("buildMatrix", () => {
  it("ordina le tattiche e aggrega le sotto-tecniche sul padre", () => {
    const usage = new Map<string, Flags>([["T1059.001", { a: "software" }], ["T1059", { a: "diretta" }]]);
    const cols = buildMatrix(tactics, techniques, usage);
    expect(cols.map((c) => c.tactic.shortname)).toEqual(["initial-access", "execution"]);
    const t1059 = cols[1].cells.find((c) => c.technique.external_id === "T1059")!;
    expect(t1059.flags.a).toBe("diretta"); // diretta vince su software
    expect(t1059.subs.map((s) => s.technique.external_id)).toEqual(["T1059.001"]);
    expect(cols[1].cells).toHaveLength(2); // le sotto-tecniche non sono celle
  });

  it("con onlyUsed tiene solo le tecniche usate", () => {
    const usage = new Map<string, Flags>([["T1566.001", { a: "diretta" }]]);
    const cols = buildMatrix(tactics, techniques, usage, { onlyUsed: true });
    expect(cols[0].cells.map((c) => c.technique.external_id)).toEqual(["T1566"]);
    expect(cols[1].cells).toEqual([]);
  });
});

describe("overlapStats", () => {
  it("conta tecniche comuni ed esclusive e calcola Jaccard", () => {
    const usage = new Map<string, Flags>([
      ["T1566", { a: "diretta", b: "diretta" }],
      ["T1059", { a: "diretta" }],
      ["T1204", { b: "software" }],
    ]);
    const s = overlapStats(buildMatrix(tactics, techniques, usage));
    expect(s).toEqual({ onlyA: 1, onlyB: 1, both: 1, jaccard: 1 / 3 });
  });
});
