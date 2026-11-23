import type { SupabaseClient } from "@supabase/supabase-js";
import { deleteByValues, upsertInBatches } from "../lib/db";
import { USER_AGENT } from "../lib/http";
import type { SourceResult } from "../lib/run";

/**
 * MITRE D3FEND: per ogni tecnica ATT&CK, le contromisure difensive collegate.
 * API ufficiale per tecnica (non esiste un file completo già "inferito"): ~700 richieste,
 * con poca concorrenza per non pesare sul servizio. Gira con il job settimanale di ATT&CK.
 */
const API = "https://d3fend.mitre.org/api/offensive-technique/attack";
const VERSION_URL = "https://d3fend.mitre.org/api/version.json";
const CONCURRENCY = 4;
const TACTICS = new Set(["Model", "Harden", "Detect", "Isolate", "Deceive", "Evict", "Restore"]);

type Binding = Record<string, { value?: string } | undefined>;
export type D3fendRow = { attack_external_id: string; d3fend_id: string; label: string; tactic: string; iri_name: string };

/** Righe uniche (tecnica ATT&CK, contromisura D3FEND) dalla risposta dell'API. */
export function parseD3fend(attackId: string, json: unknown): D3fendRow[] {
  const bindings = (json as { off_to_def?: { results?: { bindings?: Binding[] } } })?.off_to_def?.results?.bindings ?? [];
  const out = new Map<string, D3fendRow>();
  for (const b of bindings) {
    const id = b.def_tech_id?.value;
    const label = b.def_tech_label?.value;
    const tactic = b.def_tactic_label?.value;
    const iri = b.def_tech?.value?.split("#")[1];
    if (!id || !label || !tactic || !iri || !TACTICS.has(tactic) || !/^D3-[A-Z0-9]+$/.test(id)) continue;
    out.set(id, { attack_external_id: attackId, d3fend_id: id, label, tactic, iri_name: iri });
  }
  return [...out.values()];
}

async function fetchTechnique(attackId: string): Promise<D3fendRow[] | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${API}/${attackId}.json`, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(30_000) });
      if (res.status === 404) return []; // tecnica non mappata in D3FEND
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parseD3fend(attackId, await res.json());
    } catch {
      if (attempt === 1) return null;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return null;
}

async function activeTechniques(db: SupabaseClient): Promise<string[]> {
  const out: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("attack_techniques")
      .select("external_id")
      .eq("revoked", false)
      .eq("deprecated", false)
      .order("external_id")
      .range(from, from + 999);
    if (error) throw new Error(`tecniche: ${error.message}`);
    out.push(...(data ?? []).map((r) => r.external_id as string));
    if ((data ?? []).length < 1000) return out;
  }
}

export async function ingestD3fend(db: SupabaseClient): Promise<SourceResult> {
  const version = await fetch(VERSION_URL, { headers: { "user-agent": USER_AGENT } })
    .then((r) => (r.ok ? r.json() : null))
    .then((v: { version?: string } | null) => v?.version)
    .catch(() => undefined);
  const ids = await activeTechniques(db);
  const rows: D3fendRow[] = [];
  const done: string[] = [];
  let failed = 0;
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(fetchTechnique));
    results.forEach((r, j) => {
      if (r === null) failed++;
      else {
        rows.push(...r);
        done.push(batch[j]);
      }
    });
  }
  if (!done.length) throw new Error("D3FEND non raggiungibile: nessuna tecnica letta");
  // Sostituisce le mappature solo delle tecniche lette con successo (le altre restano come erano).
  await deleteByValues(db, "d3fend_countermeasures", done, "attack_external_id");
  const upserted = await upsertInBatches(db, "d3fend_countermeasures", rows, "attack_external_id,d3fend_id");
  return {
    fetched: done.length,
    upserted,
    version,
    ...(failed ? { warning: `${failed} tecniche non lette (errori di rete): mappature precedenti mantenute` } : {}),
  };
}
