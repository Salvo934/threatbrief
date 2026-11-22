import type { RansomwareVictim } from "@/lib/data/ransomware";

const monthLabel = new Intl.DateTimeFormat("it-IT", { month: "short", year: "2-digit", timeZone: "UTC" });

/** Rivendicazioni per mese (data di scoperta), ultimi `months` mesi incluso il corrente. */
export function victimsByMonth(rows: Pick<RansomwareVictim, "discovered_at">[], today: Date, months = 12) {
  const buckets: { month: string; label: string; vittime: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    buckets.push({ month: d.toISOString().slice(0, 7), label: monthLabel.format(d), vittime: 0 });
  }
  const index = new Map(buckets.map((b, i) => [b.month, i]));
  for (const r of rows) {
    const i = index.get(r.discovered_at.slice(0, 7));
    if (i !== undefined) buckets[i].vittime++;
  }
  return buckets;
}

/** Gruppi più attivi, per numero di rivendicazioni. */
export function topGroups(rows: Pick<RansomwareVictim, "group_name">[], limit = 8) {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.group_name, (counts.get(r.group_name) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([group, count]) => ({ group, count }));
}
