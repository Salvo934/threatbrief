import type { RansomwareVictim } from "@/lib/data/ransomware";
import { profileForLeakName, type ThreatProfile } from "./profiles";
import { sectorRawIt } from "./sectors-it";

export type RankingRow = {
  group: string;
  current: number;
  previous: number;
  topSector: string | null;
  profile: ThreatProfile | undefined;
};

/** Gruppi ransomware per rivendicazioni contro organizzazioni italiane: ultimi 12 mesi vs i 12 precedenti. */
export function rankGroups(victims: Pick<RansomwareVictim, "group_name" | "sector_raw" | "discovered_at">[], since12: string, limit = 15): RankingRow[] {
  const rows = new Map<string, { current: number; previous: number; sectors: Map<string, number> }>();
  for (const v of victims) {
    const r = rows.get(v.group_name) ?? { current: 0, previous: 0, sectors: new Map() };
    if (v.discovered_at >= since12) {
      r.current++;
      // Settore come lo classifica ransomware.live, tradotto (esclusi i casi senza indicazione).
      if (v.sector_raw && v.sector_raw !== "Not Found" && v.sector_raw !== "Other") {
        const s = sectorRawIt(v.sector_raw);
        r.sectors.set(s, (r.sectors.get(s) ?? 0) + 1);
      }
    } else {
      r.previous++;
    }
    rows.set(v.group_name, r);
  }
  return [...rows.entries()]
    .filter(([, r]) => r.current > 0)
    .sort((a, b) => b[1].current - a[1].current || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([group, r]) => ({
      group,
      current: r.current,
      previous: r.previous,
      topSector: [...r.sectors.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      profile: profileForLeakName(group),
    }));
}
