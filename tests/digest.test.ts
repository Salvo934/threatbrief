import { describe, expect, it } from "vitest";
import { csirtItems, digestWindow, iocItem, kevItems, ransomwareItems, sourceItems } from "@/lib/digest/rules";

describe("bozza del digest: regole", () => {
  it("KEV con uso ransomware noto → suggerimento «azione», altrimenti «monitorare»", () => {
    const items = kevItems([
      { cve_id: "CVE-2026-0001", vendor_project: "Acme", product: "VPN", vulnerability_name: "Auth bypass", date_added: "2026-11-22", due_date: "2026-12-13", known_ransomware_use: true },
      { cve_id: "CVE-2026-0002", vendor_project: "Acme", product: "Mail", vulnerability_name: "RCE", date_added: "2026-11-22", due_date: null, known_ransomware_use: false },
    ]);
    expect(items.map((i) => [i.key, i.suggested])).toEqual([["kev:CVE-2026-0001", "azione"], ["kev:CVE-2026-0002", "monitorare"]]);
    expect(items[0].facts).toContain("Uso in campagne ransomware: noto");
  });

  it("alert CSIRT che cita una CVE nel KEV → «azione»", () => {
    const rows = [
      { external_id: "a", title: "A", summary: "x", url: null, published_at: null, cves: ["CVE-2026-0001"] },
      { external_id: "b", title: "B", summary: null, url: null, published_at: null, cves: [] },
    ];
    expect(csirtItems(rows, new Set(["CVE-2026-0001"])).map((i) => i.suggested)).toEqual(["azione", "info"]);
  });

  it("rivendicazioni raggruppate per settore, «altri» in fondo, campagna segnalata dalle ripetizioni", () => {
    const v = (group_name: string, sector_id: string | null) => ({ victim: "Org", group_name, sector_id, sector_raw: null });
    const items = ransomwareItems([v("qilin", "sanita"), v("akira", null), v("qilin", "manifatturiero"), v("qilin", "manifatturiero"), v("qilin", "manifatturiero")], (id) => id);
    expect(items.map((i) => i.key)).toEqual(["ransomware:manifatturiero", "ransomware:sanita", "ransomware:altri"]);
    expect(items[0].reason).toContain("qilin ha 3 rivendicazioni");
    expect(items[0].facts).toContain("non verificate");
    expect(items[2].suggested).toBe("info");
  });

  it("IOC: una sola voce di sintesi; nessuna voce se non ci sono osservazioni", () => {
    expect(iocItem([], (s) => s)).toEqual([]);
    const [item] = iocItem([{ source_id: "threatfox", malware: "Mirai" }, { source_id: "threatfox", malware: "Mirai" }, { source_id: "urlhaus", malware: null }], (s) => s);
    expect(item.facts).toContain("threatfox 2, urlhaus 1");
    expect(item.facts).toContain("Mirai (2)");
  });

  it("fonti: conta solo l'ultima esecuzione di ogni fonte", () => {
    const items = sourceItems(
      [
        { source_id: "threatfox", status: "error", error: "x", started_at: "2026-11-22T00:00:00Z" },
        { source_id: "threatfox", status: "ok", error: null, started_at: "2026-11-22T06:00:00Z" },
        { source_id: "urlhaus", status: "partial", error: "troncata", started_at: "2026-11-22T06:00:00Z" },
      ],
      (s) => s,
    );
    expect(items.map((i) => i.key)).toEqual(["fonti:urlhaus"]);
  });

  it("finestra: dalla fine del digest precedente, ma mai più di 72 ore", () => {
    const now = new Date("2026-11-23T07:05:00Z");
    expect(digestWindow(now, "2026-11-22T07:05:00Z").start.toISOString()).toBe("2026-11-22T07:05:00.000Z");
    expect(digestWindow(now, "2026-11-01T00:00:00Z").start.toISOString()).toBe("2026-11-20T07:05:00.000Z");
    expect(digestWindow(now, null).start.toISOString()).toBe("2026-11-22T07:05:00.000Z");
    expect(digestWindow(now, null).date).toBe("2026-11-23");
  });
});

describe("testo finale del digest", async () => {
  const { composeDigest } = await import("@/lib/digest/compose");
  const item = (key: string, section: "kev" | "ioc", title: string) => ({
    key, section, title, facts: "", source: { name: "CISA KEV", url: "https://example.test" }, suggested: "info" as const, reason: "",
  });
  it("include solo gli elementi rivisti e non esclusi, in ordine di priorità", () => {
    const text = composeDigest(
      "2026-11-23",
      [item("a", "ioc", "IOC"), item("b", "kev", "CVE"), item("c", "kev", "Altro"), item("d", "kev", "Mai rivisto")],
      [
        { item_key: "a", priority: "info", relevance: null, action: null },
        { item_key: "b", priority: "azione", relevance: "Lo usiamo", action: "Patch oggi" },
        { item_key: "c", priority: "escludi", relevance: null, action: null },
      ],
    );
    expect(text.split("\n")[0]).toBe("DIGEST CTI — 23/11/2026 — TLP:AMBER");
    expect(text.indexOf("[AZIONE] CVE")).toBeLessThan(text.indexOf("[INFO] IOC"));
    expect(text).toContain("Cosa fare: nessuna azione, monitoriamo.");
    expect(text).not.toContain("Altro");
    expect(text).not.toContain("Mai rivisto");
    expect(text).toContain("(1 elemento escluso dopo la revisione.)");
  });
});
