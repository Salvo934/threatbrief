import { TAXII_MEDIA } from "@/lib/taxii/core";
import { checkAccept, taxiiJson } from "@/lib/taxii/http";

/** TAXII 2.1 — API Root Information. */
export async function GET(request: Request) {
  const bad = checkAccept(request);
  if (bad) return bad;
  return taxiiJson({
    title: "ThreatBrief",
    description: "API root unica: una collezione con i report pubblicati.",
    versions: [TAXII_MEDIA],
    max_content_length: 0, // sola lettura: nessun upload accettato
  });
}
