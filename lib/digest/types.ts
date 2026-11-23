export type DigestSection = "kev" | "csirt" | "ransomware" | "ioc" | "fonti";
export type Priority = "azione" | "monitorare" | "info";
export type ReviewPriority = Priority | "escludi";

/** Elemento della bozza: fatti dalle fonti + priorità suggerita (regola automatica, da verificare). */
export type DigestItem = {
  key: string; // stabile tra rigenerazioni (es. "kev:CVE-2026-1234"): le revisioni restano agganciate
  section: DigestSection;
  title: string;
  facts: string;
  source: { name: string; url: string | null };
  suggested: Priority;
  reason: string;
};

export type DigestReview = { item_key: string; priority: ReviewPriority; relevance: string | null; action: string | null };

export const SECTION_LABEL: Record<DigestSection, string> = {
  kev: "Vulnerabilità sfruttate (CISA KEV)",
  csirt: "Alert CSIRT Italia",
  ransomware: "Rivendicazioni ransomware in Italia",
  ioc: "Nuovi indicatori (IOC)",
  fonti: "Stato delle fonti",
};
export const SECTION_ORDER: DigestSection[] = ["kev", "csirt", "ransomware", "ioc", "fonti"];
export const PRIORITY_LABEL: Record<ReviewPriority, string> = {
  azione: "Azione",
  monitorare: "Monitorare",
  info: "Info",
  escludi: "Escludi",
};
