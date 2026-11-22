import { loadReport } from "@/lib/data/reports";
import { buildStixBundle } from "@/lib/report/stix";
import { sessionDb } from "@/lib/supabase/server";

/** STIX 2.1 di un report visibile all'utente (bozze comprese per il proprietario, via RLS). */
export async function GET(request: Request, ctx: RouteContext<"/report/[id]/stix">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return new Response("Not found", { status: 404 });
  const full = await loadReport(await sessionDb(), { id });
  if (!full) return new Response("Not found", { status: 404 });
  return new Response(JSON.stringify(buildStixBundle(full, new URL(request.url).origin), null, 2), {
    headers: {
      "content-type": "application/stix+json;version=2.1; charset=utf-8",
      "content-disposition": `attachment; filename="${full.report.slug}.stix.json"`,
      "cache-control": "private, no-store",
    },
  });
}
