import "server-only";
import { publicDb } from "@/lib/supabase/public";

export type RansomwareVictim = {
  external_id: string;
  victim: string;
  group_name: string;
  sector_raw: string | null;
  sector_id: string | null;
  discovered_at: string;
  published_at: string | null;
};

/** Rivendicazioni contro vittime italiane dalla data indicata (opzionalmente per settore). */
export async function getVictimsSince(sinceIso: string, sectorId?: string): Promise<RansomwareVictim[]> {
  let q = publicDb()
    .from("ransomware_victims")
    .select("external_id, victim, group_name, sector_raw, sector_id, discovered_at, published_at")
    .eq("country", "IT")
    .gte("discovered_at", sinceIso)
    .order("discovered_at", { ascending: false })
    .limit(5000);
  if (sectorId) q = q.eq("sector_id", sectorId);
  const { data, error } = await q;
  if (error) throw new Error(`vittime ransomware: ${error.message}`);
  return data ?? [];
}
