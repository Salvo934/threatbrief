import { describe, expect, it } from "vitest";
import mapping from "@/data/nis2-mapping.json";
import { MITIGATION_IT, TACTIC_IT } from "@/lib/i18n/attack-it";
import { rankGroups } from "@/lib/threats/ranking";
import { PROFILES, profileForLeakName } from "@/lib/threats/profiles";

describe("minacce principali", () => {
  it("classifica per rivendicazioni negli ultimi 12 mesi e confronta con i 12 precedenti", () => {
    const v = (group_name: string, discovered_at: string, sector_raw: string | null = null) => ({ group_name, discovered_at, sector_raw });
    const rows = rankGroups(
      [
        v("qilin", "2026-10-01T00:00:00Z", "Healthcare"),
        v("qilin", "2026-09-01T00:00:00Z", "Manufacturing"),
        v("qilin", "2026-08-01T00:00:00Z", "Manufacturing"),
        v("qilin", "2025-06-01T00:00:00Z"),
        v("akira", "2026-07-01T00:00:00Z"),
        v("vecchio", "2025-01-01T00:00:00Z"),
      ],
      "2025-12-01",
    );
    expect(rows.map((r) => [r.group, r.current, r.previous, r.topSector])).toEqual([
      ["qilin", 3, 1, "Manifatturiero"],
      ["akira", 1, 0, null],
    ]);
    expect(rows[0].profile?.slug).toBe("qilin");
  });

  it("traduce i settori di ransomware.live", async () => {
    const { sectorRawIt } = await import("@/lib/threats/sectors-it");
    expect(sectorRawIt("Retail & E-Commerce")).toBe("Commercio ed e-commerce");
    expect(sectorRawIt(null)).toBe("Non indicato");
  });

  it("le schede hanno fonti, contromisure e nomi di leak site unici", () => {
    const leak = PROFILES.flatMap((p) => p.leakNames);
    expect(new Set(leak).size).toBe(leak.length);
    for (const p of PROFILES) {
      expect(p.sources.length, p.slug).toBeGreaterThanOrEqual(1);
      expect(p.countermeasures.length, p.slug).toBeGreaterThanOrEqual(3);
      expect(p.attack.groups.length + p.attack.software.length, p.slug).toBeGreaterThan(0);
      for (const s of p.sources) expect(s.url).toMatch(/^https:\/\/(attack\.mitre\.org|www\.cisa\.gov)\//);
    }
    expect(profileForLeakName("lockbit5")?.slug).toBe("lockbit");
  });

  it("ogni mitigazione e tattica ATT&CK ha un nome italiano", () => {
    for (const m of mapping.mappings) expect(MITIGATION_IT[m.mitigation], m.mitigation).toBeTruthy();
    expect(Object.keys(TACTIC_IT)).toHaveLength(15);
  });
});
