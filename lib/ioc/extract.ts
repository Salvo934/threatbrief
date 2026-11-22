import { isIpv6, normalizeIoc, refang, type Ioc, type IocType } from "./normalize";

// Estensioni di file che sembrano TLD ma in un report quasi sempre sono nomi di file.
// Un dominio con queste "TLD" viene accettato solo se nel testo era defanged (es. evil[.]sh).
const FILE_LIKE_TLDS = new Set([
  "exe", "dll", "sys", "bin", "dat", "tmp", "log", "txt", "ini", "cfg", "conf", "json", "xml", "yml", "yaml",
  "pdf", "doc", "docx", "docm", "xls", "xlsx", "xlsm", "ppt", "pptx", "rtf", "csv", "lnk", "hta", "iso", "img",
  "vhd", "msi", "zip", "rar", "7z", "gz", "tar", "cab", "jar", "apk", "js", "jse", "vbs", "vbe", "wsf", "ps1",
  "psm1", "bat", "cmd", "scr", "cpl", "ocx", "png", "jpg", "jpeg", "gif", "bmp", "svg", "htm", "html", "php",
  "asp", "aspx", "jsp", "py", "pl", "sh", "rb", "go", "rs", "md", "so", "ko", "dmg", "pkg", "deb", "rpm",
  "py", "pyc", "class", "java", "cs", "cpp", "h", "c", "ts", "plist", "tsx", "db", "sqlite", "key", "pem", "crt",
]);
// Nomi tipici di namespace/API (System.Net, kernel32.dll...) che non sono domini.
const NOT_DOMAIN_PREFIX = /^(?:system|microsoft|windows|kernel32|ntdll|user32|advapi32|java|javax|android|com\.android|org\.apache)\./i;

const URL_RE = /\bhttps?:\/\/[^\s"'<>`{}|\\^]+/gi;
const EMAIL_RE = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi;
const IPV4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?\b/g;
const IPV6_RE = /(?<![0-9a-f:])(?:[0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}(?![0-9a-f:])/gi;
const SHA256_RE = /\b[a-f0-9]{64}\b/gi;
const SHA1_RE = /\b[a-f0-9]{40}\b/gi;
const MD5_RE = /\b[a-f0-9]{32}\b/gi;
const CVE_RE = /\bCVE-\d{4}-\d{4,}\b/gi;
const DOMAIN_RE = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]\b/gi;

export type ExtractedIoc = Ioc & { defanged: boolean };

/** Sostituisce i match con spazi, così le regex successive non li riprendono. */
function mask(text: string, start: number, length: number) {
  return text.slice(0, start) + " ".repeat(length) + text.slice(start + length);
}

function trimUrl(u: string) {
  // punteggiatura finale e parentesi non bilanciate attaccate all'URL nel testo
  let s = u.replace(/[.,;:!?'"»]+$/, "");
  while (s.endsWith(")") && (s.match(/\(/g)?.length ?? 0) < (s.match(/\)/g)?.length ?? 0)) s = s.slice(0, -1);
  return s;
}

/**
 * Estrae gli IOC da testo libero (report, email, liste). Gestisce il defang, evita i doppioni
 * e non confonde nomi di file (report.pdf) o hash parziali con indicatori.
 */
export function extractIocs(input: string): ExtractedIoc[] {
  const original = input.slice(0, 200_000);
  let text = refang(original);
  const wasDefanged = text !== original;
  const out = new Map<string, ExtractedIoc>();
  const add = (type: IocType, raw: string, defanged = wasDefanged) => {
    const ioc = normalizeIoc(type, raw);
    if (ioc) out.set(`${ioc.type}|${ioc.value}`, { ...ioc, defanged });
  };

  const take = (re: RegExp, fn: (m: string) => void) => {
    re.lastIndex = 0;
    for (let m; (m = re.exec(text)); ) {
      fn(m[0]);
      text = mask(text, m.index, m[0].length);
    }
  };

  take(URL_RE, (m) => add("url", trimUrl(m)));
  take(EMAIL_RE, () => {}); // le email non sono tra i tipi gestiti: le togliamo per non estrarne il dominio
  take(CVE_RE, (m) => add("cve", m));
  take(SHA256_RE, (m) => add("sha256", m));
  take(SHA1_RE, (m) => add("sha1", m));
  take(MD5_RE, (m) => add("md5", m));
  take(IPV4_RE, (m) => add("ipv4", m));
  take(IPV6_RE, (m) => {
    // filtra orari (12:30:45) e altro testo con i due punti
    if (isIpv6(m) && /[a-f]|::|(?:[0-9a-f]{1,4}:){4,}/i.test(m)) add("ipv6", m);
  });
  take(DOMAIN_RE, (m) => {
    const d = m.toLowerCase();
    const tld = d.slice(d.lastIndexOf(".") + 1);
    if (NOT_DOMAIN_PREFIX.test(d)) return;
    if (FILE_LIKE_TLDS.has(tld) && !wasDefanged) return;
    if (/^\d+$/.test(tld)) return;
    add("domain", d);
  });

  return [...out.values()];
}

export function countByType(iocs: Ioc[]): Partial<Record<IocType, number>> {
  const c: Partial<Record<IocType, number>> = {};
  for (const i of iocs) c[i.type] = (c[i.type] ?? 0) + 1;
  return c;
}
