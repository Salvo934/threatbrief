export const IOC_TYPES = ["ipv4", "ipv6", "domain", "url", "md5", "sha1", "sha256", "cve"] as const;
export type IocType = (typeof IOC_TYPES)[number];
export type Ioc = { type: IocType; value: string };

const IPV4 = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const DOMAIN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/;
const HEX = { md5: /^[a-f0-9]{32}$/, sha1: /^[a-f0-9]{40}$/, sha256: /^[a-f0-9]{64}$/ } as const;
const CVE = /^CVE-\d{4}-\d{4,}$/;

/** Rimuove il "defang" usato nei report: hxxp, [.], (.), [dot], [:]. */
export function refang(text: string): string {
  return text
    .replace(/\bhxxp(s?)/gi, "http$1")
    .replace(/\bh\[tt\]p(s?)/gi, "http$1")
    .replace(/\[\s*(?:\.|dot)\s*\]|\(\s*(?:\.|dot)\s*\)|\{\s*(?:\.|dot)\s*\}/gi, ".")
    .replace(/\[\s*:\s*\]/g, ":")
    .replace(/\[:\/\/\]/g, "://");
}

export function isIpv6(s: string): boolean {
  if (!s.includes(":") || !/^[0-9a-f:.]+$/i.test(s)) return false;
  try {
    return new URL(`http://[${s}]/`).hostname.length > 2;
  } catch {
    return false;
  }
}

function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    // URL normalizza già schema e host in minuscolo; il path resta com'è (è case-sensitive)
    return u.href;
  } catch {
    return null;
  }
}

/**
 * Valida e normalizza un indicatore. Restituisce null se non è valido.
 * Regole: domini e hash in minuscolo, niente punto finale, IP senza porta, CVE in maiuscolo.
 */
export function normalizeIoc(type: IocType, raw: string): Ioc | null {
  const v = refang(raw.trim());
  switch (type) {
    case "ipv4": {
      const ip = v.replace(/:\d+$/, "");
      return IPV4.test(ip) ? { type, value: ip } : null;
    }
    case "ipv6": {
      const ip = v.replace(/^\[|\](?::\d+)?$/g, "").toLowerCase();
      return isIpv6(ip) ? { type, value: ip } : null;
    }
    case "domain": {
      const d = v.toLowerCase().replace(/\.$/, "");
      return DOMAIN.test(d) ? { type, value: d } : null;
    }
    case "url": {
      const u = normalizeUrl(v);
      return u ? { type, value: u } : null;
    }
    case "md5":
    case "sha1":
    case "sha256": {
      const h = v.toLowerCase();
      return HEX[type].test(h) ? { type, value: h } : null;
    }
    case "cve": {
      const c = v.toUpperCase();
      return CVE.test(c) ? { type, value: c } : null;
    }
  }
}

/** ThreatFox "ip:port" può contenere anche IPv6: sceglie il tipo giusto. */
export function normalizeIpWithPort(raw: string): Ioc | null {
  const v = raw.trim();
  const bracketed = v.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed) return normalizeIoc("ipv6", bracketed[1]);
  return normalizeIoc("ipv4", v) ?? normalizeIoc("ipv6", v);
}
