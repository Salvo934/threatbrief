import { describe, expect, it } from "vitest";
import { extractIocs } from "@/lib/ioc/extract";
import { normalizeIoc, normalizeIpWithPort, refang } from "@/lib/ioc/normalize";

const pairs = (text: string) => extractIocs(text).map((i) => `${i.type}:${i.value}`).sort();

describe("refang", () => {
  it("toglie il defang comune", () => {
    expect(refang("hxxps://evil[.]com/a and 10[.]0[.]0[.]1 and bad(dot)org")).toBe(
      "https://evil.com/a and 10.0.0.1 and bad.org",
    );
  });
});

describe("normalizeIoc", () => {
  it("normalizza e valida", () => {
    expect(normalizeIoc("domain", "Evil.COM.")).toEqual({ type: "domain", value: "evil.com" });
    expect(normalizeIoc("ipv4", "1.2.3.4:8080")).toEqual({ type: "ipv4", value: "1.2.3.4" });
    expect(normalizeIoc("ipv4", "999.1.1.1")).toBeNull();
    expect(normalizeIoc("cve", "cve-2024-3400")).toEqual({ type: "cve", value: "CVE-2024-3400" });
    expect(normalizeIoc("url", "HTTP://Evil.COM/Path?A=1")).toEqual({ type: "url", value: "http://evil.com/Path?A=1" });
    expect(normalizeIoc("url", "ftp://x.com")).toBeNull();
    expect(normalizeIoc("md5", "D41D8CD98F00B204E9800998ECF8427E")?.value).toBe("d41d8cd98f00b204e9800998ecf8427e");
  });

  it("gestisce ip:port di ThreatFox anche in IPv6", () => {
    expect(normalizeIpWithPort("45.9.148.2:443")).toEqual({ type: "ipv4", value: "45.9.148.2" });
    expect(normalizeIpWithPort("[2001:db8::1]:443")).toEqual({ type: "ipv6", value: "2001:db8::1" });
  });
});

describe("extractIocs", () => {
  it("estrae tutti i tipi da un report defanged", () => {
    const text = `
      The actor used hxxps://update-check[.]net/load.php?id=7 and C2 at 185.220.101[.]4:443.
      Payload SHA256 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08,
      dropper MD5 d41d8cd98f00b204e9800998ecf8427e. It exploited CVE-2024-3400 on PAN-OS.
      Backup C2: cdn-sync[.]org, IPv6 2001:db8:85a3::8a2e:370:7334.`;
    expect(pairs(text)).toEqual([
      "cve:CVE-2024-3400",
      "domain:cdn-sync.org",
      "ipv4:185.220.101.4",
      "ipv6:2001:db8:85a3::8a2e:370:7334",
      "md5:d41d8cd98f00b204e9800998ecf8427e",
      "sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      "url:https://update-check.net/load.php?id=7",
    ]);
  });

  it("non estrae il dominio dentro un URL né i nomi di file", () => {
    expect(pairs("Downloaded http://evil.com/a.exe, saved as invoice.pdf and run via rundll32.exe")).toEqual([
      "url:http://evil.com/a.exe",
    ]);
  });

  it("non confonde orari, versioni ed email", () => {
    expect(pairs("At 12:30:45 version 1.2.3 contact soc@example.com")).toEqual([]);
  });

  it("non spezza uno SHA256 in hash più corti", () => {
    const h = "a".repeat(64);
    expect(pairs(h)).toEqual([`sha256:${h}`]);
  });

  it("accetta una 'TLD da file' solo se defanged", () => {
    expect(pairs("payload at evil[.]sh")).toEqual(["domain:evil.sh"]);
    expect(pairs("run install.sh")).toEqual([]);
  });

  it("toglie la punteggiatura finale dagli URL", () => {
    expect(pairs("(see https://example.org/x).")).toEqual(["url:https://example.org/x"]);
  });

  it("deduplica", () => {
    expect(pairs("1.1.1.1 1.1.1.1 EVIL.com evil.com")).toEqual(["domain:evil.com", "ipv4:1.1.1.1"]);
  });
});
