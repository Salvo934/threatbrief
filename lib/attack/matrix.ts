import type { Tactic, TechniqueLite } from "@/lib/db/types";

/** Come un attore usa una tecnica: direttamente o tramite un software che usa. */
export type Usage = "diretta" | "software";

/** Uso per attore: "a" è sempre presente; "b" solo nel confronto. */
export type Flags = { a?: Usage; b?: Usage };

export type SubCell = { technique: TechniqueLite; flags: Flags };

export type MatrixCell = {
  technique: TechniqueLite; // tecnica padre
  flags: Flags; // aggregato: padre + sotto-tecniche
  subs: SubCell[]; // sotto-tecniche usate
};

export type MatrixColumn = { tactic: Tactic; cells: MatrixCell[] };

const rank = (u?: Usage) => (u === "diretta" ? 2 : u === "software" ? 1 : 0);
const stronger = (x?: Usage, y?: Usage) => (rank(x) >= rank(y) ? x : y);

export const mergeFlags = (x: Flags, y: Flags): Flags => ({
  a: stronger(x.a, y.a),
  b: stronger(x.b, y.b),
});

export const isUsed = (f: Flags) => !!(f.a || f.b);

/**
 * Costruisce la matrice tattiche × tecniche (padri), aggregando l'uso delle sotto-tecniche
 * sul padre. `usage` è indicizzato per external_id (T1059, T1059.001...).
 */
export function buildMatrix(
  tactics: Tactic[],
  techniques: TechniqueLite[],
  usage: Map<string, Flags>,
  { onlyUsed = false }: { onlyUsed?: boolean } = {},
): MatrixColumn[] {
  const subsByParent = new Map<string, TechniqueLite[]>();
  for (const t of techniques) {
    if (t.is_subtechnique && t.parent_external_id) {
      const list = subsByParent.get(t.parent_external_id) ?? [];
      list.push(t);
      subsByParent.set(t.parent_external_id, list);
    }
  }

  const parents = techniques
    .filter((t) => !t.is_subtechnique)
    .sort((a, b) => a.name.localeCompare(b.name));

  return [...tactics]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((tactic) => {
      const cells = parents
        .filter((p) => p.tactics.includes(tactic.shortname))
        .map((p) => {
          const subs = (subsByParent.get(p.external_id) ?? [])
            .map((s) => ({ technique: s, flags: usage.get(s.external_id) ?? {} }))
            .filter((s) => isUsed(s.flags))
            .sort((x, y) => x.technique.external_id.localeCompare(y.technique.external_id));
          const flags = subs.reduce((acc, s) => mergeFlags(acc, s.flags), usage.get(p.external_id) ?? {});
          return { technique: p, flags, subs };
        })
        .filter((c) => !onlyUsed || isUsed(c.flags));
      return { tactic, cells };
    });
}

/** Statistiche di sovrapposizione tra due attori (su tecniche padre, uso diretto o via software). */
export function overlapStats(columns: MatrixColumn[]) {
  const seen = new Map<string, Flags>();
  for (const col of columns) for (const c of col.cells) seen.set(c.technique.external_id, c.flags);
  let onlyA = 0, onlyB = 0, both = 0;
  for (const f of seen.values()) {
    if (f.a && f.b) both++;
    else if (f.a) onlyA++;
    else if (f.b) onlyB++;
  }
  const union = onlyA + onlyB + both;
  return { onlyA, onlyB, both, jaccard: union ? both / union : 0 };
}
