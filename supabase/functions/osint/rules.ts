/**
 * Strumento OSINT: regole pure (nessuna chiamata di rete), usate dalla Edge Function e dai test.
 * Indagine PASSIVA: il bersaglio non viene mai contattato; si interrogano solo fonti terze.
 */

export type IndicatorKind = "domain" | "ipv4" | "ipv6" | "url" | "md5" | "sha1" | "sha256";
export type Indicator = { kind: IndicatorKind; value: string; host?: string };

/** «Refang»: hxxp → http, [.] → ., (dot) → . — così si incollano indicatori resi innocui. */
export function refang(input: string) {
  return input
    .trim()
    .replace(/^hxxp/i, "http")
    .replace(/\[(\.|dot)\]|\((\.|dot)\)|\{(\.|dot)\}/gi, ".")
    .replace(/\[:\]/g, ":")
    .replace(/\s+/g, "");
}

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6 = /^[0-9a-f:]+$/i;
const DOMAIN = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function classify(raw: string): Indicator | null {
  const v = refang(raw);
  if (!v) return null;
  if (/^[a-f0-9]{64}$/i.test(v)) return { kind: "sha256", value: v.toLowerCase() };
  if (/^[a-f0-9]{40}$/i.test(v)) return { kind: "sha1", value: v.toLowerCase() };
  if (/^[a-f0-9]{32}$/i.test(v)) return { kind: "md5", value: v.toLowerCase() };
  if (IPV4.test(v)) return { kind: "ipv4", value: v };
  if (v.includes(":") && IPV6.test(v) && v.split(":").length > 2) return { kind: "ipv6", value: v.toLowerCase() };
  if (/^https?:\/\//i.test(v)) {
    try {
      const u = new URL(v);
      return { kind: "url", value: u.toString(), host: u.hostname.toLowerCase() };
    } catch {
      return null;
    }
  }
  const d = v.toLowerCase().replace(/\.$/, "");
  return DOMAIN.test(d) ? { kind: "domain", value: d } : null;
}

/** Dominio registrabile (approssimato): ultimi due livelli, tre per i suffissi tipo co.uk / com.au. */
export function registrable(host: string) {
  const p = host.toLowerCase().split(".");
  const two = p.slice(-2).join(".");
  return /^(co|com|net|org|gov|edu|ac)\.[a-z]{2}$/.test(two) && p.length >= 3 ? p.slice(-3).join(".") : two;
}

/** Marchi italiani spesso imitati nel phishing (elenco del progetto, ampliabile). */
export const ITALIAN_BRANDS = [
  "poste", "posteitaliane", "bancoposta", "intesasanpaolo", "unicredit", "bper", "bancobpm", "mps", "fineco", "mediolanum",
  "inps", "agenziaentrate", "aci", "spid", "pagopa", "enel", "eni", "tim", "vodafone", "windtre", "iliad", "aruba",
  "leonardo", "fincantieri", "trenitalia", "italo", "nexi", "satispay", "amazon", "dhl", "brt", "gls",
];

