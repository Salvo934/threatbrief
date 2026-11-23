import type { SupabaseClient } from "@supabase/supabase-js";
import sectorsJson from "../../data/sectors.json";
import { csirtItems, digestWindow, iocItem, kevItems, ransomwareItems, sourceItems } from "./rules";
import type { CsirtRow, KevRow, ObservationRow, RunRow, VictimRow } from "./rules";
import type { DigestItem } from "./types";

// Import relativi (niente alias "@/"): questo modulo è usato anche dallo script di ingestion.
const SECTOR_NAMES = new Map(sectorsJson.sectors.map((s) => [s.id, s.name]));
const SOURCE_NAMES: Record<string, string> = {
  mitre_attack: "MITRE ATT&CK", cisa_kev: "CISA KEV", threatfox: "ThreatFox", urlhaus: "URLhaus",
  otx: "AlienVault OTX", csirt_italia: "CSIRT Italia", ransomware_live: "ransomware.live",
};
const sourceName = (id: string) => SOURCE_NAMES[id] ?? id;

async function rows<T>(p: PromiseLike<{ data: unknown; error: { message: string } | null }>, what: string): Promise<T[]> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
  return (data ?? []) as T[];
}

/** Costruisce gli elementi della bozza per una finestra temporale, leggendo i dati raccolti. */
export async function buildDigestItems(db: SupabaseClient, start: Date, end: Date): Promise<DigestItem[]> {
  const s = start.toISOString();
  const e = end.toISOString();
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const [kev, csirt, victims, observations, runs] = await Promise.all([
    rows<KevRow>(
      db.from("kev_vulnerabilities")
        .select("cve_id, vendor_project, product, vulnerability_name, date_added, due_date, known_ransomware_use")
        .gte("date_added", day(start)).lte("date_added", day(end)).order("known_ransomware_use", { ascending: false }).order("cve_id"),
      "KEV",
    ),
    rows<CsirtRow>(
      db.from("intel_items").select("external_id, title, summary, url, published_at, cves")
        .eq("source_id", "csirt_italia").gte("published_at", s).lte("published_at", e).order("published_at", { ascending: false }),
      "CSIRT Italia",
    ),
    rows<VictimRow>(
      db.from("ransomware_victims").select("victim, group_name, sector_id, sector_raw")
        .eq("country", "IT").gte("discovered_at", s).lte("discovered_at", e).order("discovered_at", { ascending: false }),
      "rivendicazioni",
    ),
    rows<ObservationRow>(
      db.from("ioc_observations").select("source_id, malware").gte("first_seen", s).lte("first_seen", e).limit(10000),
      "osservazioni IOC",
    ),
    rows<RunRow>(
      db.from("ingestion_runs").select("source_id, status, error, started_at").gte("started_at", s).lte("started_at", e),
      "esecuzioni",
    ),
  ]);

  // Per sapere se un alert CSIRT cita CVE già nel KEV servono anche le KEV più vecchie.
  const cited = [...new Set(csirt.flatMap((c) => c.cves))];
  const kevCited = cited.length
    ? await rows<{ cve_id: string }>(db.from("kev_vulnerabilities").select("cve_id").in("cve_id", cited), "KEV citate")
    : [];

  return [
    ...kevItems(kev),
    ...csirtItems(csirt, new Set(kevCited.map((k) => k.cve_id))),
    ...ransomwareItems(victims, (id) => SECTOR_NAMES.get(id) ?? id),
    ...iocItem(observations, sourceName),
    ...sourceItems(runs, sourceName),
  ];
}

/**
 * Genera (o rigenera) la bozza del giorno. Le revisioni dell'analista restano agganciate
 * alle chiavi degli elementi, quindi rigenerare non cancella il lavoro già fatto.
 */
export async function generateDigest(db: SupabaseClient, by: "automatico" | "analista", now = new Date()) {
  const { data: prev, error } = await db
    .from("digests")
    .select("window_end, digest_date")
    .order("digest_date", { ascending: false })
    .limit(2);
  if (error) throw new Error(`digest precedente: ${error.message}`);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(now);
  // Se oggi esiste già, la finestra parte dalla fine del digest del giorno prima.
  const previous = (prev ?? []).find((d) => d.digest_date !== today) ?? null;
  const w = digestWindow(now, previous?.window_end ?? null);
  const items = await buildDigestItems(db, w.start, w.end);
  const { data, error: upsertError } = await db
    .from("digests")
    .upsert(
      { digest_date: w.date, window_start: w.start.toISOString(), window_end: w.end.toISOString(), generated_at: now.toISOString(), generated_by: by, items },
      { onConflict: "digest_date" },
    )
    .select("id, digest_date")
    .single();
  if (upsertError) throw new Error(`salvataggio digest: ${upsertError.message}`);
  return { ...data, items: items.length };
}
