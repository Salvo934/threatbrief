/**
 * Controllo qualità dei dati: confronti puri tra ciò che è nel database e ciò che dice la fonte
 * originale. Import relativi: usato dallo script (GitHub Actions) e, per i tipi, dalla pagina.
 */
import { quoteInSource } from "../ai/guard";

export type QualityArea = "kev" | "attack" | "ransomware" | "threatfox" | "citazioni" | "csirt" | "freschezza";

export type QualityCheck = {
  area: QualityArea;
  item: string;      // cosa è stato controllato (solo dati pubblici)
  ok: boolean;
  detail: string;    // in italiano: cosa coincide o cosa non coincide
  url?: string;      // dove verificarlo a mano
};

export const AREA_LABEL: Record<QualityArea, string> = {
  kev: "Catalogo CISA KEV",
  attack: "MITRE ATT&CK",
  ransomware: "Rivendicazioni in Italia",
  threatfox: "Indicatori ThreatFox",
  citazioni: "Citazioni nei report",
  csirt: "Avvisi CSIRT Italia",
  freschezza: "Aggiornamento delle fonti",
};

/** Estrazione casuale senza ripetizioni (con generatore iniettabile per i test). */
export function sample<T>(xs: T[], n: number, rnd: () => number = Math.random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

type KevDb = { cve_id: string; vendor_project: string; product: string; date_added: string; known_ransomware_use: boolean };
type KevSrc = { cveID: string; vendorProject: string; product: string; dateAdded: string; knownRansomwareCampaignUse: string };

export function compareKev(db: KevDb, src: KevSrc | undefined): QualityCheck {
  const url = `https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext=${db.cve_id}`;
  if (!src) return { area: "kev", item: db.cve_id, ok: false, detail: "Non più presente nel catalogo CISA KEV.", url };
  const diff: string[] = [];
  if (src.vendorProject.trim() !== db.vendor_project) diff.push(`fornitore «${src.vendorProject}» invece di «${db.vendor_project}»`);
  if (src.product.trim() !== db.product) diff.push(`prodotto «${src.product}» invece di «${db.product}»`);
  if (src.dateAdded !== db.date_added) diff.push(`data ${src.dateAdded} invece di ${db.date_added}`);
  if ((src.knownRansomwareCampaignUse === "Known") !== db.known_ransomware_use) diff.push("«uso ransomware» diverso");
  return { area: "kev", item: db.cve_id, ok: diff.length === 0, detail: diff.length ? `Diverso dalla fonte: ${diff.join("; ")}.` : "Fornitore, prodotto, data e uso ransomware coincidono.", url };
}

/** La pagina ATT&CK del gruppo deve contenere il nome e le tecniche che gli attribuiamo. */
export function compareAttackGroup(g: { external_id: string; name: string; techniques: string[] }, pageText: string | null): QualityCheck {
  const url = `https://attack.mitre.org/groups/${g.external_id}/`;
  if (!pageText) return { area: "attack", item: `${g.name} (${g.external_id})`, ok: false, detail: "Pagina ATT&CK non raggiungibile.", url };
  const missing = g.techniques.filter((t) => !pageText.includes(t));
  const nameOk = pageText.includes(g.name);
  return {
    area: "attack", item: `${g.name} (${g.external_id})`, url,
    ok: nameOk && missing.length === 0,
    detail: !nameOk ? "Il nome del gruppo non compare nella pagina." : missing.length ? `Tecniche non trovate nella pagina: ${missing.join(", ")}.` : `Nome e ${g.techniques.length} tecniche presenti nella pagina.`,
  };
}

export function compareClaim(db: { victim: string; group_name: string; discovered_at: string }, src: { group_name?: string; discovered?: string } | undefined): QualityCheck {
  const item = `${db.group_name} · ${db.discovered_at.slice(0, 10)}`;
  const url = "https://www.ransomware.live/country/IT";
  if (!src) return { area: "ransomware", item, ok: false, detail: "Rivendicazione non più presente su ransomware.live (rimossa o rinominata).", url };
  const sameGroup = (src.group_name ?? "").trim().toLowerCase() === db.group_name;
  const sameDay = (src.discovered ?? "").slice(0, 10) === db.discovered_at.slice(0, 10);
  return { area: "ransomware", item, url, ok: sameGroup && sameDay, detail: sameGroup && sameDay ? "Gruppo e data coincidono." : `Diverso dalla fonte: ${[!sameGroup && "gruppo", !sameDay && "data"].filter(Boolean).join(" e ")}.` };
}

export function compareIoc(db: { value: string; malware: string | null }, src: { malware_printable?: string }[] | null): QualityCheck {
  const url = `https://threatfox.abuse.ch/browse.php?search=ioc%3A${encodeURIComponent(db.value)}`;
  const item = db.value.length > 60 ? `${db.value.slice(0, 57)}…` : db.value;
  if (!src?.length) return { area: "threatfox", item, ok: false, detail: "Indicatore non trovato su ThreatFox (forse rimosso come falso positivo).", url };
  const families = src.map((s) => (s.malware_printable ?? "").toLowerCase());
  const ok = !db.malware || families.includes(db.malware.toLowerCase());
  return { area: "threatfox", item, url, ok, detail: ok ? `Presente su ThreatFox${db.malware ? `, famiglia ${db.malware}` : ""}.` : `Famiglia diversa: ThreatFox indica ${src.map((s) => s.malware_printable).join(", ")}.` };
}

/** Citazioni tra «» di almeno 20 caratteri dentro il testo di un fatto. */
export const extractQuotes = (body: string) => [...body.matchAll(/«([^»]{20,})»/g)].map((m) => m[1].replace(/…$/, "").trim());

export function compareQuote(label: string, quote: string, url: string, pageText: string | null): QualityCheck {
  const short = quote.length > 90 ? `${quote.slice(0, 87)}…` : quote;
  if (!pageText) return { area: "citazioni", item: label, ok: false, detail: `Pagina non raggiungibile per verificare «${short}».`, url };
  const ok = quoteInSource(quote, pageText);
  return { area: "citazioni", item: label, ok, url, detail: ok ? `Citazione trovata nella pagina: «${short}».` : `Citazione NON trovata nella pagina: «${short}».` };
}

/** Ore massime tra un aggiornamento riuscito e l'altro, per fonte. */
export const MAX_AGE_HOURS: Record<string, number> = {
  cisa_kev: 14, threatfox: 14, urlhaus: 14, csirt_italia: 14, cisa_advisories: 14, ransomware_live: 14, ransomware_live_world: 14,
  mitre_attack: 24 * 8, mitre_d3fend: 24 * 8,
};

export function compareFreshness(sourceId: string, name: string, lastOk: string | null, now: number): QualityCheck {
  const max = MAX_AGE_HOURS[sourceId];
  const hours = lastOk ? (now - Date.parse(lastOk)) / 3600_000 : Infinity;
  return {
    area: "freschezza", item: name, ok: hours <= max,
    detail: lastOk ? `Ultimo aggiornamento riuscito ${Math.round(hours)} ore fa (atteso entro ${max}).` : "Nessun aggiornamento riuscito registrato.",
  };
}

export function summarize(checks: QualityCheck[]) {
  const out: Partial<Record<QualityArea, { checked: number; ok: number }>> = {};
  for (const c of checks) {
    const s = (out[c.area] ??= { checked: 0, ok: 0 });
    s.checked++;
    if (c.ok) s.ok++;
  }
  return out;
}
