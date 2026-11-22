import { listPublished } from "@/lib/data/reports";
import { buildRss } from "@/lib/report/rss";
import { publicDb } from "@/lib/supabase/public";

export async function GET(request: Request) {
  const reports = await listPublished(publicDb(), 30);
  return new Response(buildRss(reports, new URL(request.url).origin), {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
