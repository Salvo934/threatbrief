import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { conditionErrors, toYaml, validateRule, type SigmaRaw } from "@/supabase/functions/sigma/rules";

const ctx = { techniques: new Set(["T1059.001", "T1566.001"]), iocs: new Set(["185.225.17.10"]) };
const good: SigmaRaw = {
  technique: "t1059.001",
  title: "PowerShell con comando codificato",
  description: "Rileva PowerShell avviato con un comando codificato in Base64, tipico dei loader.",
  logsource: { product: "windows", category: "process_creation" },
  selections: [
    { name: "selection_img", fields: [{ field: "Image", modifier: "endswith", values: ["\\powershell.exe", "\\pwsh.exe"] }] },
    { name: "selection_cli", fields: [{ field: "CommandLine", modifier: "contains", values: [" -enc ", " -EncodedCommand "] }] },
    { name: "filter_admin", fields: [{ field: "User", values: ["SYSTEM"] }] },
  ],
  condition: "all of selection_* and not filter_admin",
  falsepositives: ["Script di amministrazione legittimi"],
  level: "medium",
};

describe("Sigma: validazione", () => {
  it("accetta una regola corretta e normalizza la tecnica", () => {
    const { rule, errors } = validateRule(good, ctx);
    expect(errors).toEqual([]);
    expect(rule?.technique).toBe("T1059.001");
  });

  it("rifiuta tecniche fuori dal report, livelli e categorie inventati", () => {
    const { errors } = validateRule({ ...good, technique: "T1003", level: "severe", logsource: { product: "windows", category: "proc" } }, ctx);
    expect(errors.join(" ")).toMatch(/T1003 non è tra quelle del report/);
    expect(errors.join(" ")).toMatch(/livello non valido/);
    expect(errors.join(" ")).toMatch(/categoria non riconosciuta/);
  });

  it("rifiuta IP e hash che non sono indicatori del report", () => {
    const bad = { ...good, selections: [{ name: "selection", fields: [{ field: "DestinationIp", values: ["185.225.17.10", "45.9.148.6"] }] }], condition: "selection" };
    expect(validateRule(bad, ctx).errors).toEqual(["l'indicatore 45.9.148.6 non è tra quelli del report"]);
  });

  it("ammette indirizzi non instradabili (loopback, privati) che non sono indicatori", () => {
    const loop = { ...good, selections: [{ name: "selection", fields: [{ field: "CommandLine", modifier: "contains", values: ["http://127.0.0.1:", "10.0.0.5"] }] }], condition: "selection" };
    expect(validateRule(loop, ctx).errors).toEqual([]);
  });

  it("rifiuta lo stesso campo ripetuto in una selezione (chiave YAML duplicata)", () => {
    const dup = { ...good, selections: [{ name: "selection", fields: [
      { field: "CommandLine", modifier: "contains", values: ["urlcache"] },
      { field: "CommandLine", modifier: "contains", values: ["http"] },
    ] }], condition: "selection" };
    expect(validateRule(dup, ctx).errors).toEqual(["la selezione «selection» ripete lo stesso campo: usa selezioni separate"]);
  });

  it("controlla che la condizione citi solo selezioni esistenti", () => {
    expect(conditionErrors("selection and not filter", ["selection", "filter"])).toEqual([]);
    expect(conditionErrors("1 of selection_* or (other", ["selection_a"])).toEqual(["la condizione cita «other», che non è una selezione", "parentesi non bilanciate"]);
    expect(conditionErrors("selection | count() > 5", ["selection"])).toContain("simbolo non ammesso nella condizione: «|»");
  });
});

describe("Sigma: YAML", () => {
  it("produce YAML valido con i campi richiesti e i valori intatti", () => {
    const { rule } = validateRule(good, ctx);
    const doc = parse(toYaml(rule!, { id: "8d7a2c1e-0000-4000-8000-000000000001", date: "2026-11-24", reference: "https://example.org/report/x" }));
    expect(doc).toMatchObject({ status: "experimental", level: "medium", tags: ["attack.t1059.001"], logsource: { product: "windows", category: "process_creation" } });
    expect(doc.detection["Image|endswith"]).toBeUndefined();
    expect(doc.detection.selection_img["Image|endswith"]).toEqual(["\\powershell.exe", "\\pwsh.exe"]);
    expect(doc.detection.condition).toBe("all of selection_* and not filter_admin");
  });

  it("le virgolette nei valori non rompono il file", () => {
    const { rule } = validateRule({ ...good, title: "Regola con l'apostrofo: test", condition: "selection_img" }, ctx);
    expect(parse(toYaml(rule!, { id: "x", date: "2026-11-24", reference: "r" })).title).toBe("Regola con l'apostrofo: test");
  });
});
