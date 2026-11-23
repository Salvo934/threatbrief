/** Collegamento a un oggetto ATT&CK: gruppo (ha una scheda in /attori) o software. */
export type AttackRef = { kind: "group" | "software"; external_id: string; name: string };

export type WorldSource = { id: string; name: string; ok: boolean; note?: string };

export type WorldReportData = {
  sources: WorldSource[];
  claims: {
    total: number;
    /** true se la fonte ha restituito meno dati di quelli della finestra */
    partial: boolean;
    groups: { name: string; count: number; countries: string[]; attack: AttackRef | null }[];
    countries: { code: string; count: number }[];
    sectors: { label: string; count: number }[];
  };
  malware: { name: string; count: number; attack: AttackRef | null; usedBy: number }[];
  kev: { cve_id: string; vendor: string; product: string; name: string; ransomware: boolean }[];
  /** attori attivi collegati ad ATT&CK, su cui si calcolano tecniche e difese */
  actors: { label: string; via: "rivendicazione" | "malware"; attack: AttackRef }[];
  techniques: { external_id: string; name: string; tactics: string[]; actors: number }[];
  mitigations: { external_id: string; name: string; techniques: number; score: number }[];
  d3fend: { measures: { id: string; label: string; tactic: string; iri: string }[]; techniques: number; total: number }[];
};

export type WorldReport = {
  report_date: string;
  window_start: string;
  window_end: string;
  generated_at: string;
  data: WorldReportData;
};
