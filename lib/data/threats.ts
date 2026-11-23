import "server-only";
import { rankForTechniques } from "@/lib/data/mitigations";
import { getTactics } from "@/lib/data/attack";
import { getVictimsSince } from "@/lib/data/ransomware";
import { isoMonthsAgoStart } from "@/lib/kev-stats";
import { publicDb } from "@/lib/supabase/public";
import type { ThreatProfile } from "@/lib/threats/profiles";
import { rankGroups } from "@/lib/threats/ranking";
import { sectorRawIt } from "@/lib/threats/sectors-it";

function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

export async function getRansomwareRanking(today: Date) {
  const victims = await getVictimsSince(isoMonthsAgoStart(today, 24));
  const since12 = isoMonthsAgoStart(today, 12);
  return { ranking: rankGroups(victims, since12), total12: victims.filter((v) => v.discovered_at >= since12).length, since12 };
}

export type TacticGroup = { externalId: string; name: string; techniques: { external_id: string; name: string }[] };

/** Tutto ciò che serve alla scheda: rivendicazioni in Italia, tecniche per tattica, software, contromisure. */
export async function getProfileData(profile: ThreatProfile, today: Date) {
  const db = publicDb();
  const [victims, tactics, groups, software] = await Promise.all([
    getVictimsSince(isoMonthsAgoStart(today, 24)),
    getTactics(),
    profile.attack.groups.length
      ? db.from("attack_groups").select("id, external_id, name").in("external_id", profile.attack.groups)
      : Promise.resolve({ data: [], error: null }),
    profile.attack.software.length
      ? db.from("attack_software").select("id, external_id, name").in("external_id", profile.attack.software)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const groupRows = check(groups, "gruppi") as { id: string; external_id: string; name: string }[];
  const softwareRows = check(software, "software") as { id: string; external_id: string; name: string }[];

  // Tecniche: del gruppo (dirette e tramite software) + del software ransomware.
  const [groupTech, swTech, groupSw] = await Promise.all([
    groupRows.length
      ? db.from("v_group_techniques").select("technique_id").in("group_id", groupRows.map((g) => g.id))
      : Promise.resolve({ data: [], error: null }),
    softwareRows.length
      ? db.from("attack_relationships").select("target_ref").in("source_ref", softwareRows.map((s) => s.id)).eq("relationship_type", "uses").eq("target_type", "attack-pattern")
      : Promise.resolve({ data: [], error: null }),
    groupRows.length
      ? db.from("v_group_software").select("software_id").in("group_id", groupRows.map((g) => g.id))
      : Promise.resolve({ data: [], error: null }),
  ]);
  const techIds = new Set<string>([
    ...(check(groupTech, "tecniche gruppo") as { technique_id: string }[]).map((r) => r.technique_id),
    ...(check(swTech, "tecniche software") as { target_ref: string }[]).map((r) => r.target_ref),
  ]);
  const usedSwIds = [...new Set((check(groupSw, "software del gruppo") as { software_id: string }[]).map((r) => r.software_id))];

  const [techs, tools] = await Promise.all([
    techIds.size
      ? db.from("attack_techniques").select("id, external_id, name, tactics").in("id", [...techIds]).eq("revoked", false).eq("deprecated", false)
      : Promise.resolve({ data: [], error: null }),
    usedSwIds.length
      ? db.from("attack_software").select("external_id, name, type").in("id", usedSwIds).order("name")
      : Promise.resolve({ data: [], error: null }),
  ]);
  const techRows = check(techs, "nomi tecniche") as { id: string; external_id: string; name: string; tactics: string[] }[];

  const byTactic: TacticGroup[] = tactics
    .map((t) => ({
      externalId: t.external_id,
      name: t.name,
      techniques: techRows
        .filter((x) => x.tactics.includes(t.shortname))
        .map((x) => ({ external_id: x.external_id, name: x.name }))
        .sort((a, b) => a.external_id.localeCompare(b.external_id)),
    }))
    .filter((t) => t.techniques.length);

  const mitigations = techRows.length ? (await rankForTechniques(new Map(techRows.map((t) => [t.id, 1])))).slice(0, 10) : [];
  const claims = victims.filter((v) => profile.leakNames.includes(v.group_name));
  const since12 = isoMonthsAgoStart(today, 12);
  const sectors = new Map<string, number>();
  for (const v of claims) {
    if (v.discovered_at < since12) continue;
    const s = sectorRawIt(v.sector_raw);
    sectors.set(s, (sectors.get(s) ?? 0) + 1);
  }

  return {
    claims,
    since12,
    current: claims.filter((v) => v.discovered_at >= since12).length,
    previous: claims.filter((v) => v.discovered_at < since12).length,
    sectors: [...sectors.entries()].sort((a, b) => b[1] - a[1]),
    byTactic,
    techniqueIds: techRows.map((t) => t.external_id),
    techniqueCount: techRows.length,
    tools: (check(tools, "strumenti") as { external_id: string; name: string; type: string }[]).filter(
      (t) => !profile.attack.software.includes(t.external_id),
    ),
    mitigations,
    attackGroups: groupRows,
    attackSoftware: softwareRows,
  };
}
