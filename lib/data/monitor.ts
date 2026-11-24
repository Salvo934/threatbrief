import "server-only";
import { publicDb } from "@/lib/supabase/public";
import type { GroupLink, MonitorEvent } from "@/lib/monitor/rules";
import { PROFILES } from "@/lib/threats/profiles";
import { matchAttack, normName } from "@/lib/world/rules";

/** Eventi degli ultimi 7 giorni e, per ogni gruppo, il link alla sua scheda se esiste. */
export async function getMonitorData() {
  const db = publicDb();
  const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
  const [claims, groups] = await Promise.all([
    db.from("world_claims").select("external_id, group_name, country, sector_raw, discovered_at").gte("discovered_at", since).order("discovered_at", { ascending: false }).limit(1000),
    db.from("attack_groups").select("id, external_id, name, aliases").eq("revoked", false).eq("deprecated", false),
  ]);
  if (claims.error) throw new Error(`monitoraggio: ${claims.error.message}`);
  if (groups.error) throw new Error(`gruppi: ${groups.error.message}`);

  const events: MonitorEvent[] = (claims.data ?? []).map((c) => ({
    id: c.external_id.slice(0, 12),
    group: c.group_name,
    country: c.country,
    sector: c.sector_raw,
    at: c.discovered_at,
  }));

  const profiles = new Map(PROFILES.flatMap((p) => p.leakNames.map((l) => [normName(l), p] as const)));
  const links: Record<string, GroupLink> = {};
  for (const name of new Set(events.map((e) => e.group))) {
    const p = profiles.get(normName(name));
    if (p) {
      links[name] = { href: `/minacce/${p.slug}`, label: `Scheda ${p.name}` };
      continue;
    }
    const g = matchAttack(name, groups.data ?? [], []);
    links[name] = g ? { href: `/attori/${g.external_id}`, label: `${g.name} (${g.external_id})` } : null;
  }
  return { events, links, generatedAt: new Date().toISOString() };
}
