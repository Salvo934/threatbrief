import "server-only";
import { publicDb } from "@/lib/supabase/public";

export type D3fendMeasure = { id: string; label: string; tactic: string; iri: string; techniques: string[] };

/** Ordine delle categorie D3FEND, dalla prevenzione al ripristino. */
export const D3FEND_TACTICS = ["Harden", "Detect", "Isolate", "Deceive", "Evict", "Restore", "Model"] as const;
export const D3FEND_TACTIC_IT: Record<string, { name: string; hint: string }> = {
  Harden: { name: "Rafforzare", hint: "rendere più difficile l'attacco" },
  Detect: { name: "Rilevare", hint: "accorgersi dell'attacco in corso" },
  Isolate: { name: "Isolare", hint: "limitare cosa può raggiungere l'attaccante" },
  Deceive: { name: "Ingannare", hint: "esche e trappole per l'attaccante" },
  Evict: { name: "Espellere", hint: "rimuovere l'attaccante" },
  Restore: { name: "Ripristinare", hint: "tornare operativi" },
  Model: { name: "Modellare", hint: "conoscere i propri asset e flussi" },
};

/** Contromisure D3FEND per un insieme di tecniche ATT&CK, con le tecniche che ciascuna copre. */
export async function getD3fendFor(attackIds: string[]): Promise<D3fendMeasure[]> {
  if (!attackIds.length) return [];
  const db = publicDb();
  const rows: { attack_external_id: string; d3fend_id: string; label: string; tactic: string; iri_name: string }[] = [];
  for (let i = 0; i < attackIds.length; i += 150) {
    const { data, error } = await db
      .from("d3fend_countermeasures")
      .select("attack_external_id, d3fend_id, label, tactic, iri_name")
      .in("attack_external_id", attackIds.slice(i, i + 150));
    if (error) throw new Error(`D3FEND: ${error.message}`);
    rows.push(...(data ?? []));
  }
  const byId = new Map<string, D3fendMeasure>();
  for (const r of rows) {
    const m = byId.get(r.d3fend_id) ?? { id: r.d3fend_id, label: r.label, tactic: r.tactic, iri: r.iri_name, techniques: [] };
    if (!m.techniques.includes(r.attack_external_id)) m.techniques.push(r.attack_external_id);
    byId.set(r.d3fend_id, m);
  }
  return [...byId.values()].sort((a, b) => b.techniques.length - a.techniques.length || a.label.localeCompare(b.label));
}
