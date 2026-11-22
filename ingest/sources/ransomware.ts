import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import sectorsJson from "../../data/sectors.json";
import { fetchJson } from "../lib/http";
import { upsertInBatches } from "../lib/db";
import type { SourceResult } from "../lib/run";

// API pubblica v2 (senza chiave, max ~1 richiesta al minuto): tutte le rivendicazioni per l'Italia.
export const RANSOMWARE_IT_URL = "https://api.ransomware.live/v2/countryvictims/IT";

export type RansomwareLiveVictim = {
  post_title: string;
  group_name: string;
  country: string;
  activity?: string | null;
  discovered: string;
  published?: string | null;
};

const SECTOR_BY_ACTIVITY = new Map(
  sectorsJson.sectors.flatMap((s) => s.ransomware_live_activities.map((a) => [a.toLowerCase(), s.id] as const)),
);

const iso = (v: string | null | undefined) => (v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);

/**
 * Le rivendicazioni non hanno un id stabile: lo ricaviamo da gruppo + titolo del post.
 * Il link al leak site (.onion) non viene salvato di proposito.
 */
export function parseRansomwareLive(rows: RansomwareLiveVictim[]) {
  const out = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    const victim = r.post_title?.trim();
    const group = r.group_name?.trim().toLowerCase();
    const discovered = iso(r.discovered);
    if (!victim || !group || !discovered || r.country !== "IT") continue;
    const external_id = createHash("sha1").update(`${group}|${victim.toLowerCase()}`).digest("hex");
    const activity = r.activity?.trim() || null;
    out.set(external_id, {
      external_id,
      victim: victim.slice(0, 300),
      group_name: group,
      country: "IT",
      sector_raw: activity,
      sector_id: activity ? (SECTOR_BY_ACTIVITY.get(activity.toLowerCase()) ?? null) : null,
      discovered_at: discovered,
      published_at: iso(r.published),
    });
  }
  return [...out.values()];
}

export async function ingestRansomwareLive(db: SupabaseClient): Promise<SourceResult> {
  const data = await fetchJson<RansomwareLiveVictim[] | { message?: string }>(RANSOMWARE_IT_URL, {}, 90_000);
  if (!Array.isArray(data)) throw new Error(`ransomware.live: ${data.message ?? "risposta inattesa"}`);
  const rows = parseRansomwareLive(data);
  const upserted = await upsertInBatches(db, "ransomware_victims", rows, "external_id");
  return { fetched: data.length, upserted };
}
