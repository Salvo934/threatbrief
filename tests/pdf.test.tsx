import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import { ReportPdf } from "@/components/report/report-pdf";
import { EXEC_LIMITS, type ReportFull } from "@/lib/report/types";
import { fixtureReport } from "./fixtures/report";

const text = (n: number) => "Testo di prova con parole di lunghezza media per riempire lo spazio disponibile. ".repeat(30).slice(0, n);

/** Brief con tutti i campi alla lunghezza massima consentita dall'editor. */
const worst: ReportFull = {
  ...fixtureReport,
  report: {
    ...fixtureReport.report,
    title: "ESEMPIO — Titolo lungo di un report di prova per verificare che il brief stia in una pagina A4",
    exec_summary: text(EXEC_LIMITS.summary),
    exec_impact: text(EXEC_LIMITS.impact),
    exec_actions: Array.from({ length: EXEC_LIMITS.actions }, () => text(EXEC_LIMITS.action)),
  },
  sources: [1, 2, 3, 4].map((i) => ({ ...fixtureReport.sources[0], id: `s${i}`, title: `Fonte di prova numero ${i} con un titolo piuttosto lungo` })),
  statements: Array.from({ length: EXEC_LIMITS.statements }, (_, i) => ({
    id: `x${i}`,
    section: "executive" as const,
    kind: i % 2 ? ("valutazione" as const) : ("fatto" as const),
    body: text(EXEC_LIMITS.statementBody),
    source_id: i % 2 ? null : "s1",
    confidence: i % 2 ? ("medio" as const) : null,
    position: i,
  })),
};

async function pages(full: ReportFull, mode: "brief" | "tecnica") {
  const buf = await renderToBuffer(<ReportPdf full={full} mode={mode} mitigations={[{ external_id: "M1032", name: "Multi-factor Authentication", techniques: 3, measures: ["l"] }]} />);
  return (buf.toString("latin1").match(/\/Type\s*\/Page\b(?!s)/g) ?? []).length;
}

describe("PDF", () => {
  it("il brief esecutivo sta in una pagina anche con i campi al massimo", async () => {
    expect(await pages(worst, "brief")).toBe(1);
  }, 30_000);

  it("la scheda tecnica si genera", async () => {
    expect(await pages(fixtureReport, "tecnica")).toBeGreaterThanOrEqual(1);
  }, 30_000);
});
