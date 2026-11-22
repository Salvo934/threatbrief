import sectorsJson from "@/data/sectors.json";
import motivationsJson from "@/data/motivations.json";

const TZ = "Europe/Rome";

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric", timeZone: TZ }).format(d);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ,
  }).format(new Date(iso));
}

export const formatNumber = (n: number) => new Intl.NumberFormat("it-IT").format(n);

const countryNames = new Intl.DisplayNames(["it"], { type: "region" });
export function countryName(code: string): string {
  try {
    return countryNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export const SECTORS = sectorsJson.sectors.map((s) => ({ id: s.id, name: s.name }));
const sectorNames = new Map(SECTORS.map((s) => [s.id, s.name]));
export const sectorName = (id: string) => sectorNames.get(id) ?? id;

const SOURCE_NAMES: Record<string, string> = {
  mitre_attack: "MITRE ATT&CK",
  cisa_kev: "CISA KEV",
  threatfox: "ThreatFox",
  urlhaus: "URLhaus",
  otx: "AlienVault OTX",
  csirt_italia: "CSIRT Italia",
  ransomware_live: "ransomware.live",
};
export const sourceName = (id: string) => SOURCE_NAMES[id] ?? id;

const motivationNames =new Map(motivationsJson.motivations.map((m) => [m.id, m.label]));
export const motivationName = (id: string) => motivationNames.get(id) ?? id;
