/**
 * Controlli sulle risposte dell'IA per lo strumento OSINT (puri, testati in tests/osint-ai.test.ts).
 * L'IA lavora solo sui dati raccolti: qui si scarta ciò che non è riconducibile a quei dati.
 */

export const clip = (s: string, n: number) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, t.lastIndexOf(" ", n - 1))}…`;
};

/** Numeri nel testo che non compaiono nei dati (date e IP inclusi, cifra per cifra). */
export function unknownNumbers(text: string, data: unknown) {
  const allowed = new Set(JSON.stringify(data).match(/\d+/g) ?? []);
  return (text.match(/\d+/g) ?? []).filter((n) => !allowed.has(n));
}

/** Dati essenziali di un'indagine da passare all'IA (niente URL di fonti, niente testo libero dell'utente). */
export function compactLookup(l: { query: string; kind: string; verdict: string; admiralty: string; signals: { level: string; text: string }[]; result: Record<string, unknown> }) {
  const r = l.result as {
    rdap?: { registered?: string; registrar?: string; nameservers?: string[] } | null;
    ipRdap?: { network?: string; cidr?: string; country?: string; org?: string } | null;
    dns?: Record<string, string[]>; hosting?: { ports?: number[]; vulns?: string[]; hostnames?: string[]; tags?: string[] } | null;
    certs?: { total?: number; first?: string; subdomains?: string[] } | null; known?: { malware: string[]; sources: string[]; lastSeen?: string }[];
    kevVulns?: string[]; lookalikeOf?: string | null; pivots?: { value: string; via: string }[]; unresolved?: boolean;
  };
  return {
    indicatore: l.query, tipo: l.kind, giudizio: l.verdict, admiralty: l.admiralty,
    segnali: l.signals.map((s) => `[${s.level}] ${s.text}`),
    registrazione: r.rdap ? { data: r.rdap.registered ?? null, registrar: r.rdap.registrar ?? null, name_server: r.rdap.nameservers ?? [] } : null,
    rete: r.ipRdap ?? null,
    dns: r.dns ?? null,
    host: r.hosting ? { porte: r.hosting.ports ?? [], vulnerabilita: (r.hosting.vulns ?? []).slice(0, 10), kev: r.kevVulns ?? [], nomi: (r.hosting.hostnames ?? []).slice(0, 5), etichette: r.hosting.tags ?? [] } : null,
    certificati: r.certs ? { totale: r.certs.total ?? 0, primo: r.certs.first ?? null, sottodomini: (r.certs.subdomains ?? []).length } : null,
    gia_noto: r.known ?? [],
    marchio_imitato: r.lookalikeOf ?? null,
    non_risolve: r.unresolved ?? false,
    collegamenti: (r.pivots ?? []).map((p) => ({ valore: p.value, da: p.via })),
  };
}

export type SummaryRaw = { summary: string; next_steps: { pivot: string; why: string }[] };

/** Tiene la nota solo se i numeri tornano; tiene solo i passi che puntano a collegamenti reali. */
export function validateSummary(raw: SummaryRaw, data: ReturnType<typeof compactLookup>) {
  const bad = unknownNumbers(raw.summary, data);
  if (bad.length || !raw.summary.trim()) return { ok: false as const, reason: bad.length ? `numeri non presenti nei dati: ${bad.join(", ")}` : "nota vuota" };
  const pivots = new Set(data.collegamenti.map((c) => c.valore));
  const steps = raw.next_steps.filter((s) => pivots.has(s.pivot.trim())).slice(0, 3).map((s) => ({ pivot: s.pivot.trim(), why: clip(s.why, 220) }));
  return { ok: true as const, summary: clip(raw.summary, 700), next_steps: steps, rejected: raw.next_steps.length - steps.length };
}

export type BatchRaw = { clusters: { id: string; title: string; description: string; action: string }[] };

/** Descrizioni solo per i gruppi calcolati dal codice, con numeri presenti nei dati. */
export function validateBatch(raw: BatchRaw, data: unknown, ids: Set<string>) {
  const out: { id: string; title: string; description: string; action: string }[] = [];
  let rejected = 0;
  for (const c of raw.clusters) {
    const text = `${c.title} ${c.description} ${c.action}`;
    if (!ids.has(c.id) || unknownNumbers(text, data).length) {
      rejected++;
      continue;
    }
    out.push({ id: c.id, title: clip(c.title, 90), description: clip(c.description, 500), action: clip(c.action, 220) });
  }
  return { clusters: out, rejected };
}
