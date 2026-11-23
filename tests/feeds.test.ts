import { describe, expect, it } from "vitest";
import { abuseDate } from "../ingest/lib/iocs";
import { parseCsirtRss } from "../ingest/sources/csirt";
import { parseOtxPulses, type OtxPulse } from "../ingest/sources/otx";
import { parseThreatFox } from "../ingest/sources/threatfox";
import { parseUrlhaus } from "../ingest/sources/urlhaus";

describe("abuseDate", () => {
  it("converte il formato abuse.ch in ISO", () => {
    expect(abuseDate("2026-11-20 13:36:27 UTC")).toBe("2026-11-20T13:36:27.000Z");
    expect(abuseDate(null)).toBeNull();
  });
});

describe("parseThreatFox", () => {
  it("mappa i tipi, toglie la porta e scarta 'Unknown malware'", () => {
    const items = parseThreatFox([
      { id: "1", ioc: "45.9.148.2:443", ioc_type: "ip:port", malware_printable: "Cobalt Strike", threat_type: "botnet_cc", confidence_level: 75, first_seen: "2026-11-20 10:00:00 UTC", last_seen: null, tags: ["c2"] },
      { id: "2", ioc: "Evil.COM", ioc_type: "domain", malware_printable: "Unknown malware", first_seen: "2026-11-20 10:00:00 UTC" },
      { id: "3", ioc: "abc", ioc_type: "sha3_384_hash", first_seen: "2026-11-20 10:00:00 UTC" },
    ]);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ type: "ipv4", value: "45.9.148.2", malware: "Cobalt Strike", source_ref: "1", last_seen: "2026-11-20T10:00:00.000Z" });
    expect(items[1]).toMatchObject({ type: "domain", value: "evil.com", malware: null });
  });
});

describe("parseUrlhaus", () => {
  it("normalizza gli URL e conserva lo stato come tag", () => {
    const [i] = parseUrlhaus([{ id: 9, url: "http://1.2.3.4:8080/Mozi.m", url_status: "online", date_added: "2026-11-21 08:00:00 UTC", threat: "malware_download", tags: ["Mozi"] }]);
    expect(i).toMatchObject({ type: "url", value: "http://1.2.3.4:8080/Mozi.m", tags: ["Mozi", "status:online"], source_ref: "9" });
  });
});

describe("parseOtxPulses", () => {
  const pulse = (tlp: string, extra: Partial<OtxPulse> = {}): OtxPulse => ({
    id: `p-${tlp}`, name: `Pulse ${tlp}`, created: "2026-11-20T10:00:00", modified: "2026-11-21T10:00:00", tlp,
    adversary: "Fancy Bear", attack_ids: ["T1566", { id: "T1059.001" }, "bad"],
    indicators: [
      { indicator: "evil.example", type: "hostname" },
      { indicator: "CVE-2024-3400", type: "CVE" },
      { indicator: "C:\\x.exe", type: "FilePath" },
    ],
    ...extra,
  });

  it("importa solo pulse TLP:CLEAR/WHITE", () => {
    const r = parseOtxPulses([pulse("white"), pulse("green"), pulse("amber")]);
    expect(r.intel.map((i) => i.external_id)).toEqual(["p-white"]);
    expect(r.skippedNotClear).toBe(2);
  });

  it("estrae attack_ids, CVE e indicatori supportati, con data in UTC", () => {
    const r = parseOtxPulses([pulse("white")]);
    expect(r.intel[0]).toMatchObject({ adversary: "Fancy Bear", attack_ids: ["T1566", "T1059.001"], cves: ["CVE-2024-3400"], published_at: "2026-11-21T10:00:00.000Z" });
    expect(r.items.map((i) => `${i.type}:${i.value}`)).toEqual(["domain:evil.example", "cve:CVE-2024-3400"]);
    expect(r.items[0].intel_external_id).toBe("p-white");
  });
});

describe("parseCsirtRss", () => {
  it("legge titolo, link, data e CVE citate", () => {
    const xml = `<?xml version="1.0"?><rss xmlns:dc="http://purl.org/dc/elements/1.1/" version="2.0"><channel>
      <item><title>Risolte vulnerabilità in PHP</title><link>https://www.acn.gov.it/portale/w/php</link>
      <description>Tra queste la CVE-2026-115560 e cve-2026-1111.</description>
      <pubDate>Thu, 19 Nov 2026 16:25:42 GMT</pubDate><guid isPermaLink="false">https://www.acn.gov.it/portale/w/php</guid>
      <dc:date>2026-11-19T16:25:42Z</dc:date></item></channel></rss>`;
    const [i] = parseCsirtRss(xml);
    expect(i).toMatchObject({
      external_id: "https://www.acn.gov.it/portale/w/php",
      title: "Risolte vulnerabilità in PHP",
      published_at: "2026-11-19T16:25:42.000Z",
      cves: ["CVE-2026-115560", "CVE-2026-1111"],
    });
  });
});

describe("salvageJsonArray", () => {
  it("recupera solo gli oggetti completi da un JSON troncato", async () => {
    const { salvageJsonArray } = await import("../ingest/lib/salvage");
    const text = '{"query_status":"ok","data":[{"id":"1","tags":["a}"]},{"id":"2","x":{"y":1}},{"id":"3","ioc":"htt';
    expect(salvageJsonArray<{ id: string }>(text, "data")?.map((r) => r.id)).toEqual(["1", "2"]);
    expect(salvageJsonArray(text, "missing")).toBeNull();
  });
});

describe("parseD3fend", async () => {
  const { parseD3fend } = await import("../ingest/sources/d3fend");
  it("estrae contromisure uniche e scarta righe incomplete o tattiche sconosciute", () => {
    const b = (id: string, label: string, tactic: string, iri: string) => ({
      def_tech_id: { value: id }, def_tech_label: { value: label }, def_tactic_label: { value: tactic },
      def_tech: { value: `http://d3fend.mitre.org/ontologies/d3fend.owl#${iri}` },
    });
    const rows = parseD3fend("T1003.001", {
      off_to_def: { results: { bindings: [
        b("D3-PLA", "Process Lineage Analysis", "Detect", "ProcessLineageAnalysis"),
        b("D3-PLA", "Process Lineage Analysis", "Detect", "ProcessLineageAnalysis"),
        b("D3-XX", "Strano", "Boh", "Strano"),
        {},
      ] } },
    });
    expect(rows).toEqual([{ attack_external_id: "T1003.001", d3fend_id: "D3-PLA", label: "Process Lineage Analysis", tactic: "Detect", iri_name: "ProcessLineageAnalysis" }]);
    expect(parseD3fend("T1", null)).toEqual([]);
  });
});
