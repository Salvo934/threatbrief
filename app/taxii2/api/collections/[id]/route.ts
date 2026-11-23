import { COLLECTION_ID, collectionInfo } from "@/lib/taxii/core";
import { checkAccept, notFound, taxiiJson } from "@/lib/taxii/http";

/** TAXII 2.1 — Get A Collection. */
export async function GET(request: Request, ctx: RouteContext<"/taxii2/api/collections/[id]">) {
  const bad = checkAccept(request);
  if (bad) return bad;
  return (await ctx.params).id === COLLECTION_ID ? taxiiJson(collectionInfo()) : notFound("Collezione");
}
