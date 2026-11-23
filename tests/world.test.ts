import { describe, expect, it } from "vitest";
import { aggregateClaims, matchAttack, normName, rankD3fend, techniqueWeights, topMalware } from "@/lib/world/rules";

const end = new Date("2026-11-24T05:30:00Z");
const start = new Date("2026-11-23T05:30:00Z");
const claim = (group: string, discovered: string, country: string | null = "US", activity: string | null = null) => ({ group, country, activity, discovered });

describe("Rapporto della notte", () => {
  it("conta solo le rivendicazioni nella finestra, senza nomi di vittime", () => {
    const c = aggregateClaims(
      [claim("Akira", "2026-11-23T10:00:00Z", "IT", "Manufacturing"), claim("akira", "2026-11-23T11:00:00Z", "DE"), claim("play", "2026-11-22T10:00:00Z")],
      start, end, 100,
    );
    expect(c.total).toBe(2);
    expect(c.groups).toEqual([{ name: "akira", count: 2, countries: ["DE", "IT"] }]);
    expect(c.partial).toBe(false);
    expect(JSON.stringify(c)).not.toMatch(/victim/);
  });

  it("segnala il dato parziale se la fonte è al limite e non copre tutta la finestra", () => {
    const rows = Array.from({ length: 3 }, (_, i) => claim("x", `2026-11-24T0${i}:00:00Z`));
    expect(aggregateClaims(rows, start, end, 3).partial).toBe(true);
  });

  it("ignora le famiglie di malware sconosciute", () => {
    expect(topMalware([{ malware: "Unknown malware" }, { malware: "Vidar" }, { malware: null }, { malware: "Vidar" }])).toEqual([{ name: "Vidar", count: 2 }]);
  });

  const groups = [{ id: "g1", external_id: "G1024", name: "Akira", aliases: [] }];
  const software = [
    { id: "s1", external_id: "S0203", name: "Hydraq", aliases: ["Aurora"] },
    { id: "s2", external_id: "S0154", name: "Cobalt Strike", aliases: [] },
  ];

  it("collega i gruppi per nome normalizzato", () => {
    expect(normName("Lock-Bit 3.0 Ransomware")).toBe("lockbit30");
    expect(matchAttack("akira", groups, software)?.external_id).toBe("G1024");
  });

  it("non usa gli alias del software per i nomi dei leak site (aurora ≠ Hydraq)", () => {
    expect(matchAttack("aurora", groups, software)).toBeNull();
    expect(matchAttack("Aurora", [], software, new Map(), { softwareAliases: true })?.external_id).toBe("S0203");
    expect(matchAttack("cobaltstrike", [], software)?.external_id).toBe("S0154");
  });

  it("pesa ogni tecnica per numero di attori, una volta per attore", () => {
    const w = techniqueWeights([["t1", "t1", "t2"], ["t1"]]);
    expect(w.get("t1")).toBe(2);
    expect(w.get("t2")).toBe(1);
  });

  it("ordina le contromisure D3FEND per peso e pertinenza, scartando quelle generiche", () => {
    const row = (t: string, d: string) => ({ attack_external_id: t, d3fend_id: d, label: d, tactic: "Detect", iri_name: d });
    const rows = [row("T1", "SPEC"), row("T2", "SPEC"), row("T1", "GEN"), row("T2", "GEN"), row("T3", "GEN"), row("T1", "ONE")];
    const weights = new Map([["T1", 2], ["T2", 2], ["T3", 2]]);
    const totals = new Map([["SPEC", 2], ["GEN", 300], ["ONE", 1]]);
    const r = rankD3fend(rows, weights, totals);
    expect(r.map((e) => e.measures.map((m) => m.id))).toEqual([["SPEC"], ["GEN"]]);
    expect(r[1]).toMatchObject({ techniques: 3, total: 300 });
  });

  it("unisce le contromisure D3FEND che coprono le stesse tecniche", () => {
    const row = (t: string, d: string) => ({ attack_external_id: t, d3fend_id: d, label: d, tactic: "Detect", iri_name: d });
    const r = rankD3fend([row("T1", "B"), row("T2", "B"), row("T1", "A"), row("T2", "A")], new Map([["T1", 1], ["T2", 1]]), new Map());
    expect(r).toHaveLength(1);
    expect(r[0].measures.map((m) => m.id)).toEqual(["A", "B"]);
  });
});
