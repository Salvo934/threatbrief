import type { Kev } from "@/lib/db/types";

const monthLabel = new Intl.DateTimeFormat("it-IT", { month: "short", year: "2-digit", timeZone: "UTC" });

/** Ultimi `months` mesi (incluso quello di `today`), con totale KEV e quante hanno uso ransomware noto. */
export function kevByMonth(rows: Kev[], today: Date, months = 12) {
  const buckets: { month: string; label: string; totale: number; ransomware: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    buckets.push({ month: d.toISOString().slice(0, 7), label: monthLabel.format(d), totale: 0, ransomware: 0 });
  }
  const index = new Map(buckets.map((b, i) => [b.month, i]));
  for (const r of rows) {
    const i = index.get(r.date_added.slice(0, 7));
    if (i === undefined) continue;
    buckets[i].totale++;
    if (r.known_ransomware_use) buckets[i].ransomware++;
  }
  return buckets;
}

/** Data ISO (YYYY-MM-DD) di `days` giorni prima di `today`. */
export function isoDaysAgo(today: Date, days: number) {
  return new Date(today.getTime() - days * 86_400_000).toISOString().slice(0, 10);
}

/** Primo giorno del mese, `months - 1` mesi prima di `today`. */
export function isoMonthsAgoStart(today: Date, months: number) {
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (months - 1), 1)).toISOString().slice(0, 10);
}
