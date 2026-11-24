import type { ConfidenceLevel } from "@/lib/db/types";
import type { IocType } from "@/lib/ioc/normalize";

export const TLP_LEVELS = ["CLEAR", "GREEN", "AMBER", "AMBER+STRICT", "RED"] as const;
export type Tlp = (typeof TLP_LEVELS)[number];
export const REPORT_KINDS = ["attore", "settore", "evento"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];
export const REPORT_STATUSES = ["draft", "final", "published"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export const RISK_LEVELS = ["critico", "alto", "medio", "basso"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];
export const CONFIDENCE_LEVELS = ["alto", "medio", "basso"] as const satisfies readonly ConfidenceLevel[];

export type ReportRow = {
  id: string;
  slug: string;
  title: string;
  kind: ReportKind;
  subject_group_id: string | null;
  subject_sector_id: string | null;
  subject_event: string | null;
  tlp: Tlp;
  confidence: ConfidenceLevel;
  status: ReportStatus;
  published_at: string | null;
  exec_risk: RiskLevel | null;
  exec_summary: string | null;
  exec_impact: string | null;
  exec_actions: string[];
  tech_notes: string | null;
  is_example: boolean;
  /** creato dalla pipeline «Difesa e aerospazio»: bozza da verificare */
  auto_generated: boolean;
  /** sintesi, impatto, azioni e fatti chiave scritti con IA (da verificare) */
  ai_assisted: boolean;
  created_at: string;
  updated_at: string;
};

export type ReportSource = {
  id: string;
  title: string;
  url: string | null;
  publisher: string | null;
  reliability: string; // A–F
  credibility: number; // 1–6
  accessed_at: string;
};

export type ReportStatement = {
  id: string;
  section: "executive" | "tecnica";
  kind: "fatto" | "valutazione";
  body: string;
  source_id: string | null;
  confidence: ConfidenceLevel | null;
  position: number;
};

export type ReportTechnique = { id: string; external_id: string; name: string; note: string | null };
export type ReportIoc = { id: number; type: IocType; value: string; first_seen: string; last_seen: string };

/** Regola Sigma generata dalle tecniche del report (bozza con IA, da testare). */
export type DetectionRule = { id: string; technique_id: string; title: string; level: string; logsource: string; yaml: string; created_at: string };

export type ReportFull = {
  report: ReportRow;
  subject: { label: string; href: string | null; externalId: string | null };
  sources: ReportSource[];
  statements: ReportStatement[];
  techniques: ReportTechnique[];
  iocs: ReportIoc[];
  rules?: DetectionRule[];
};

/** Limiti del brief esecutivo: deve stare in una pagina A4. */
export const EXEC_LIMITS = { summary: 900, impact: 500, action: 160, actions: 3, statements: 4, statementBody: 300 } as const;
