/** Categorie di settore di ransomware.live (in inglese) → italiano. */
const SECTOR_RAW_IT: Record<string, string> = {
  Manufacturing: "Manifatturiero",
  "Professional Services": "Servizi professionali",
  Technology: "Tecnologia",
  "Retail & E-Commerce": "Commercio ed e-commerce",
  "Agriculture and Food Production": "Agricoltura e alimentare",
  Healthcare: "Sanità",
  Transportation: "Trasporti e logistica",
  "Energy & Utilities": "Energia e servizi di pubblica utilità",
  Education: "Istruzione",
  Hospitality: "Turismo e ospitalità",
  "Financial Services": "Servizi finanziari",
  "Government & Defense": "Pubblica amministrazione e difesa",
  "Business Services": "Servizi alle imprese",
  Other: "Altro",
  "Not Found": "Non indicato",
};

export const sectorRawIt = (raw: string | null | undefined) => (raw ? (SECTOR_RAW_IT[raw] ?? raw) : "Non indicato");
