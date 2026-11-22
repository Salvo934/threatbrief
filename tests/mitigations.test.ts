import { describe, expect, it } from "vitest";
import { rankMitigations } from "@/lib/attack/mitigations";
import { NIS2, mitigationsForMeasure, nis2ForMitigation } from "@/lib/nis2/mapping";
import mapping from "@/data/nis2-mapping.json";

describe("rankMitigations", () => {
  const mitigations = [
    { id: "m1", external_id: "M1032", name: "Multi-factor Authentication" },
    { id: "m2", external_id: "M1017", name: "User Training" },
    { id: "m3", external_id: "M1056", name: "Pre-compromise" },
  ];
  const links = [
    { mitigation_id: "m1", technique_id: "t1" },
    { mitigation_id: "m1", technique_id: "t2" },
    { mitigation_id: "m2", technique_id: "t3" },
    { mitigation_id: "m3", technique_id: "t1" },
    { mitigation_id: "m2", technique_id: "t9" },
  ];

  it("pesa le tecniche e scarta le mitigazioni non azionabili", () => {
    const ranked = rankMitigations(mitigations, links, new Map([["t1", 1], ["t2", 1], ["t3", 5]]));
    expect(ranked.map((r) => [r.mitigation.external_id, r.techniques, r.score])).toEqual([
      ["M1017", 1, 5],
      ["M1032", 2, 2],
    ]);
  });
});

describe("mappatura NIS2", () => {
  it("ha le 10 lettere dell'art. 24, c. 2 e riferimenti validi", () => {
    expect(NIS2.measures.map((m) => m.id)).toEqual(["a", "b", "c", "d", "e", "f", "g", "h", "i", "l"]);
    const ids = new Set(NIS2.measures.map((m) => m.id));
    for (const m of mapping.mappings) {
      expect(m.mitigation).toMatch(/^M1\d{3}$/);
      for (const x of m.measures) expect(ids.has(x)).toBe(true);
    }
    expect(new Set(mapping.mappings.map((m) => m.mitigation)).size).toBe(mapping.mappings.length);
  });

  it("MFA è la lettera l); la catena di fornitura non ha mitigazioni ATT&CK", () => {
    expect(nis2ForMitigation("M1032")?.measures).toEqual(["l"]);
    expect(mitigationsForMeasure("d")).toEqual([]);
  });
});

describe("statistiche ransomware", async () => {
  const { victimsByMonth, topGroups } = await import("@/lib/ransomware-stats");
  const rows = [
    { discovered_at: "2026-11-02T10:00:00Z", group_name: "qilin" },
    { discovered_at: "2026-11-20T10:00:00Z", group_name: "akira" },
    { discovered_at: "2026-10-05T10:00:00Z", group_name: "qilin" },
    { discovered_at: "2025-01-05T10:00:00Z", group_name: "lockbit3" },
  ];
  it("conta per mese solo dentro la finestra", () => {
    const b = victimsByMonth(rows, new Date("2026-11-22T12:00:00Z"), 3);
    expect(b.map((x) => [x.month, x.vittime])).toEqual([["2026-09", 0], ["2026-10", 1], ["2026-11", 2]]);
  });
  it("ordina i gruppi per rivendicazioni", () => {
    expect(topGroups(rows, 2)).toEqual([{ group: "qilin", count: 2 }, { group: "akira", count: 1 }]);
  });
});
