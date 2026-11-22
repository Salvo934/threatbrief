import "server-only";
import { publicDb } from "@/lib/supabase/public";

const defang = (v: string) => v.replace(/^http/, "hxxp").replace(/\./g, "[.]");

/**
 * Testo di esempio per l'area Analisi. È dichiarato come costruito per la demo:
 * gli indicatori sono REALI (presi dai feed raccolti), la narrazione no.
 */
export async function buildSampleText(): Promise<string> {
  const db = publicDb();
  const [linked, urls, kev] = await Promise.all([
    db.from("ioc_links").select("ioc_id").not("software_id", "is", null).order("id", { ascending: false }).limit(2),
    db.from("iocs").select("value").eq("type", "url").order("last_seen", { ascending: false }).limit(1),
    db.from("kev_vulnerabilities").select("cve_id").eq("known_ransomware_use", true).order("date_added", { ascending: false }).limit(1),
  ]);
  const linkedIds = (linked.data ?? []).map((l) => l.ioc_id);
  const { data: linkedIocs } = linkedIds.length
    ? await db.from("iocs").select("type, value").in("id", linkedIds)
    : { data: [] as { type: string; value: string }[] };

  const c2 = (linkedIocs ?? []).map((i) => (["url", "domain", "ipv4"].includes(i.type) ? defang(i.value) : i.value));
  const url = urls.data?.[0]?.value;
  const cve = kev.data?.[0]?.cve_id;

  return [
    "[TESTO DI ESEMPIO costruito per la demo: gli indicatori sono reali e provengono dai feed raccolti, la narrazione è fittizia]",
    "",
    "L'accesso iniziale è avvenuto tramite spearphishing attachment: un documento con macro avviava powershell con un comando base64-encoded.",
    url ? `Il payload veniva scaricato da ${defang(url)}.` : "",
    c2.length ? `Comunicazioni verso il C2: ${c2.join(", ")}.` : "",
    "Per il movimento laterale è stato usato RDP con credenziali rubate; le credenziali erano state estratte da LSASS con Mimikatz.",
    cve ? `Il perimetro era esposto per la vulnerabilità ${cve}, non ancora corretta.` : "",
    "Infrastruttura di backup: update-portal[.]invalid (non presente nei feed).",
  ]
    .filter((l, i) => i === 1 || l) // tiene la riga vuota dopo l'intestazione
    .join("\n");
}
