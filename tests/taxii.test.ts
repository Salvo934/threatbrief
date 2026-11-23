import { describe, expect, it } from "vitest";
import { acceptable, applyFilters, COLLECTION_ID, envelope, manifest, mergeObjects, paginate, parseFilters } from "@/lib/taxii/core";

const o = (id: string, type: string, modified: string) => ({ id, type, modified, created: "2026-01-01T00:00:00.000Z" });

describe("TAXII 2.1", () => {
  const items = mergeObjects([
    { dateAdded: "2026-11-20T10:00:00.000Z", objects: [o("report--a", "report", "2026-11-20T10:00:00.000Z"), o("identity--x", "identity", "2026-11-22T00:00:00.000Z")] },
    { dateAdded: "2026-11-22T10:00:00.000Z", objects: [o("report--a", "report", "2026-11-22T09:00:00.000Z"), o("identity--x", "identity", "2026-11-22T00:00:00.000Z"), o("indicator--i", "indicator", "2026-11-22T09:00:00.000Z")] },
  ]);

  it("unisce i bundle tenendo le versioni distinte e la prima data di inserimento", () => {
    expect(items).toHaveLength(4);
    expect(items.find((i) => i.obj.id === "identity--x")?.dateAdded).toBe("2026-11-20T10:00:00.000Z");
  });

  it("di default restituisce solo l'ultima versione; match[version]=all le restituisce tutte", () => {
    const last = applyFilters(items, {});
    expect(last.filter((i) => i.obj.id === "report--a").map((i) => i.version)).toEqual(["2026-11-22T09:00:00.000Z"]);
    expect(applyFilters(items, { versions: ["all"] }).filter((i) => i.obj.id === "report--a")).toHaveLength(2);
  });

  it("filtra per added_after, tipo e id", () => {
    expect(applyFilters(items, { addedAfter: "2026-11-21T00:00:00Z" }).map((i) => i.obj.id).sort()).toEqual(["indicator--i", "report--a"]);
    expect(applyFilters(items, { types: ["indicator"] }).map((i) => i.obj.id)).toEqual(["indicator--i"]);
    expect(applyFilters(items, { ids: ["identity--x"] })).toHaveLength(1);
  });

  it("pagina con more/next e produce envelope e manifest", () => {
    const all = applyFilters(items, {});
    const p1 = paginate(all, { limit: 2 });
    expect(envelope(p1)).toMatchObject({ more: true, next: "2" });
    expect(envelope(p1).objects).toHaveLength(2);
    const p2 = paginate(all, { limit: 2, next: "2" });
    expect(envelope(p2).more).toBe(false);
    expect(manifest(p2).objects[0]).toMatchObject({ media_type: "application/stix+json;version=2.1" });
  });

  it("valida i parametri e l'header Accept", () => {
    expect(parseFilters(new URLSearchParams("added_after=ieri"))).toEqual({ error: "added_after non è una data valida" });
    expect(parseFilters(new URLSearchParams("limit=0"))).toEqual({ error: "limit deve essere un intero positivo" });
    expect(parseFilters(new URLSearchParams("match[type]=indicator,report"))).toMatchObject({ types: ["indicator", "report"] });
    expect(acceptable("application/taxii+json;version=2.1")).toBe(true);
    expect(acceptable("application/taxii+json;version=2.0")).toBe(false);
    expect(acceptable("text/html")).toBe(false);
    expect(COLLECTION_ID).toMatch(/^[0-9a-f-]{36}$/);
  });
});
