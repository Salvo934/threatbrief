/**
 * Edge Function «osint»: indagine passiva su dominio, IP, URL o hash.
 * - Solo per l'analista (token di sessione + riga in `analysts`, verificata dalla RLS).
 * - Il bersaglio non viene mai contattato: si interrogano solo fonti terze (RDAP, DNS pubblico,
 *   Certificate Transparency, Shodan InternetDB) e il database di ThreatBrief.
 * - Ogni indagine è salvata nel registro di ricerca con fonti, esiti e orari (riproducibile).
 */
import { createClient } from "npm:@supabase/supabase-js@2.119.2";
import { classify, lookalike, parseCrtSh, parseRdap, pivots, registrable, signals, verdict, type Indicator } from "./rules.ts";

const ALLOWED_ORIGINS = ["https://threatbrief.salvo-bonavita9808.workers.dev", "http://localhost:3100"];
const cors = (origin: string | null) => ({
  "access-control-allow-origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  vary: "origin",
});

type SourceLog = { name: string; url: string; ok: boolean; status?: number; ms: number; fetched_at: string; error?: string };

/** Chiama una fonte con un tempo massimo e registra l'esito (anche gli errori: fanno parte del metodo). */
async function source<T>(log: SourceLog[], name: string, url: string, parse: (r: Response) => Promise<T>, init: RequestInit = {}, timeoutMs = 15_000): Promise<T | null> {
  const t0 = Date.now();
  const entry: SourceLog = { name, url, ok: false, ms: 0, fetched_at: new Date().toISOString() };
  try {
    const res = await fetch(url, { ...init, headers: { "user-agent": "ThreatBrief-OSINT/0.1 (indagine passiva)", ...init.headers }, signal: AbortSignal.timeout(timeoutMs) });
    entry.status = res.status;
    if (res.status === 404) {
      entry.ok = true; // «nessun dato» è un risultato
      return null;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const v = await parse(res);
    entry.ok = true;
    return v;
  } catch (err) {
    entry.error = err instanceof Error ? err.message.slice(0, 200) : String(err);
    return null;
  } finally {
    entry.ms = Date.now() - t0;
    log.push(entry);
  }
}

const doh = (log: SourceLog[], name: string, type: string) =>
  source(log, `DNS ${type} (Cloudflare)`, `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
    async (r) => ((await r.json()) as { Answer?: { type: number; data: string }[] }).Answer?.map((a) => a.data.replace(/\.$/, "").replace(/^"|"$/g, "")) ?? [],
    { headers: { accept: "application/dns-json" } }, 8_000);

const internetDb = (log: SourceLog[], ip: string) =>
  source(log, "Shodan InternetDB", `https://internetdb.shodan.io/${ip}`,
    async (r) => (await r.json()) as { ports?: number[]; vulns?: string[]; hostnames?: string[]; tags?: string[]; cpes?: string[] });

async function investigate(ind: Indicator, db: ReturnType<typeof createClient>) {
  const log: SourceLog[] = [];
  const now = Date.now();
  const host = ind.kind === "url" ? ind.host! : ind.kind === "domain" ? ind.value : null;
  const hostIsIp = host ? classify(host)?.kind?.startsWith("ip") : false;
  const ip = ind.kind === "ipv4" || ind.kind === "ipv6" ? ind.value : hostIsIp ? host : null;
  const domain = host && !hostIsIp ? host : null;
  const result: Record<string, unknown> = { indicator: ind };

  if (domain) {
    const reg = registrable(domain);
    const [rdapJson, a, aaaa, mx, ns, txt, crt] = await Promise.all([
      source(log, "RDAP (registrazione)", `https://rdap.org/domain/${reg}`, async (r) => await r.json()),
      doh(log, domain, "A"), doh(log, domain, "AAAA"), doh(log, reg, "MX"), doh(log, reg, "NS"), doh(log, reg, "TXT"),
      source(log, "Certificate Transparency (crt.sh)", `https://crt.sh/?q=${encodeURIComponent(`%.${reg}`)}&output=json&exclude=expired`,
        async (r) => ((await r.json()) as unknown[]).slice(0, 3000) as { name_value?: string; not_before?: string; issuer_name?: string }[], {}, 45_000),
    ]);
    result.domain = reg;
    result.rdap = rdapJson ? parseRdap(rdapJson as never) : null;
    result.dns = { A: a ?? [], AAAA: aaaa ?? [], MX: mx ?? [], NS: ns ?? [], TXT: (txt ?? []).slice(0, 10) };
    result.certs = crt ? parseCrtSh(crt, reg) : null;
    result.lookalikeOf = lookalike(domain);
    result.unresolved = !(a ?? []).length && !(aaaa ?? []).length && !(ns ?? []).length && !(mx ?? []).length;
    const firstIp = (a ?? [])[0];
    if (firstIp) {
      result.hostingIp = firstIp;
      result.hosting = await internetDb(log, firstIp);
    }
  }
  if (ip) {
    const [rdapJson, idb] = await Promise.all([
      source(log, "RDAP (rete)", `https://rdap.org/ip/${ip}`, async (r) => await r.json()),
      internetDb(log, ip),
    ]);
    result.ipRdap = rdapJson ? parseRdap(rdapJson as never) : null;
    result.hosting = idb;
    result.hostingIp = ip;
  }

  // Database di ThreatBrief: IOC già visti (ThreatFox, URLhaus, OTX) e gruppi collegati.
  const hosting = (result.hosting ?? null) as { ports?: number[]; vulns?: string[]; hostnames?: string[]; tags?: string[] } | null;
  const ips = [...new Set([...(((result.dns as { A?: string[] })?.A) ?? []), ...(ip ? [ip] : [])])];
  const items = [
    { type: ind.kind === "ipv4" || ind.kind === "ipv6" ? ind.kind : ind.kind, value: ind.value },
    ...(domain ? [{ type: "domain", value: domain }] : []),
    ...ips.map((v) => ({ type: v.includes(":") ? "ipv6" : "ipv4", value: v })),
  ];
  const t0 = Date.now();
  const { data: known, error: kErr } = await db.rpc("lookup_iocs", { p_items: items });
  log.push({ name: "ThreatBrief (ThreatFox, URLhaus, OTX)", url: "database ThreatBrief", ok: !kErr, ms: Date.now() - t0, fetched_at: new Date().toISOString(), error: kErr?.message });
  const knownBad = ((known ?? []) as { ioc_id: number | null; value: string; sources: string[]; malware: string[]; last_seen: string; groups: { name: string }[] }[])
    .filter((k) => k.ioc_id)
    .map((k) => ({ value: k.value, sources: k.sources ?? [], malware: k.malware ?? [], lastSeen: k.last_seen, groups: (k.groups ?? []).map((g) => g.name) }));
  result.known = knownBad;

  const vulns = hosting?.vulns ?? [];
  let kevVulns: string[] = [];
  if (vulns.length) {
    const { data } = await db.from("kev_vulnerabilities").select("cve_id").in("cve_id", vulns.slice(0, 200));
    kevVulns = (data ?? []).map((d: { cve_id: string }) => d.cve_id);
  }
  result.kevVulns = kevVulns;

  const sig = signals({
    kind: ind.kind, rdap: (result.rdap as never) ?? undefined, certs: (result.certs as never) ?? undefined,
    ports: hosting?.ports, vulns, kevVulns, tags: hosting?.tags, knownBad, lookalikeOf: result.lookalikeOf as string | null, unresolved: result.unresolved === true, now,
  });
  const v = verdict(sig);
  result.pivots = pivots(ind, {
    ips, hostnames: hosting?.hostnames, subdomains: (result.certs as { subdomains?: string[] } | null)?.subdomains,
    nameservers: (result.rdap as { nameservers?: string[] } | null)?.nameservers,
  });
  return { result, signals: sig, verdict: v, sources: log };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "content-type": "application/json" } });
  if (req.method !== "POST") return json({ error: "Metodo non consentito" }, 405);

  const auth = req.headers.get("authorization") ?? "";
  // Chiave pubblica (publishable) inviata dal browser; le chiavi «anon» legacy possono essere disattivate.
  const apikey = req.headers.get("apikey") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const db = createClient(Deno.env.get("SUPABASE_URL")!, apikey, { global: { headers: { authorization: auth } } });
  // La firma del token è verificata dal gateway (verify_jwt) prima di arrivare qui e di nuovo dal
  // database a ogni query: qui leggiamo solo l'id utente. Con un token falso la RLS non restituisce
  // la riga di `analysts`, quindi l'accesso resta negato.
  let userId: string | undefined;
  try {
    const payload = auth.replace(/^Bearer\s+/i, "").split(".")[1] ?? "";
    userId = (JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { sub?: string }).sub;
  } catch {
    userId = undefined;
  }
  if (!userId) return json({ error: "Accesso richiesto" }, 401);
  const { data: analyst } = await db.from("analysts").select("user_id").eq("user_id", userId).maybeSingle();
  if (!analyst) return json({ error: "Strumento riservato all'analista" }, 403);

  let query = "";
  try {
    query = String(((await req.json()) as { query?: unknown }).query ?? "").slice(0, 2048);
  } catch {
    return json({ error: "Richiesta non valida" }, 400);
  }
  const ind = classify(query);
  if (!ind) return json({ error: "Indicatore non riconosciuto: inserisci un dominio, un IP, un URL o un hash (MD5, SHA-1, SHA-256)." }, 400);

  const out = await investigate(ind, db);
  const { data: saved, error } = await db.from("osint_lookups").insert({
    query, kind: ind.kind, verdict: out.verdict.label, admiralty: out.verdict.admiralty,
    signals: out.signals, sources: out.sources, result: out.result,
  }).select("id, created_at").single();
  return json({ ...out, id: saved?.id ?? null, created_at: saved?.created_at ?? new Date().toISOString(), saveError: error?.message ?? null });
});
