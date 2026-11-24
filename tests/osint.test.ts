import { describe, expect, it } from "vitest";
import { classify, lookalike, parseCrtSh, parseRdap, pivots, refang, registrable, signals, verdict } from "@/supabase/functions/osint/rules";

const NOW = Date.parse("2026-11-24T12:00:00Z");

describe("OSINT: riconoscimento dell'indicatore", () => {
  it("toglie la «disattivazione» (defang) e riconosce il tipo", () => {
    expect(refang("hxxps://evil[.]example(dot)com")).toBe("https://evil.example.com");
    expect(classify("8.8.8.8")).toEqual({ kind: "ipv4", value: "8.8.8.8" });
    expect(classify("2001:db8::1")?.kind).toBe("ipv6");
    expect(classify("Poste-Verifica[.]IT")).toEqual({ kind: "domain", value: "poste-verifica.it" });
    expect(classify("hxxp://bad.example.com/login.php")).toMatchObject({ kind: "url", host: "bad.example.com" });
    expect(classify("d41d8cd98f00b204e9800998ecf8427e")?.kind).toBe("md5");
    expect(classify("a".repeat(64))?.kind).toBe("sha256");
    expect(classify("non è un indicatore")).toBeNull();
    expect(classify("999.1.1.1")).toBeNull();
  });

  it("calcola il dominio registrabile", () => {
    expect(registrable("a.b.poste.it")).toBe("poste.it");
    expect(registrable("login.example.co.uk")).toBe("example.co.uk");
  });

  it("riconosce le imitazioni di marchi italiani senza segnalare i siti ufficiali", () => {
    expect(lookalike("poste-verifica-account.com")).toBe("poste");
    expect(lookalike("intesasanpa0lo.com")).toBe("intesasanpaolo");
    expect(lookalike("intesasanpaoIo.it")).toBe("intesasanpaolo");
    expect(lookalike("poste.it", ["poste.it"])).toBeNull();
    expect(lookalike("example.com")).toBeNull();
    expect(lookalike("poste.it.verifica-conto.com")).toBe("poste");
    expect(lookalike("www.intesasanpaolo.com")).toBeNull();
  });
});

describe("OSINT: lettura delle fonti", () => {
  it("RDAP: date, registrar, name server; rete per gli IP", () => {
    const r = parseRdap({
      events: [{ eventAction: "registration", eventDate: "2026-11-20T00:00:00Z" }, { eventAction: "expiration", eventDate: "2027-11-20T00:00:00Z" }],
      entities: [{ roles: ["registrar"], vcardArray: ["vcard", [["version", {}, "text", "4.0"], ["fn", {}, "text", "Registrar SpA"]]] }],
      nameservers: [{ ldhName: "NS1.EXAMPLE.NET" }],
    });
    expect(r).toMatchObject({ registered: "2026-11-20T00:00:00Z", registrar: "Registrar SpA", nameservers: ["ns1.example.net"] });
    expect(parseRdap({ name: "GOOGLE", cidr0_cidrs: [{ v4prefix: "8.8.8.0", length: 24 }], country: "US" })).toMatchObject({ network: "GOOGLE", cidr: "8.8.8.0/24", country: "US" });
  });

  it("RDAP: mai nomi di persone, solo organizzazioni dichiarate", () => {
    const person = { roles: ["administrative"], vcardArray: ["vcard", [["fn", {}, "text", "Mario Rossi"], ["kind", {}, "text", "individual"]]] as [string, [string, unknown, string, unknown][]] };
    const org = { roles: ["registrant"], vcardArray: ["vcard", [["fn", {}, "text", "Google LLC"], ["kind", {}, "text", "org"]]] as [string, [string, unknown, string, unknown][]] };
    expect(parseRdap({ entities: [person] }).org).toBeUndefined();
    expect(parseRdap({ entities: [person, org] }).org).toBe("Google LLC");
  });

  it("crt.sh: sottodomini distinti, primo certificato, emittenti", () => {
    const c = parseCrtSh([
      { name_value: "*.example.com\nwww.example.com", not_before: "2026-01-10T00:00:00", issuer_name: 'C=US, O="Let\'s Encrypt", CN=R11' },
      { name_value: "mail.example.com", not_before: "2025-05-01T00:00:00", issuer_name: "C=US, O=Google Trust Services, CN=WR1" },
      { name_value: "example.com", not_before: "2026-06-01T00:00:00" },
    ], "example.com");
    expect(c.subdomains).toEqual(["mail.example.com", "www.example.com"]);
    expect(c.first).toBe("2025-05-01T00:00:00");
    expect(c.issuers).toEqual(["Let's Encrypt", "Google Trust Services"]);
  });
});

