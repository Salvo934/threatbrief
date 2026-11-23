import "server-only";
import type { BriefingItem } from "@/lib/digest/briefing";
import { publicDb } from "@/lib/supabase/public";

export type Briefing = { brief_date: string; title: string; intro: string | null; items: BriefingItem[]; published_at: string };
const COLUMNS = "brief_date, title, intro, items, published_at";

export async function listBriefings(limit = 30): Promise<Briefing[]> {
  const { data, error } = await publicDb().from("briefings").select(COLUMNS).order("brief_date", { ascending: false }).limit(limit);
  if (error) throw new Error(`briefing: ${error.message}`);
  return (data ?? []) as Briefing[];
}

export async function getBriefing(date: string): Promise<Briefing | null> {
  const { data, error } = await publicDb().from("briefings").select(COLUMNS).eq("brief_date", date).maybeSingle();
  if (error) throw new Error(`briefing: ${error.message}`);
  return data as Briefing | null;
}
