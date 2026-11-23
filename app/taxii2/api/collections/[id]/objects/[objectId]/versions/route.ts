import { getCollectionObjects } from "@/lib/data/taxii";
import { applyFilters, COLLECTION_ID, paginate, parseFilters, taxiiError } from "@/lib/taxii/core";
import { checkAccept, notFound, origin, taxiiJson } from "@/lib/taxii/http";

/** TAXII 2.1 — Get Object Versions. */
export async function GET(request: Request, ctx: RouteContext<"/taxii2/api/collections/[id]/objects/[objectId]/versions">) {
  const bad = checkAccept(request);
  if (bad) return bad;
  const { id, objectId } = await ctx.params;
  if (id !== COLLECTION_ID) return notFound("Collezione");
  const f = parseFilters(new URL(request.url).searchParams);
  if ("error" in f) return taxiiJson(taxiiError(400, "Parametro non valido", f.error), 400);
  const items = applyFilters(await getCollectionObjects(origin(request)), { ...f, ids: [decodeURIComponent(objectId)], versions: ["all"] });
  if (!items.length) return notFound("Oggetto");
  const p = paginate(items, f);
  return taxiiJson({ more: p.more, ...(p.next ? { next: p.next } : {}), versions: p.page.map((i) => i.version) });
}
