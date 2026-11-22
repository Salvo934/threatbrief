import "server-only";
import { publicDb } from "@/lib/supabase/public";

function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

export type TechniqueCount = { id: string; external_id: string; name: string; groups: number };

/**
 * Per un insieme di attori: quanti di loro usano ogni tecnica (direttamente o via software).
 * Restituisce i pesi per STIX id (da usare per le mitigazioni) e la classifica delle tecniche.
 */
export async function techniqueUsageForGroups(groupIds: string[]) {
  const db = publicDb();
  const pairs = new Set<string>();
  for (let from = 0; groupIds.length; from += 1000) {
    const res = await db
      .from("v_group_techniques")
      .select("group_id, technique_id")
      .in("group_id", groupIds)
      .order("group_id")
      .order("technique_id")
      .range(from, from + 999);
    const rows = check(res, "tecniche per settore") as { group_id: string; technique_id: string }[];
    for (const r of rows) pairs.add(`${r.group_id}|${r.technique_id}`);
    if (rows.length < 1000) break;
  }
  const weights = new Map<string, number>();
  for (const p of pairs) {
    const t = p.split("|")[1];
    weights.set(t, (weights.get(t) ?? 0) + 1);
  }
  const top = [...weights.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  const techs = top.length
    ? (check(
        await db.from("attack_techniques").select("id, external_id, name").in("id", top.map(([id]) => id)),
        "nomi tecniche",
      ) as { id: string; external_id: string; name: string }[])
    : [];
  const byId = new Map(techs.map((t) => [t.id, t]));
  const ranking: TechniqueCount[] = top
    .filter(([id]) => byId.has(id))
    .map(([id, groups]) => ({ ...byId.get(id)!, groups }));
  return { weights, ranking };
}
