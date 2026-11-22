/** Codice Admiralty (NATO AJP-2.1): affidabilità della fonte A–F, credibilità dell'informazione 1–6. */
export const RELIABILITY: Record<string, string> = {
  A: "Completamente affidabile",
  B: "Generalmente affidabile",
  C: "Abbastanza affidabile",
  D: "Non generalmente affidabile",
  E: "Non affidabile",
  F: "Affidabilità non valutabile",
};

export const CREDIBILITY: Record<number, string> = {
  1: "Confermata da altre fonti",
  2: "Probabilmente vera",
  3: "Possibilmente vera",
  4: "Dubbia",
  5: "Improbabile",
  6: "Veridicità non valutabile",
};

export const admiraltyCode = (reliability: string, credibility: number) => `${reliability}${credibility}`;

export const admiraltyLabel = (reliability: string, credibility: number) =>
  `${admiraltyCode(reliability, credibility)} — fonte ${RELIABILITY[reliability]?.toLowerCase() ?? "?"}, informazione ${CREDIBILITY[credibility]?.toLowerCase() ?? "?"}`;

/** Livelli di confidenza: formula standard per le valutazioni (stile ICD 203). */
export const CONFIDENCE_LABEL = { alto: "alta", medio: "media", basso: "bassa" } as const;
