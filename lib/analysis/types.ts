import type { HintMethod } from "@/lib/attack/technique-hints";
import type { IocType } from "@/lib/ioc/normalize";

export type IocStatus = "nuovo" | "visto" | "collegato";

export type GroupLink = { external_id: string; name: string; via: string };

export type IocFinding = {
  type: IocType;
  value: string;
  status: IocStatus;
  first_seen: string | null;
  last_seen: string | null;
  sources: string[];
  malware: string[];
  software: { external_id: string; name: string }[];
  groups: GroupLink[];
  kev?: { date_added: string; vulnerability_name: string; known_ransomware_use: boolean } | null;
};

export type AnalysisResult = {
  analyzedAt: string;
  truncated: boolean;
  iocs: IocFinding[];
  techniques: { external_id: string; name: string; method: HintMethod; evidence: string; sameName?: string[] }[];
  software: { external_id: string; name: string; evidence: string; groups: { external_id: string; name: string }[] }[];
};

export const MAX_INPUT_CHARS = 100_000;
export const MAX_IOCS = 500;
