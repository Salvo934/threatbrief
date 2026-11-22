import type { SupabaseClient } from "@supabase/supabase-js";
import { upsertInBatches } from "../lib/db";
import { fetchJson } from "../lib/http";
import type { SourceResult } from "../lib/run";

export const KEV_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

type KevEntry = {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription?: string;
  requiredAction?: string;
  dueDate?: string;
  knownRansomwareCampaignUse?: string;
  notes?: string;
  cwes?: string[];
};

export type KevCatalog = {
  catalogVersion: string;
  count: number;
  vulnerabilities: KevEntry[];
};

const CVE_RE = /^CVE-\d{4}-\d{4,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseKev(catalog: KevCatalog) {
  const rows = catalog.vulnerabilities
    .filter((v) => CVE_RE.test(v.cveID?.trim()) && DATE_RE.test(v.dateAdded))
    .map((v) => ({
      cve_id: v.cveID.trim(),
      vendor_project: v.vendorProject.trim(),
      product: v.product.trim(),
      vulnerability_name: v.vulnerabilityName.trim(),
      short_description: v.shortDescription?.trim() || null,
      required_action: v.requiredAction?.trim() || null,
      date_added: v.dateAdded,
      due_date: v.dueDate && DATE_RE.test(v.dueDate) ? v.dueDate : null,
      known_ransomware_use: v.knownRansomwareCampaignUse === "Known",
      cwes: v.cwes ?? [],
      notes: v.notes?.trim() || null,
    }));
  return { version: catalog.catalogVersion, total: catalog.vulnerabilities.length, rows };
}

export async function ingestKev(db: SupabaseClient): Promise<SourceResult> {
  const parsed = parseKev(await fetchJson<KevCatalog>(KEV_URL));
  const upserted = await upsertInBatches(db, "kev_vulnerabilities", parsed.rows, "cve_id");
  return { fetched: parsed.total, upserted, version: parsed.version };
}
