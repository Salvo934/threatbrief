import "server-only";
import { listPublished, loadReport } from "@/lib/data/reports";
import { buildStixBundle } from "@/lib/report/stix";
import { publicDb } from "@/lib/supabase/public";
import { mergeObjects, type StixObj } from "@/lib/taxii/core";

/** Tutti gli oggetti STIX della collezione: i bundle dei report pubblicati (RLS: solo TLP:CLEAR). */
export async function getCollectionObjects(siteUrl: string) {
  const db = publicDb();
  const reports = await listPublished(db, 200);
  const bundles = await Promise.all(
    reports.map(async (r) => {
      const full = await loadReport(db, { slug: r.slug });
      if (!full || !r.published_at) return null;
      return { objects: buildStixBundle(full, siteUrl).objects as StixObj[], dateAdded: new Date(r.published_at).toISOString() };
    }),
  );
  return mergeObjects(bundles.filter((b): b is NonNullable<typeof b> => b !== null));
}
