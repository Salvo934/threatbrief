import { stableUuid } from "@/lib/report/stix";

/**
 * Logica del server TAXII 2.1 (OASIS), sola lettura: funzioni pure, testate.
 * Una collezione con gli oggetti STIX dei report pubblicati (TLP:CLEAR).
 */
export const TAXII_MEDIA = "application/taxii+json;version=2.1";
export const STIX_MEDIA = "application/stix+json;version=2.1";
export const COLLECTION_ID = stableUuid("taxii-collection|briefs");
export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 500;

export type StixObj = Record<string, unknown> & { id: string; type: string };
export type StoredObject = { obj: StixObj; dateAdded: string; version: string };

export const collectionInfo = () => ({
  id: COLLECTION_ID,
  title: "ThreatBrief — report pubblicati",
  description: "Oggetti STIX 2.1 dei report TLP:CLEAR pubblicati su ThreatBrief (sola lettura).",
  can_read: true,
  can_write: false,
  media_types: [STIX_MEDIA],
});

/** Versione di un oggetto: `modified`, oppure `created` per gli oggetti non versionati. */
export const versionOf = (o: StixObj) => String(o.modified ?? o.created ?? "1970-01-01T00:00:00.000Z");

/**
 * Unisce gli oggetti di più bundle: per ogni id tiene tutte le versioni distinte, con la
 * data di inserimento (date_added) del report che le ha introdotte per primo.
 */
export function mergeObjects(bundles: { objects: StixObj[]; dateAdded: string }[]): StoredObject[] {
  const byKey = new Map<string, StoredObject>();
  for (const b of bundles) {
    for (const obj of b.objects) {
      const version = versionOf(obj);
      const key = `${obj.id}|${version}`;
      const prev = byKey.get(key);
      if (!prev || b.dateAdded < prev.dateAdded) byKey.set(key, { obj, dateAdded: b.dateAdded, version });
    }
  }
  return [...byKey.values()].sort((a, b) => a.dateAdded.localeCompare(b.dateAdded) || a.obj.id.localeCompare(b.obj.id));
}

export type Filters = { addedAfter?: string; ids?: string[]; types?: string[]; versions?: string[]; limit?: number; next?: string };

/** Legge i parametri di filtro TAXII da una query string. Errore leggibile se non validi. */
export function parseFilters(params: URLSearchParams): Filters | { error: string } {
  const list = (k: string) => params.get(k)?.split(",").map((v) => v.trim()).filter(Boolean);
  const addedAfter = params.get("added_after") ?? undefined;
  if (addedAfter && Number.isNaN(Date.parse(addedAfter))) return { error: "added_after non è una data valida" };
  const limitRaw = params.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) return { error: "limit deve essere un intero positivo" };
  const next = params.get("next") ?? undefined;
  if (next && !/^\d+$/.test(next)) return { error: "next non valido" };
  return { addedAfter, ids: list("match[id]"), types: list("match[type]"), versions: list("match[version]"), limit, next };
}

/** Applica i filtri, compresa la regola di default «solo l'ultima versione» di TAXII 2.1. */
export function applyFilters(items: StoredObject[], f: Filters): StoredObject[] {
  let out = items;
  if (f.addedAfter) {
    const t = Date.parse(f.addedAfter);
    out = out.filter((i) => Date.parse(i.dateAdded) > t);
  }
  if (f.ids?.length) out = out.filter((i) => f.ids!.includes(i.obj.id));
  if (f.types?.length) out = out.filter((i) => f.types!.includes(i.obj.type));
  const versions = f.versions?.length ? f.versions : ["last"];
  if (!versions.includes("all")) {
    const byId = new Map<string, StoredObject[]>();
    for (const i of out) byId.set(i.obj.id, [...(byId.get(i.obj.id) ?? []), i]);
    out = out.filter((i) => {
      const all = byId.get(i.obj.id)!.map((x) => x.version).sort();
      return versions.some((v) => (v === "last" ? i.version === all[all.length - 1] : v === "first" ? i.version === all[0] : i.version === v));
    });
  }
  return out;
}

/** Pagina i risultati; `next` è l'indice da cui ripartire. */
export function paginate(items: StoredObject[], f: Filters) {
  const limit = Math.min(f.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const start = f.next ? Number(f.next) : 0;
  const page = items.slice(start, start + limit);
  const more = start + limit < items.length;
  return {
    page,
    more,
    next: more ? String(start + limit) : undefined,
    first: page[0]?.dateAdded,
    last: page[page.length - 1]?.dateAdded,
  };
}

export const envelope = (p: ReturnType<typeof paginate>) => ({
  more: p.more,
  ...(p.next ? { next: p.next } : {}),
  objects: p.page.map((i) => i.obj),
});

export const manifest = (p: ReturnType<typeof paginate>) => ({
  more: p.more,
  ...(p.next ? { next: p.next } : {}),
  objects: p.page.map((i) => ({ id: i.obj.id, date_added: i.dateAdded, version: i.version, media_type: STIX_MEDIA })),
});

export const taxiiError = (http_status: number, title: string, description?: string) => ({
  title,
  ...(description ? { description } : {}),
  http_status: String(http_status),
});

/** TAXII 2.1 richiede Accept application/taxii+json;version=2.1; accettiamo anche varianti comuni. */
export function acceptable(accept: string | null): boolean {
  if (!accept) return true;
  return accept.split(",").some((part) => {
    const v = part.trim().toLowerCase();
    return v.startsWith("*/*") || v.startsWith("application/*") || v.startsWith("application/json") || (v.startsWith("application/taxii+json") && (!v.includes("version=") || v.includes("version=2.1")));
  });
}
