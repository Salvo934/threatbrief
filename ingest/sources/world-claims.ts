import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RECENT_VICTIMS_URL } from "../../lib/world/build";
import { upsertInBatches } from "../lib/db";
import type { SourceResult } from "../lib/run";

type Row = { group?: string; victim?: string; country?: string; activity?: string; discovered?: string };

/**
 * Rivendicazioni nel mondo per la mappa del monitoraggio. Il nome della vittima serve solo a
 * calcolare l'impronta (per non contare due volte lo stesso evento) e non viene salvato.
 */
export function parseWorldClaims(rows: Row[]) {
  const out = new Map<string, { external_id: string; group_name: string; country: string | null; sector_raw: string | null; discovered_at: string }>();
  for (const r of rows) {
    const group = r.group?.trim().toLowerCase();
    const victim = r.victim?.trim().toLowerCase();
    if (!group || !victim || !r.discovered || Number.isNaN(Date.parse(r.discovered))) continue;
    const country = r.country?.trim().toUpperCase();
    const external_id = createHash("sha1").update(`${group}|${victim}`).digest("hex");
    out.set(external_id, {
      external_id,
      group_name: group.slice(0, 80),
      country: country && /^[A-Z]{2}$/.test(country) ? country : null,
      sector_raw: r.activity?.trim() && r.activity.trim() !== "Not Found" ? r.activity.trim().slice(0, 80) : null,
      discovered_at: new Date(r.discovered).toISOString(),
    });
  }
  return [...out.values()];
}

export async function ingestWorldClaims(db: SupabaseClient): Promise<SourceResult> {
  // ransomware.live accetta circa una richiesta al minuto: nei «feed» questa raccolta segue quella italiana.
  await new Promise((r) => setTimeout(r, 65_000));
  const res = await fetch(RECENT_VICTIMS_URL, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(90_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} da ransomware.live`);
  const data = (await res.json()) as Row[];
  if (!Array.isArray(data)) throw new Error("ransomware.live: risposta inattesa");
  const rows = parseWorldClaims(data);
  const upserted = await upsertInBatches(db, "world_claims", rows, "external_id");
  const { error } = await db.rpc("purge_old_world_claims");
  if (error) throw new Error(`pulizia rivendicazioni: ${error.message}`);
  return { fetched: data.length, upserted };
}
