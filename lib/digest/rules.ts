import type { DigestItem } from "./types";

/**
 * Regole della bozza: funzioni pure, testate. Producono SOLO suggerimenti: la priorità
 * finale, il «perché ci riguarda» e il «cosa fare» li decide l'analista.
 */

export type KevRow = {
  cve_id: string;
  vendor_project: string;
  product: string;
  vulnerability_name: string;
  date_added: string;
  due_date: string | null;
  known_ransomware_use: boolean;
};
export type CsirtRow = { external_id: string; title: string; summary: string | null; url: string | null; published_at: string | null; cves: string[] };
export type VictimRow = { victim: string; group_name: string; sector_id: string | null; sector_raw: string | null };
export type ObservationRow = { source_id: string; malware: string | null };
export type RunRow = { source_id: string; status: string; error: string | null; started_at: string };

const fmtDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("it-IT", { timeZone: "Europe/Rome" });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function kevItems(rows: KevRow[]): DigestItem[] {
  return rows.map((k) => ({
    key: `kev:${k.cve_id}`,
    section: "kev",
    title: `${k.cve_id} — ${k.vendor_project} ${k.product}`,
    facts:
      `${k.vulnerability_name}. Aggiunta al catalogo KEV il ${fmtDate(k.date_added)}` +
      (k.due_date ? `; scadenza indicata da CISA per le agenzie federali: ${fmtDate(k.due_date)}` : "") +
      `. Uso in campagne ransomware: ${k.known_ransomware_use ? "noto" : "non noto"}.`,
    source: { name: "CISA KEV", url: `https://nvd.nist.gov/vuln/detail/${k.cve_id}` },
    suggested: k.known_ransomware_use ? "azione" : "monitorare",
    reason: k.known_ransomware_use
      ? "Sfruttata attivamente e usata da gruppi ransomware: verificare subito se il prodotto è presente ed esposto."
      : "Sfruttata attivamente: verificare se il prodotto è in uso.",
  }));
}

export function csirtItems(rows: CsirtRow[], kevCves: Set<string>): DigestItem[] {
  return rows.map((r) => {
    const inKev = r.cves.filter((c) => kevCves.has(c));
    return {
      key: `csirt:${r.external_id}`,
      section: "csirt",
      title: r.title,
      facts:
        (r.summary ? `${r.summary.slice(0, 280)}${r.summary.length > 280 ? "…" : ""} ` : "") +
        (r.cves.length ? `CVE citate: ${r.cves.join(", ")}.` : "Nessuna CVE citata."),
      source: { name: "CSIRT Italia", url: r.url },
      suggested: inKev.length ? "azione" : r.cves.length ? "monitorare" : "info",
      reason: inKev.length
        ? `Cita ${inKev.join(", ")}, presenti nel catalogo KEV (sfruttamento attivo).`
        : r.cves.length
          ? "Cita vulnerabilità non (ancora) nel catalogo KEV."
          : "Avviso informativo senza vulnerabilità specifiche.",
    };
  });
}

