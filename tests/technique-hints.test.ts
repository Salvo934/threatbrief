import { describe, expect, it } from "vitest";
import { suggestSoftware, suggestTechniques } from "@/lib/attack/technique-hints";

const techniques = [
  { id: "a", external_id: "T1059.001", name: "PowerShell" },
  { id: "b", external_id: "T1566.001", name: "Spearphishing Attachment" },
  { id: "c", external_id: "T1090", name: "Proxy" },
  { id: "d", external_id: "T1486", name: "Data Encrypted for Impact" },
  { id: "e", external_id: "T1003.001", name: "LSASS Memory" },
];

describe("suggestTechniques", () => {
  it("riconosce ID, nomi e parole chiave, con evidenza", () => {
    const text =
      "Initial access via Spearphishing Attachment. The loader ran powershell -enc ... then dumped lsass with mimikatz (T1003.001). Files were encrypted files with .lock extension.";
    const hints = suggestTechniques(text, techniques);
    expect(hints.map((h) => `${h.technique.external_id}:${h.method}`)).toEqual([
      "T1003.001:id",
      "T1059.001:nome",
      "T1486:parola chiave",
      "T1566.001:nome",
    ]);
    expect(hints[0].evidence).toContain("T1003.001");
  });

  it("accorpa le tecniche con lo stesso nome", () => {
    const list = [...techniques, { id: "f", external_id: "T1598.002", name: "Spearphishing Attachment" }];
    const hints = suggestTechniques("via spearphishing attachment", list);
    expect(hints).toHaveLength(1);
    expect(hints[0]).toMatchObject({ technique: { external_id: "T1566.001" }, sameName: ["T1598.002"] });
  });

  it("ignora nomi generici e ID inesistenti", () => {
    expect(suggestTechniques("Traffic went through a proxy. See T9999.", techniques)).toEqual([]);
  });
});

describe("suggestSoftware", () => {
  it("trova nome o alias lunghi, non sigle corte", () => {
    const sw = [
      { id: "s1", external_id: "S0154", name: "Cobalt Strike", aliases: [] },
      { id: "s2", external_id: "S0039", name: "Net", aliases: ["net.exe"] },
      { id: "s3", external_id: "S0002", name: "Mimikatz", aliases: [] },
    ];
    expect(suggestSoftware("Beacon from cobalt strike and Mimikatz. The net command…", sw).map((s) => s.software.external_id)).toEqual([
      "S0154",
      "S0002",
    ]);
  });
});
