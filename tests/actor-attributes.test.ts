import { describe, expect, it } from "vitest";
import { deriveActorAttributes } from "../ingest/enrich/actor-attributes";
import { cleanAttackText } from "../lib/attack/text";

const values = (desc: string, attr: string) =>
  deriveActorAttributes(desc)
    .filter((a) => a.attribute === attr)
    .map((a) => a.value)
    .sort();

describe("cleanAttackText", () => {
  it("rimuove citazioni e link markdown", () => {
    expect(
      cleanAttackText("[APT38](https://attack.mitre.org/groups/G0082) targets banks.(Citation: FireEye APT38 Oct 2018)"),
    ).toBe("APT38 targets banks.");
  });
});

describe("deriveActorAttributes", () => {
  it("riconosce settori e motivazione", () => {
    const d = "APT38 is a financially motivated group that has targeted banks and financial institutions.";
    expect(values(d, "settore")).toEqual(["finanza"]);
    expect(values(d, "motivazione")).toEqual(["finanziaria"]);
  });

  it("non confonde 'financially motivated' con il settore finanza", () => {
    expect(values("FIN7 is a financially motivated threat group.", "settore")).toEqual([]);
  });

  it("non tratta il governo dell'attore come vittima", () => {
    const d = "APT41 is a threat group that conducts operations on behalf of the Chinese government.";
    expect(values(d, "settore")).toEqual([]);
  });

  it("riconosce la PA come vittima", () => {
    expect(values("The group has targeted government entities in Europe.", "settore")).toEqual(["pa"]);
  });

  it("estrae i paesi colpiti ma non quello di origine", () => {
    const d =
      "Sandworm Team is a Russia-based group attributed to Russia's GRU. It has targeted Ukraine, Italy and the U.S.";
    expect(values(d, "paese")).toEqual(["IT", "UA", "US"]);
  });

  it("non confonde la DPRK con la Corea del Sud né i codici storici con quelli attuali", () => {
    const d = "Kimsuky is a Democratic People's Republic of Korea (DPRK)-based group targeting Vietnam and Germany.";
    expect(values(d, "paese")).toEqual(["DE", "VN"]);
  });

  it("scarta arresti e 'fuori da'", () => {
    expect(values("A leader was arrested in Spain.", "paese")).toEqual([]);
    expect(values("It targeted companies outside of Israel, including in Italy.", "paese")).toEqual(["IT"]);
  });

  it("'nuclear policy' non è il settore energia", () => {
    expect(values("It focused on nuclear policy and sanctions.", "settore")).toEqual([]);
    expect(values("It targeted nuclear power plants.", "settore")).toEqual(["energia"]);
  });

  it("conta gli aggettivi solo dopo un verbo di attacco", () => {
    const d =
      "Sandworm Team is attributed to the Russian GRU. It conducted the 2015 attacks against Ukrainian electrical companies.";
    expect(values(d, "paese")).toEqual(["UA"]);
    expect(values(d, "settore")).toEqual(["energia"]);
    expect(values("The group has targeted Japanese, Taiwanese and South Korean firms.", "paese")).toEqual(["JP", "KR", "TW"]);
    expect(values("Attacks against Ukrainian targets by the Russian GRU.", "paese")).toEqual(["UA"]);
  });

  it("non conta Guinea dentro Papua New Guinea", () => {
    expect(values("Victims were in Papua New Guinea.", "paese")).toEqual(["PG"]);
  });

  it("riporta la frase di evidenza", () => {
    const [a] = deriveActorAttributes("Some intro. The group targeted hospitals in Italy.").filter(
      (x) => x.attribute === "settore",
    );
    expect(a.evidence).toBe("The group targeted hospitals in Italy.");
  });
});