describe("OSINT: segnali e giudizio", () => {
  it("dominio nuovo che imita un marchio: sospetto, con i motivi", () => {
    const s = signals({ kind: "domain", rdap: { registered: "2026-11-20T00:00:00Z" }, lookalikeOf: "poste", now: NOW });
    expect(s.map((x) => x.level)).toEqual(["alto", "alto"]);
    expect(verdict(s)).toMatchObject({ label: "sospetto", admiralty: "C3" });
  });

  it("indicatore segnalato da ThreatFox: malevolo", () => {
    const s = signals({ kind: "ipv4", knownBad: [{ sources: ["ThreatFox"], malware: ["Cobalt Strike"], lastSeen: "2026-11-22T00:00:00Z", groups: ["a", "b"] }], now: NOW });
    expect(s[0].text).toContain("Cobalt Strike");
    expect(s[0].text).toContain("indizio, non attribuzione");
    expect(verdict(s).label).toBe("malevolo");
  });

  it("porte esposte e vulnerabilità KEV", () => {
    const s = signals({ kind: "ipv4", ports: [443, 3389], vulns: ["CVE-2023-4966", "CVE-2020-1"], kevVulns: ["CVE-2023-4966"], now: NOW });
    expect(s.map((x) => x.text).join(" ")).toContain("RDP (3389)");
    expect(s.some((x) => x.text.includes("CVE-2023-4966") && x.level === "alto")).toBe(true);
  });

  it("dominio che non risolve: lo dice, senza renderlo sospetto da solo", () => {
    const s = signals({ kind: "domain", unresolved: true, now: NOW });
    expect(s).toEqual([{ level: "info", source: "DNS (Cloudflare)", text: expect.stringContaining("non risolve") }]);
    expect(verdict(s).label).toBe("nessuna evidenza");
  });

  it("nessun segnale non significa sicuro", () => {
    const v = verdict(signals({ kind: "domain", rdap: { registered: "2010-01-01T00:00:00Z" }, now: NOW }));
    expect(v.label).toBe("nessuna evidenza");
    expect(v.why).toContain("NON significa che sia sicuro");
  });

  it("pivot: nuove ricerche con la provenienza, senza ripetere l'indicatore", () => {
    const p = pivots({ kind: "domain", value: "example.com" }, { ips: ["1.2.3.4", "1.2.3.4"], subdomains: ["a.example.com"], nameservers: ["ns1.dns.net"], hostnames: ["example.com"] });
    expect(p).toEqual([
      { kind: "ipv4", value: "1.2.3.4", via: "record DNS" },
      { kind: "domain", value: "a.example.com", via: "certificati (crt.sh)" },
      { kind: "domain", value: "ns1.dns.net", via: "name server (RDAP)" },
    ]);
  });
});

describe("OSINT: registro di ricerca", () => {
  const row = {
    id: "1", query: '=HYPERLINK("x")', kind: "domain", verdict: "sospetto", admiralty: "C3",
    signals: [{ level: "alto" as const, text: 'Imita «poste», con "virgolette"', source: "regola" }],
    sources: [{ name: "RDAP", url: "https://rdap.org/domain/x", ok: true, status: 200, ms: 10, fetched_at: "2026-11-24T14:50:10.000Z" }],
    result: {}, note: null, created_at: "2026-11-24T14:50:10.000Z",
  };

  it("CSV: una riga per indagine, protetto dalle formule di Excel e con le virgolette corrette", async () => {
    const { lookupsToCsv } = await import("@/lib/osint/export");
    const csv = lookupsToCsv([row]);
    const [head, line] = csv.trim().split("\n");
    expect(head.split(",")[0]).toBe("data_utc");
    expect(line).toContain(`"'=HYPERLINK(""x"")"`); // niente formula eseguibile
    expect(line).toContain('""virgolette""');
    expect(line).toContain(",1,0,1,1,"); // 1 segnale alto, 0 medi, 1 fonte ok su 1
  });

  it("CSV del triage: colonna del gruppo per ogni indicatore", async () => {
    const { lookupsToCsv } = await import("@/lib/osint/export");
    const csv = lookupsToCsv([row], new Map([[row.query, "A"]]));
    expect(csv.split("\n")[0].endsWith(",gruppo")).toBe(true);
    expect(csv.split("\n")[1].endsWith(",A")).toBe(true);
  });

  it("citazioni: fonte, URL e ora esatta di consultazione", async () => {
    const { citations } = await import("@/lib/osint/export");
    expect(citations(row)[0]).toBe("RDAP. https://rdap.org/domain/x (consultato il 2026-11-24 14:50:10 UTC; esito: HTTP 200).");
  });
});
