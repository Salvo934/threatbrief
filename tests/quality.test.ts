import { describe, expect, it } from "vitest";
import { compareClaim, compareFreshness, compareIoc, compareKev, compareQuote, extractQuotes, sample, summarize } from "@/lib/quality/rules";

const kev = { cve_id: "CVE-2025-66376", vendor_project: "Synacor", product: "Zimbra Collaboration Suite", date_added: "2026-07-21", known_ransomware_use: false };
const src = { cveID: "CVE-2025-66376", vendorProject: "Synacor", product: "Zimbra Collaboration Suite", dateAdded: "2026-07-21", knownRansomwareCampaignUse: "Unknown" };

describe("Controllo qualità", () => {
  it("KEV: coincide, oppure elenca cosa è diverso", () => {
    expect(compareKev(kev, src).ok).toBe(true);
    const bad = compareKev(kev, { ...src, dateAdded: "2026-07-22", knownRansomwareCampaignUse: "Known" });
    expect(bad.ok).toBe(false);
    expect(bad.detail).toContain("data 2026-07-22");
    expect(bad.detail).toContain("uso ransomware");
    expect(compareKev(kev, undefined).detail).toMatch(/Non più presente/);
  });

  it("rivendicazioni: stesso gruppo e stesso giorno", () => {
    const db = { victim: "Acme", group_name: "akira", discovered_at: "2026-11-20T10:00:00Z" };
    expect(compareClaim(db, { group_name: "Akira", discovered: "2026-11-20 18:00:00" }).ok).toBe(true);
    expect(compareClaim(db, { group_name: "qilin", discovered: "2026-11-20" }).detail).toContain("gruppo");
    expect(compareClaim(db, undefined).ok).toBe(false);
  });

  it("ThreatFox: presente e con la stessa famiglia", () => {
    expect(compareIoc({ value: "1.2.3.4:443", malware: "Cobalt Strike" }, [{ malware_printable: "Cobalt Strike" }]).ok).toBe(true);
    expect(compareIoc({ value: "1.2.3.4:443", malware: "Cobalt Strike" }, [{ malware_printable: "Sliver" }]).ok).toBe(false);
    expect(compareIoc({ value: "1.2.3.4:443", malware: null }, null).ok).toBe(false);
  });

  it("citazioni: estrae quelle tra «» e le cerca nella pagina", () => {
    const body = "Fatto — NSA: «the actors leverage a view-based exploit that triggers automatically» · breve: «ok»";
    expect(extractQuotes(body)).toEqual(["the actors leverage a view-based exploit that triggers automatically"]);
    const page = "Overview. The actors leverage a view-based exploit that triggers automatically when viewed.";
    expect(compareQuote("Bozza", extractQuotes(body)[0], "https://x", page).ok).toBe(true);
    expect(compareQuote("Bozza", "a sentence that is nowhere in the page text", "https://x", page).ok).toBe(false);
    expect(compareQuote("Bozza", "a sentence that is nowhere in the page text", "https://x", null).detail).toMatch(/non raggiungibile/);
  });

  it("freschezza: entro il tempo previsto per la fonte", () => {
    const now = Date.parse("2026-11-24T12:00:00Z");
    expect(compareFreshness("cisa_kev", "CISA KEV", "2026-11-24T06:00:00Z", now).ok).toBe(true);
    expect(compareFreshness("cisa_kev", "CISA KEV", "2026-11-22T06:00:00Z", now).ok).toBe(false);
    expect(compareFreshness("mitre_attack", "ATT&CK", "2026-11-20T06:00:00Z", now).ok).toBe(true);
  });

  it("campione senza ripetizioni e riepilogo per area", () => {
    const s = sample([1, 2, 3, 4, 5], 3, () => 0.5);
    expect(new Set(s).size).toBe(3);
    expect(summarize([
      { area: "kev", item: "a", ok: true, detail: "" },
      { area: "kev", item: "b", ok: false, detail: "" },
    ])).toEqual({ kev: { checked: 2, ok: 1 } });
  });
});
