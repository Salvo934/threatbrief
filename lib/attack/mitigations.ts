/** Mitigazioni che ATT&CK non considera azionabili dal difensore (non vanno in classifica). */
export const NON_ACTIONABLE = new Set(["M1055", "M1056"]);

export type MitigationRef = { id: string; external_id: string; name: string };
export type MitigatesLink = { mitigation_id: string; technique_id: string };

export type RankedMitigation = {
  mitigation: MitigationRef;
  /** tecniche coperte tra quelle considerate */
  techniques: number;
  /** peso totale coperto (es. somma degli attori che usano ogni tecnica) */
  score: number;
};

/**
 * Classifica le mitigazioni per quante tecniche osservate coprono, pesate (per esempio
 * con il numero di attori che usano la tecnica). Peso di default: 1 per tecnica.
 */
export function rankMitigations(
  mitigations: MitigationRef[],
  links: MitigatesLink[],
  weights: Map<string, number>,
): RankedMitigation[] {
  const byId = new Map(mitigations.map((m) => [m.id, m]));
  const acc = new Map<string, RankedMitigation>();
  for (const l of links) {
    const w = weights.get(l.technique_id);
    const m = byId.get(l.mitigation_id);
    if (!w || !m || NON_ACTIONABLE.has(m.external_id)) continue;
    const r = acc.get(m.id) ?? { mitigation: m, techniques: 0, score: 0 };
    r.techniques++;
    r.score += w;
    acc.set(m.id, r);
  }
  return [...acc.values()].sort(
    (a, b) => b.score - a.score || b.techniques - a.techniques || a.mitigation.external_id.localeCompare(b.mitigation.external_id),
  );
}
