export const USER_AGENT = "ThreatBrief-ingest/0.1";

export async function fetchJson<T>(url: string, init: RequestInit = {}, timeoutMs = 120_000): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "user-agent": USER_AGENT, accept: "application/json", ...init.headers },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} da ${new URL(url).host}`);
  }
  return (await res.json()) as T;
}

/**
 * Ripulisce i messaggi d'errore prima di salvarli in DB (sono pubblici nella pagina Fonti):
 * nessun valore di variabili segrete, nessun parametro di autenticazione negli URL.
 */
export function sanitizeError(err: unknown): string {
  let msg = err instanceof Error ? err.message : String(err);
  for (const [name, value] of Object.entries(process.env)) {
    if (value && value.length >= 8 && /KEY|SECRET|TOKEN|PASSWORD/i.test(name)) {
      msg = msg.split(value).join("[REDATTO]");
    }
  }
  msg = msg.replace(/([?&](?:key|api[_-]?key|auth[_-]?key|token|access_token)=)[^&\s]+/gi, "$1[REDATTO]");
  return msg.slice(0, 500);
}
