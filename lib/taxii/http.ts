import { acceptable, TAXII_MEDIA, taxiiError } from "./core";

/** Risposta TAXII: content-type corretto e cache solo su Cloudflare (dati pubblici TLP:CLEAR). */
export function taxiiJson(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": TAXII_MEDIA,
      "cloudflare-cdn-cache-control": "public, max-age=300, stale-while-revalidate=3600",
      ...headers,
    },
  });
}

/** null se la richiesta va bene; altrimenti la risposta d'errore 406 prevista da TAXII 2.1. */
export function checkAccept(request: Request): Response | null {
  return acceptable(request.headers.get("accept"))
    ? null
    : taxiiJson(taxiiError(406, "Formato non supportato", "Usa Accept: application/taxii+json;version=2.1"), 406);
}

export const notFound = (what: string) => taxiiJson(taxiiError(404, `${what} non trovato`), 404);
export const origin = (request: Request) => new URL(request.url).origin;
