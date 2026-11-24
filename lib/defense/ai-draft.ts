import type { AdvisoryAi } from "../ai/guard";
import { clip } from "../ai/guard";
import type { composeDraft } from "./rules";

type Draft = ReturnType<typeof composeDraft>;

/**
 * Unisce la bozza a modello con il testo scritto dall'IA (già validato). Restano fissi i fatti
 * «di servizio» (pubblicazione, motivo di rilevanza) e la valutazione del rischio, che resta
 * una regola esplicita; l'IA scrive sintesi, impatto, azioni e fatti chiave con citazione.
 */
export function mergeAiDraft(draft: Draft, ai: AdvisoryAi, kevIds: string[]): Draft {
  const actions = [...ai.actions];
  // Le CVE già sfruttate restano la prima azione se l'IA non le ha citate.
  if (kevIds.length && !actions.some((a) => kevIds.some((id) => a.includes(id)))) {
    actions.unshift(draft.actions[0]);
  }
  const execFixed = draft.statements.filter((s) => s.section === "executive" && s.kind === "fatto").slice(0, 2);
  const valuation = draft.statements.filter((s) => s.kind === "valutazione");
  const technicalFixed = draft.statements.filter((s) => s.section === "tecnica" && !s.body.startsWith("Sintesi dell'avviso"));

  return {
    ...draft,
    summary: clip(ai.summary, 900),
    impact: clip(`${ai.impact} (Testo scritto con IA: da verificare.)`, 500),
    actions: actions.slice(0, 3),
    statements: [
      ...execFixed,
      ...(execFixed.length < 3 && ai.facts[0] ? [{ section: "executive" as const, kind: "fatto" as const, body: clip(ai.facts[0].text, 300) }] : []),
      ...valuation,
      ...ai.facts.map((f) => ({ section: "tecnica" as const, kind: "fatto" as const, body: clip(`${f.text} — dall'avviso: «${f.quote}»`, 1000) })),
      ...technicalFixed,
    ],
    tech_notes: [
      `Sintesi, impatto, azioni e fatti chiave scritti con IA (Claude) usando solo il testo dell'avviso; ogni fatto riporta la citazione originale, verificata automaticamente${ai.rejected ? ` (${ai.rejected} proposte scartate perché non verificabili)` : ""}. Da controllare prima della pubblicazione.`,
      draft.tech_notes,
    ].join("\n\n"),
  };
}
