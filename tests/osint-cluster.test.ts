import { describe, expect, it } from "vitest";
import { clusterLookups, extractIndicators, features } from "@/lib/osint/cluster";
import type { OsintLookup } from "@/lib/osint/export";

const L = (query: string, result: Record<string, unknown>): OsintLookup => ({
  id: query, query, kind: "domain", verdict: "sospetto", admiralty: "C3", signals: [], sources: [], result, note: null, created_at: "2026-11-24T00:00:00Z",
});

describe("Triage: estrazione degli indicatori", () => {
  it("trova indicatori in testo libero, anche defanged, senza duplicati", () => {
    const text = "Bloccare: hxxps://inps-rimborso[.]com/login, 45.9.148.10 e 45.9.148.10; hash d41d8cd98f00b204e9800998ecf8427e. Grazie!";
    expect(extractIndicators(text).map((i) => `${i.kind}:${i.value}`)).toEqual([
      "url:https://inps-rimborso.com/login",
      "ipv4:45.9.148.10",
      "md5:d41d8cd98f00b204e9800998ecf8427e",
    ]);
  });

  it("si ferma al massimo consentito", () => {
    const many = Array.from({ length: 80 }, (_, i) => `10.0.0.${i}`).join("\n");
    expect(extractIndicators(many)).toHaveLength(50);
  });
});

describe("Triage: raggruppamento in campagne", () => {
  it("lega gli indicatori che condividono IP o marchio, in modo transitivo, e spiega perché", () => {
    const lookups = [
      L("inps-a.com", { dns: { A: ["45.9.148.10"] }, lookalikeOf: "inps" }),
      L("inps-b.com", { dns: { A: ["45.9.148.10"] }, lookalikeOf: "inps" }),
      L("inps-c.net", { dns: { A: ["91.1.1.1"] }, lookalikeOf: "inps" }),
      L("other.org", { dns: { A: ["8.8.4.4"] } }),
    ];
    const c = clusterLookups(lookups);
    expect(c).toHaveLength(1);
    expect(c[0].id).toBe("A");
    expect(c[0].members).toEqual(["inps-a.com", "inps-b.com", "inps-c.net"]);
    expect(c[0].reasons[0]).toBe("imitano il marchio «inps»: 3 indicatori");
    expect(c[0].reasons).toContain("stesso IP 45.9.148.10: 2 indicatori");
  });

  it("non lega domini solo perché usano Cloudflare o un CDN", () => {
    const cf = { rdap: { nameservers: ["ada.ns.cloudflare.com", "bob.ns.cloudflare.com"] } };
    const cdn = { dns: { A: ["104.16.1.1"] }, hosting: { tags: ["cdn"] } };
    expect(clusterLookups([L("a.com", cf), L("b.com", cf)])).toEqual([]);
    expect(clusterLookups([L("a.com", cdn), L("b.com", cdn)])).toEqual([]);
    expect(features(L("x.com", { rdap: { nameservers: ["ns1.evil-host.ru", "ns2.evil-host.ru"] } })).size).toBe(1);
  });

  it("registrar e giorno di registrazione uguali legano due domini", () => {
    const r = { rdap: { registrar: "Registrar X", registered: "2026-11-20T10:00:00Z" } };
    expect(clusterLookups([L("a.com", r), L("b.com", r)])[0].reasons[0]).toMatch(/registrati lo stesso giorno \(2026-11-20\)/);
  });
});