/** Un elemento per settore (più uno per i settori non mappati), con i gruppi e le vittime dichiarate. */
export function ransomwareItems(rows: VictimRow[], sectorName: (id: string) => string): DigestItem[] {
  const bySector = new Map<string, VictimRow[]>();
  for (const v of rows) {
    const k = v.sector_id ?? "altri";
    bySector.set(k, [...(bySector.get(k) ?? []), v]);
  }
  return [...bySector.entries()]
    .sort((a, b) => (a[0] === "altri" ? 1 : b[0] === "altri" ? -1 : b[1].length - a[1].length))
    .map(([sector, list]) => {
      const groups = new Map<string, number>();
      for (const v of list) groups.set(v.group_name, (groups.get(v.group_name) ?? 0) + 1);
      const topGroup = [...groups.entries()].sort((a, b) => b[1] - a[1])[0];
      const repeated = topGroup && topGroup[1] >= 3;
      const label = sector === "altri" ? "altri settori" : sectorName(sector);
      return {
        key: `ransomware:${sector}`,
        section: "ransomware" as const,
        title: `${plural(list.length, "rivendicazione", "rivendicazioni")} — ${label}`,
        facts:
          `Gruppi: ${[...groups.entries()].map(([g, n]) => `${g} (${n})`).join(", ")}. ` +
          `Organizzazioni dichiarate: ${list.slice(0, 6).map((v) => v.victim).join("; ")}${list.length > 6 ? "; …" : ""}. ` +
          "Rivendicazioni pubblicate dai gruppi, non verificate.",
        source: { name: "ransomware.live", url: "https://www.ransomware.live/" },
        suggested: sector === "altri" ? "info" : "monitorare",
        reason: repeated
          ? `${topGroup[0]} ha ${topGroup[1]} rivendicazioni nel periodo: possibile campagna in corso nel settore.`
          : sector === "altri"
            ? "Settori non coperti dalle dashboard: utile solo per il quadro generale."
            : "Verificare se tra le vittime ci sono clienti, fornitori o aziende della stessa filiera.",
      };
    });
}

export function iocItem(rows: ObservationRow[], sourceName: (id: string) => string): DigestItem[] {
  if (!rows.length) return [];
  const bySource = new Map<string, number>();
  const byMalware = new Map<string, number>();
  for (const r of rows) {
    bySource.set(r.source_id, (bySource.get(r.source_id) ?? 0) + 1);
    if (r.malware) byMalware.set(r.malware, (byMalware.get(r.malware) ?? 0) + 1);
  }
  const top = [...byMalware.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  return [
    {
      key: "ioc:sintesi",
      section: "ioc",
      title: `${plural(rows.length, "nuova osservazione", "nuove osservazioni")} di indicatori`,
      facts:
        `Per fonte: ${[...bySource.entries()].map(([s, n]) => `${sourceName(s)} ${n}`).join(", ")}. ` +
        (top.length ? `Famiglie più frequenti: ${top.map(([m, n]) => `${m} (${n})`).join(", ")}.` : "Nessuna famiglia di malware indicata."),
      source: { name: "abuse.ch e altre fonti IOC", url: null },
      suggested: "info",
      reason: "Gli indicatori sono già disponibili per la ricerca nei log; da segnalare solo se una famiglia riguarda i nostri settori.",
    },
  ];
}

/** Fonti che nel periodo hanno avuto problemi: prima di fidarsi dei dati, va saputo. */
export function sourceItems(rows: RunRow[], sourceName: (id: string) => string): DigestItem[] {
  const latest = new Map<string, RunRow>();
  for (const r of [...rows].sort((a, b) => a.started_at.localeCompare(b.started_at))) latest.set(r.source_id, r);
  return [...latest.values()]
    .filter((r) => r.status === "error" || r.status === "partial")
    .map((r) => ({
      key: `fonti:${r.source_id}`,
      section: "fonti" as const,
      title: `${sourceName(r.source_id)}: ultima raccolta ${r.status === "error" ? "in errore" : "parziale"}`,
      facts: r.error ? `Dettaglio: ${r.error.slice(0, 200)}` : "Nessun dettaglio disponibile.",
      source: { name: "Pagina Fonti", url: "/fonti" },
      suggested: "info",
      reason: "I dati di questa fonte potrebbero essere incompleti: tenerne conto nella valutazione.",
    }));
}

/** Finestra del digest: dalla fine del precedente (max 72 ore, es. il weekend) fino ad adesso. */
export function digestWindow(now: Date, previousEnd: string | null) {
  const max = new Date(now.getTime() - 72 * 3_600_000);
  const day = new Date(now.getTime() - 24 * 3_600_000);
  let start = previousEnd ? new Date(previousEnd) : day;
  if (start < max) start = max;
  if (start >= now) start = day;
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(now); // YYYY-MM-DD
  return { start, end: now, date };
}
