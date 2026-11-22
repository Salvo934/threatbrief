// Tipi delle righe usate dall'app. Rispecchiano supabase/migrations/*.sql.
// (Con la Supabase CLI collegata si possono rigenerare con `npm run db:types`.)

export type AttributionMethod = "fonte" | "derivato" | "analista";
export type ConfidenceLevel = "alto" | "medio" | "basso";
export type RunStatus = "running" | "ok" | "partial" | "error" | "skipped";

export type Tactic = {
  id: string;
  external_id: string;
  shortname: string;
  name: string;
  sort_order: number;
  url: string | null;
};

export type TechniqueLite = {
  id: string;
  external_id: string;
  name: string;
  is_subtechnique: boolean;
  parent_external_id: string | null;
  tactics: string[];
};

export type GroupSummary = {
  id: string;
  external_id: string;
  name: string;
  aliases: string[];
  modified_at: string | null;
  technique_count: number;
  software_count: number;
  sectors: string[];
  countries: string[];
  motivations: string[];
};

export type Group = {
  id: string;
  external_id: string;
  name: string;
  aliases: string[];
  description: string | null;
  url: string | null;
  modified_at: string | null;
};

export type ActorAttribute = {
  attribute: "motivazione" | "settore" | "paese";
  value: string;
  method: AttributionMethod;
  evidence: string | null;
  source_url: string | null;
  confidence: ConfidenceLevel | null;
  is_example: boolean;
};

export type Software = {
  id: string;
  external_id: string;
  name: string;
  type: "malware" | "tool";
  url: string | null;
};

export type Kev = {
  cve_id: string;
  vendor_project: string;
  product: string;
  vulnerability_name: string;
  date_added: string;
  due_date: string | null;
  known_ransomware_use: boolean;
};

export type SourceStatus = {
  id: string;
  name: string;
  homepage_url: string;
  last_run_at: string | null;
  last_success_at: string | null;
  last_status: RunStatus | null;
  last_error: string | null;
  last_record_count: number | null;
  last_version: string | null;
};
