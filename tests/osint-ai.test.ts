import { describe, expect, it } from "vitest";
import { compactLookup, unknownNumbers, validateBatch, validateSummary } from "@/supabase/functions/osint-ai/guard";

const lookup = {
  query: "inps-rimborso.com", kind: "domain", verdict: "sospetto", admiralty: "C3",
  signals: [{ level: "alto", text: "Dominio registrato da 3 giorni: tipico delle campagne di phishing." }],
  result: {
    rdap: { registered: "2026-11-21T00:00:00Z", registrar: "Reg X", nameservers: ["ns1.bad.ru"] },
    dns: { A: ["45.9.148.10"] }, lookalikeOf: "inps",
    pivots: [{ value: "45.9.148.10", via: "record DNS" }, { value: "ns1.bad.ru", via: "name server (RDAP)" }],
  },
};

describe("OSINT + IA: controlli", () => {
  const data = compactLookup(lookup);

  it("passa all'IA solo i dati essenziali, con i collegamenti reali", () => {
    expect(data.indicatore).toBe("inps-rimborso.com");
    expect(data.collegamenti.map((c) => c.valore)).toEqual(["45.9.148.10", "ns1.bad.ru"]);
  });

  it("i numeri devono comparire nei dati (date e IP compresi)", () => {
    expect(unknownNumbers("Registrato 3 giorni fa, il 2026-11-21, su 45.9.148.10", data)).toEqual([]);
    expect(unknownNumbers("Ospita altri 40 domini", data)).toEqual(["40"]);
  });

  it("scarta una nota con numeri inventati", () => {
    const v = validateSummary({ summary: "Ospita altri 40 domini di phishing.", next_steps: [] }, data);
    expect(v.ok).toBe(false);
  });

  it("tiene solo i prossimi passi che puntano a collegamenti esistenti", () => {
    const v = validateSummary({
      summary: "Dominio registrato 3 giorni fa che imita INPS: compatibile con una campagna di phishing.",
      next_steps: [{ pivot: "45.9.148.10", why: "IP condiviso" }, { pivot: "evil.example", why: "inventato" }],
    }, data);
    expect(v.ok && v.next_steps.map((s) => s.pivot)).toEqual(["45.9.148.10"]);
    expect(v.ok && v.rejected).toBe(1);
  });

  it("triage: descrive solo i gruppi calcolati dal codice", () => {
    const groups = [{ id: "A", motivi: ["imitano il marchio «inps»: 3 indicatori"] }];
    const v = validateBatch({ clusters: [
      { id: "A", title: "Phishing INPS", description: "3 domini che imitano INPS.", action: "Bloccare i domini." },
      { id: "Z", title: "Inventato", description: "x", action: "y" },
      { id: "A", title: "Con numeri falsi", description: "12 domini", action: "z" },
    ] }, groups, new Set(["A"]));
    expect(v.clusters.map((c) => c.title)).toEqual(["Phishing INPS"]);
    expect(v.rejected).toBe(2);
  });
});
