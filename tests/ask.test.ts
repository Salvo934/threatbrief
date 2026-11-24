import { describe, expect, it } from "vitest";
import { badCitations, citedSources, clampDays, cleanTerm, unknownNumbers } from "@/supabase/functions/ask/guard";

const sources = [
  { n: 1, tool: "claims_stats", title: "Rivendicazioni in Italia", link: "/minacce" },
  { n: 2, tool: "kev_search", title: "Catalogo KEV", link: "https://www.cisa.gov" },
];

describe("Chiedi a ThreatBrief: controlli", () => {
  it("i numeri devono venire dai dati degli strumenti o dalla domanda; le citazioni non contano", () => {
    const outputs = ['{"totale":42,"gruppi":[{"nome":"akira","n":7}]}'];
    expect(unknownNumbers("Negli ultimi 30 giorni 42 rivendicazioni, 7 di Akira [1].", outputs, "ultimi 30 giorni")).toEqual([]);
    expect(unknownNumbers("Le rivendicazioni sono 50 [1].", outputs, "")).toEqual(["50"]);
  });

  it("le citazioni devono rimandare a fonti consultate", () => {
    expect(badCitations("Dato [1] e altro [3].", sources)).toEqual([3]);
    expect(citedSources("Solo [2].", sources).map((s) => s.n)).toEqual([2]);
  });

  it("ripulisce i filtri e limita i giorni", () => {
    expect(cleanTerm("fortinet%,(drop)")).toBe("fortinet drop");
    expect(clampDays("90")).toBe(90);
    expect(clampDays(10_000)).toBe(365);
    expect(clampDays("abc")).toBe(30);
  });
});
