import mapping from "@/data/nis2-mapping.json";

export type Nis2Measure = (typeof mapping.measures)[number];
export type Nis2Mapping = { mitigation: string; measures: string[]; rationale: string };

export const NIS2 = {
  version: mapping.version,
  source: mapping.source,
  unmappedNote: mapping.unmapped_note,
  measures: mapping.measures as Nis2Measure[],
};

const BY_MITIGATION = new Map<string, Nis2Mapping>(mapping.mappings.map((m) => [m.mitigation, m]));
const MEASURE_BY_ID = new Map(NIS2.measures.map((m) => [m.id, m]));

/** Mappatura NIS2 di una mitigazione ATT&CK (es. "M1032"), o null se non mappata. */
export function nis2ForMitigation(externalId: string): Nis2Mapping | null {
  return BY_MITIGATION.get(externalId) ?? null;
}

export function nis2Measure(id: string): Nis2Measure | undefined {
  return MEASURE_BY_ID.get(id);
}

/** Mitigazioni ATT&CK assegnate a una lettera dell'art. 24, comma 2. */
export function mitigationsForMeasure(id: string): Nis2Mapping[] {
  return mapping.mappings.filter((m) => m.measures.includes(id));
}

/** Etichetta breve: "art. 24, c. 2, lett. l)". */
export const measureRef = (id: string) => `art. 24, c. 2, lett. ${id})`;
