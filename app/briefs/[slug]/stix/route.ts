import { loadReport } from "@/lib/data/reports";
import { buildStixBundle } from "@/lib/report/stix";
import { publicDb } from "@/lib/supabase/public";

/** Bundle STIX 2.1 di un report pubblicato (TLP:CLEAR). */
export async function GET(request: Request, ctx: RouteContext<"/briefs/[slug]/stix">) {
  const { slug } = await ctx.params;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return new Response("Not found", { status: 404 });
  const full = await loadReport(publicDb(), { slug });
  if (!full) return new Response("Not found", { status: 404 });
  const bundle = buildStixBundle(full, new URL(request.url).origin);
  return new Response(JSON.stringify(bundle, null, 2), {
    headers: {
      "content-type": "application/stix+json;version=2.1; charset=utf-8",
      "content-disposition": `attachment; filename="${slug}.stix.json"`,
    },
  });
}
