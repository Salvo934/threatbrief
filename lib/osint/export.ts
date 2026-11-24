/** Esportazioni del registro OSINT: CSV per l'analisi (tesi) e STIX 2.1 per gli strumenti CTI. */

export type OsintSource = { name: string; url: string; ok: boolean; status?: number; ms: number; fetched_at: string; error?: string };
export type OsintSignal = { level: "alto" | "medio" | "info"; text: string; source: string };
export type OsintLookup = {
  id: string;
  query: string;
  kind: string;
  verdict: string;
  admiralty: string;
  signals: OsintSignal[];
  sources: OsintSource[];
  result: Record<string, unknown>;
  note: string | null;
  created_at: string;
};

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Celle che iniziano con = + - @ diventerebbero formule in Excel: le neutralizzo (CSV injection).
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** Una riga per indagine: pronto per Excel, R o Python. */
export function lookupsToCsv(rows: OsintLookup[]) {
  const head = ["data_utc", "indicatore", "tipo", "giudizio", "admiralty", "segnali_alti", "segnali_medi", "fonti_ok", "fonti_totali", "segnali", "fonti", "nota"];
  const lines = rows.map((r) => [
    r.created_at,
    r.query,
    r.kind,
    r.verdict,
    r.admiralty,
    r.signals.filter((s) => s.level === "alto").length,
    r.signals.filter((s) => s.level === "medio").length,
    r.sources.filter((s) => s.ok).length,
    r.sources.length,
    r.signals.map((s) => `[${s.level}] ${s.text} (${s.source})`).join(" | "),
    r.sources.map((s) => `${s.name}: ${s.ok ? "ok" : `errore ${s.error ?? s.status ?? ""}`} @ ${s.fetched_at}`).join(" | "),
    r.note ?? "",
  ].map(cell).join(","));
  return `${head.join(",")}\n${lines.join("\n")}\n`;
}

/** Citazione per una tesi: fonte, URL e momento esatto della consultazione. */
export function citations(l: OsintLookup) {
  return l.sources
    .filter((s) => s.url.startsWith("http"))
    .map((s) => `${s.name}. ${s.url} (consultato il ${new Date(s.fetched_at).toISOString().replace("T", " ").slice(0, 19)} UTC; esito: ${s.ok ? `HTTP ${s.status ?? "ok"}` : `errore${s.error ? ` – ${s.error}` : ""}`}).`);
}
