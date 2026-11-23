import { checkAccept, origin, taxiiJson } from "@/lib/taxii/http";

/** TAXII 2.1 — Server Discovery. */
export async function GET(request: Request) {
  const bad = checkAccept(request);
  if (bad) return bad;
  const root = `${origin(request)}/taxii2/api/`;
  return taxiiJson({
    title: "ThreatBrief TAXII 2.1",
    description: "Report di cyber threat intelligence TLP:CLEAR sui settori italiani, in STIX 2.1 (sola lettura).",
    contact: `${origin(request)}/briefs`,
    default: root,
    api_roots: [root],
  });
}