function levenshtein(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** Marchio imitato: contenuto nel nome con aggiunte (poste-verifica) o con 1 errore (intesasanpa0lo). */
export function lookalike(domain: string, officialDomains: string[] = []): string | null {
  const reg = registrable(domain);
  if (officialDomains.includes(reg)) return null;
  const original = reg.split(".")[0];
  // Omoglifi frequenti nel phishing: 0→o, 1→l (la «I» maiuscola diventa già «i» minuscola).
  const label = original.replace(/0/g, "o").replace(/1/g, "l");
  for (const b of ITALIAN_BRANDS) {
    if (original === b) continue; // stesso nome esatto: potrebbe essere il sito ufficiale su un altro dominio
    if (label === b) return b; // uguale solo dopo aver sostituito i caratteri simili: imitazione
    if (b.length >= 4 && label.includes(b)) return b;
    if (b.length >= 6 && Math.abs(label.length - b.length) <= 1 && levenshtein(label, b) === 1) return b;
  }
  // Marchio nel sottodominio di un dominio qualsiasi: poste.it.verifica-conto.com
  const sub = domain.toLowerCase().slice(0, -(reg.length + 1)).split(".").filter(Boolean);
  for (const b of ITALIAN_BRANDS) {
    if (b.length >= 5 && original !== b && sub.some((l) => l.includes(b))) return b;
  }
  return null;
}

export type Rdap = { registered?: string; lastChanged?: string; expires?: string; registrar?: string; nameservers?: string[]; status?: string[]; network?: string; cidr?: string; country?: string; org?: string };

type RdapEntity = { roles?: string[]; vcardArray?: [string, [string, unknown, string, unknown][]] };
type RdapJson = {
  events?: { eventAction: string; eventDate: string }[];
  entities?: RdapEntity[];
  nameservers?: { ldhName?: string }[];
  status?: string[];
  name?: string;
  startAddress?: string;
  endAddress?: string;
  cidr0_cidrs?: { v4prefix?: string; v6prefix?: string; length: number }[];
  country?: string;
};

const vcardName = (e?: RdapEntity) => e?.vcardArray?.[1]?.find((f) => f[0] === "fn")?.[3] as string | undefined;
/** Solo i contatti che il registro marca come organizzazione (vCard kind=org): mai nomi di persone. */
const isOrg = (e?: RdapEntity) => e?.vcardArray?.[1]?.some((f) => f[0] === "kind" && String(f[3]).toLowerCase() === "org") ?? false;

export function parseRdap(j: RdapJson): Rdap {
  const ev = (a: string) => j.events?.find((e) => e.eventAction === a)?.eventDate;
  const byRole = (r: string) => j.entities?.find((e) => e.roles?.includes(r));
  const orgByRole = (r: string) => j.entities?.find((e) => e.roles?.includes(r) && isOrg(e));
  const cidr = j.cidr0_cidrs?.[0];
  return {
    registered: ev("registration"),
    lastChanged: ev("last changed"),
    expires: ev("expiration"),
    registrar: vcardName(byRole("registrar")),
    nameservers: j.nameservers?.map((n) => n.ldhName?.toLowerCase() ?? "").filter(Boolean),
    status: j.status,
    network: j.name,
    cidr: cidr ? `${cidr.v4prefix ?? cidr.v6prefix}/${cidr.length}` : j.startAddress && j.endAddress ? `${j.startAddress} – ${j.endAddress}` : undefined,
    country: j.country,
    org: vcardName(orgByRole("registrant")) ?? vcardName(orgByRole("administrative")) ?? vcardName(orgByRole("abuse")),
  };
}

export type CertSummary = { total: number; first?: string; last?: string; issuers: string[]; subdomains: string[] };

/** crt.sh: nomi distinti (senza «*.»), primo e ultimo certificato, emittenti. */
export function parseCrtSh(rows: { name_value?: string; not_before?: string; issuer_name?: string }[], domain: string, limit = 60): CertSummary {
  const names = new Set<string>();
  const issuers = new Set<string>();
  let first: string | undefined;
  let last: string | undefined;
  for (const r of rows) {
    for (const n of (r.name_value ?? "").split(/\s+/)) {
      const h = n.toLowerCase().replace(/^\*\./, "");
      if (h && h !== domain && h.endsWith(`.${domain}`)) names.add(h);
    }
    const o = /O=([^,]+)/.exec(r.issuer_name ?? "")?.[1];
    if (o) issuers.add(o.replace(/"/g, "").trim());
    if (r.not_before) {
      if (!first || r.not_before < first) first = r.not_before;
      if (!last || r.not_before > last) last = r.not_before;
    }
  }
  return { total: rows.length, first, last, issuers: [...issuers].slice(0, 6), subdomains: [...names].sort().slice(0, limit) };
}

/** Porte che espongono amministrazione remota o servizi da non pubblicare su Internet. */
export const RISKY_PORTS: Record<number, string> = { 21: "FTP", 22: "SSH", 23: "Telnet", 445: "SMB", 1433: "MS SQL", 3306: "MySQL", 3389: "RDP", 5432: "PostgreSQL", 5900: "VNC", 6379: "Redis", 9200: "Elasticsearch", 27017: "MongoDB" };

export type Signal = { level: "alto" | "medio" | "info"; text: string; source: string };

export type Evidence = {
  kind: IndicatorKind;
  rdap?: Rdap;
  certs?: CertSummary;
  ports?: number[];
  vulns?: string[];
  kevVulns?: string[];
  tags?: string[];
  knownBad?: { sources: string[]; malware: string[]; lastSeen?: string; groups: string[] }[];
  lookalikeOf?: string | null;
  /** dominio senza record DNS: non registrato o non attivo */
  unresolved?: boolean;
  now: number;
};

const days = (iso: string | undefined, now: number) => (iso ? Math.floor((now - Date.parse(iso)) / 86_400_000) : null);

/** Segnali con motivo e fonte. Nessun segnale ≠ sicuro: le fonti vedono solo una parte di Internet. */
export function signals(e: Evidence): Signal[] {
  const out: Signal[] = [];
  for (const k of e.knownBad ?? []) {
    out.push({ level: "alto", source: k.sources.join(", "), text: `Segnalato come malevolo${k.malware.length ? ` (${k.malware.join(", ")})` : ""}${k.lastSeen ? `, ultima segnalazione ${k.lastSeen.slice(0, 10)}` : ""}${k.groups.length ? `; malware usato da ${k.groups.length} gruppi documentati (indizio, non attribuzione)` : ""}.` });
  }
  if (e.unresolved) out.push({ level: "info", source: "DNS (Cloudflare)", text: "Il dominio non risolve: non registrato oppure non attivo (nessun record DNS)." });
  const age = days(e.rdap?.registered, e.now);
  if (age !== null && age <= 30) out.push({ level: "alto", source: "RDAP", text: `Dominio registrato da ${age} giorni: tipico delle campagne di phishing.` });
  else if (age !== null && age <= 180) out.push({ level: "medio", source: "RDAP", text: `Dominio registrato da ${age} giorni.` });
  if (e.lookalikeOf) out.push({ level: "alto", source: "regola ThreatBrief", text: `Il nome imita il marchio «${e.lookalikeOf}».` });
  if (e.kevVulns?.length) out.push({ level: "alto", source: "Shodan InternetDB + CISA KEV", text: `Vulnerabilità sfruttate attivamente sull'host: ${e.kevVulns.slice(0, 5).join(", ")}.` });
  else if (e.vulns?.length) out.push({ level: "medio", source: "Shodan InternetDB", text: `${e.vulns.length} vulnerabilità note segnalate sull'host (non verificate).` });
  const risky = (e.ports ?? []).filter((p) => RISKY_PORTS[p]);
  if (risky.length) out.push({ level: "medio", source: "Shodan InternetDB", text: `Servizi esposti su Internet: ${risky.map((p) => `${RISKY_PORTS[p]} (${p})`).join(", ")}.` });
  if ((e.tags ?? []).some((t) => /c2|malware|compromised/i.test(t))) out.push({ level: "alto", source: "Shodan InternetDB", text: `Etichette Shodan: ${e.tags!.join(", ")}.` });
  else if ((e.tags ?? []).some((t) => /tor|vpn|proxy/i.test(t))) out.push({ level: "info", source: "Shodan InternetDB", text: `Infrastruttura di anonimizzazione: ${e.tags!.join(", ")}.` });
  if (e.certs && e.certs.total > 0 && days(e.certs.first, e.now) !== null && days(e.certs.first, e.now)! <= 30) {
    out.push({ level: "medio", source: "crt.sh", text: `Primo certificato emesso ${days(e.certs.first, e.now)} giorni fa.` });
  }
  return out;
}

export type Verdict = { label: "malevolo" | "sospetto" | "nessuna evidenza"; admiralty: string; why: string };

export function verdict(s: Signal[]): Verdict {
  const high = s.filter((x) => x.level === "alto");
  if (high.some((x) => x.text.startsWith("Segnalato come malevolo"))) {
    return { label: "malevolo", admiralty: "B2", why: "Segnalato da fonti di threat intelligence affidabili; la segnalazione può essere vecchia o un falso positivo." };
  }
  if (high.length) return { label: "sospetto", admiralty: "C3", why: `${high.length} segnali di rischio alti, ma nessuna segnalazione diretta come malevolo.` };
  if (s.some((x) => x.level === "medio")) return { label: "sospetto", admiralty: "C4", why: "Solo segnali deboli: da approfondire prima di agire." };
  return { label: "nessuna evidenza", admiralty: "F6", why: "Le fonti consultate non segnalano nulla: NON significa che sia sicuro." };
}

export type Pivot = { kind: IndicatorKind; value: string; via: string };

/** Nuove ricerche suggerite dai risultati: ogni pivot dice da dove viene. */
export function pivots(input: Indicator, r: { ips?: string[]; hostnames?: string[]; subdomains?: string[]; nameservers?: string[] }): Pivot[] {
  const out = new Map<string, Pivot>();
  const add = (p: Pivot) => p.value !== input.value && !out.has(`${p.kind}|${p.value}`) && out.set(`${p.kind}|${p.value}`, p);
  for (const ip of r.ips ?? []) add({ kind: ip.includes(":") ? "ipv6" : "ipv4", value: ip, via: "record DNS" });
  for (const h of r.hostnames ?? []) add({ kind: "domain", value: h, via: "nomi associati all'IP (Shodan)" });
  for (const s of (r.subdomains ?? []).slice(0, 12)) add({ kind: "domain", value: s, via: "certificati (crt.sh)" });
  for (const n of r.nameservers ?? []) add({ kind: "domain", value: n, via: "name server (RDAP)" });
  return [...out.values()].slice(0, 30);
}
