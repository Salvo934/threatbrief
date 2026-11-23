import { getCollectionObjects } from "@/lib/data/taxii";
import { applyFilters, COLLECTION_ID, envelope, paginate, parseFilters, taxiiError } from "@/lib/taxii/core";
import { checkAccept, notFound, origin, taxiiJson } from "@/lib/taxii/http";

/** TAXII 2.1 — Get An Object (di default l'ultima versione). */
export async function GET(request: Request, ctx: RouteContext<"/taxii2/api/collections/[id]/objects/[objectId]">) {
  const bad = checkAccept(request);
  if (bad) return bad;
  const { id, objectId } = await ctx.params;
  if (id !== COLLECTION_ID) return notFound("Collezione");
  const f = parseFilters(new URL(request.url).searchParams);
  if ("error" in f) return taxiiJson(taxiiError(400, "Parametro non valido", f.error), 400);
  const items = applyFilters(await getCollectionObjects(origin(request)), { ...f, ids: [decodeURIComponent(objectId)] });
  if (!items.length) return notFound("Oggetto");
  return taxiiJson(envelope(paginate(items, f)));
}
