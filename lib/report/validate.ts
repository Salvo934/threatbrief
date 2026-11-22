import { EXEC_LIMITS, type ReportFull } from "./types";

/**
 * Problemi che impediscono la pubblicazione su /briefs. Il DB impone già TLP:CLEAR e
 * fatti con fonte / valutazioni con confidenza; qui controlliamo completezza e lunghezza.
 */
export function publicationProblems(r: ReportFull): string[] {
  const p: string[] = [];
  const { report } = r;
  if (report.tlp !== "CLEAR") p.push("Su /briefs vanno solo report TLP:CLEAR.");
  if (!report.exec_risk) p.push("Manca il livello di rischio del brief esecutivo.");
  if (!report.exec_summary?.trim()) p.push("Manca la sintesi del brief esecutivo.");
  if ((report.exec_summary?.length ?? 0) > EXEC_LIMITS.summary) p.push(`Sintesi oltre ${EXEC_LIMITS.summary} caratteri.`);
  if ((report.exec_impact?.length ?? 0) > EXEC_LIMITS.impact) p.push(`Impatto oltre ${EXEC_LIMITS.impact} caratteri.`);
  if (!report.exec_actions.length) p.push("Indica almeno un'azione consigliata.");
  if (report.exec_actions.some((a) => a.length > EXEC_LIMITS.action)) p.push(`Azioni oltre ${EXEC_LIMITS.action} caratteri.`);
  if (!r.sources.length) p.push("Serve almeno una fonte con valutazione Admiralty.");
  const execStatements = r.statements.filter((s) => s.section === "executive");
  if (execStatements.length > EXEC_LIMITS.statements) p.push(`Il brief esecutivo ammette al massimo ${EXEC_LIMITS.statements} fatti/valutazioni.`);
  if (execStatements.some((s) => s.body.length > EXEC_LIMITS.statementBody)) {
    p.push(`Nel brief esecutivo ogni fatto/valutazione deve stare in ${EXEC_LIMITS.statementBody} caratteri.`);
  }
  if (!r.statements.some((s) => s.kind === "fatto")) p.push("Serve almeno un fatto con fonte.");
  return p;
}

/** Slug URL da un titolo: minuscole, senza accenti, parole separate da trattino. */
export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}
