import { getCollectionObjects } from "@/lib/data/taxii";
import { applyFilters, COLLECTION_ID, envelope, paginate, parseFilters, taxiiError } from "@/lib/taxii/core";
import { checkAccept, notFound, origin, taxiiJson } from "@/lib/taxii/http";

/** TAXII 2.1 — Get Objects (filtri added_after, match[id|type|version], limit, next). */
export async function GET(request: Request, ctx: RouteContext<"/taxii2/api/collections/[id]/objects">) {
  const bad = checkAccept(request);
  if (bad) return bad;
  if ((await ctx.params).id !== COLLECTION_ID) return notFound("Collezione");
  const f = parseFilters(new URL(request.url).searchParams);
  if ("error" in f) return taxiiJson(taxiiError(400, "Parametro non valido", f.error), 400);
  const p = paginate(applyFilters(await getCollectionObjects(origin(request)), f), f);
  return taxiiJson(envelope(p), 200, p.first ? { "X-TAXII-Date-Added-First": p.first, "X-TAXII-Date-Added-Last": p.last! } : {});
}
