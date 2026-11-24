import { describe, expect, it } from "vitest";
import isoNumeric from "@/data/iso-numeric.json";
import { parseWorldClaims } from "@/ingest/sources/world-claims";
import { byCountry, flag, inWindow, topGroups, type MonitorEvent } from "@/lib/monitor/rules";

const NOW = Date.parse("2026-11-24T12:00:00Z");
const ev = (id: string, group: string, country: string | null, hoursAgo: number): MonitorEvent => ({
  id, group, country, sector: null, at: new Date(NOW - hoursAgo * 3600_000).toISOString(),
});
const EVENTS = [ev("a", "akira", "IT", 1), ev("b", "akira", "IT", 30), ev("c", "qilin", "US", 2), ev("d", "qilin", null, 3), ev("e", "play", "DE", 200)];

describe("Monitoraggio", () => {
  it("non salva il nome della vittima, solo un'impronta, e normalizza paese e settore", () => {
    const rows = parseWorldClaims([
      { group: "Akira", victim: "Acme S.p.A.", country: "it", activity: "Manufacturing", discovered: "2026-11-24T10:00:00Z" },
      { group: "akira", victim: "acme s.p.a.", country: "IT", activity: "Manufacturing", discovered: "2026-11-24T10:00:00Z" },
      { group: "qilin", victim: "X", country: "", activity: "Not Found", discovered: "2026-11-24T09:00:00Z" },
      { group: "", victim: "Y", discovered: "2026-11-24T09:00:00Z" },
    ]);
    expect(rows).toHaveLength(2);
    expect(JSON.stringify(rows)).not.toMatch(/acme/i);
    expect(rows[0]).toMatchObject({ group_name: "akira", country: "IT", sector_raw: "Manufacturing" });
    expect(rows[1]).toMatchObject({ country: null, sector_raw: null });
  });

  it("filtra per finestra temporale e per gruppo", () => {
    expect(inWindow(EVENTS, 24, NOW).map((e) => e.id)).toEqual(["a", "c", "d"]);
    expect(inWindow(EVENTS, 168, NOW, "akira").map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("aggrega per paese con gli eventi recenti e i gruppi più attivi", () => {
    const c = byCountry(inWindow(EVENTS, 72, NOW), NOW);
    expect(c.map((x) => [x.code, x.count, x.recent])).toEqual([["IT", 2, 1], ["US", 1, 1]]);
    expect(c[0].groups).toEqual([["akira", 2]]);
    expect(topGroups(EVENTS)[0]).toEqual(["akira", 2]);
  });

  it("ha la corrispondenza dei codici paese usata dalla mappa", () => {
    const m = isoNumeric as Record<string, string>;
    expect(m["380"]).toBe("IT");
    expect(m["840"]).toBe("US");
    expect(m["36"]).toBe("AU");
    expect(flag("IT")).toBe("🇮🇹");
    expect(flag(null)).toBe("🏳️");
  });
});
