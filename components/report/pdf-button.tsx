"use client";

import { useState } from "react";
import type { ReportFull } from "@/lib/report/types";
import type { PdfMitigation } from "./report-pdf";

/** Genera il PDF nel browser (nessun carico sul server) e lo scarica. */
export function PdfButton({ full, mode, mitigations }: { full: ReportFull; mode: "brief" | "tecnica"; mitigations: PdfMitigation[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function download() {
    setBusy(true);
    setError(false);
    try {
      const [{ pdf }, { ReportPdf }] = await Promise.all([import("@react-pdf/renderer"), import("./report-pdf")]);
      const blob = await pdf(<ReportPdf full={full} mode={mode} mitigations={mitigations} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${full.report.slug}-${mode === "brief" ? "brief" : "scheda-tecnica"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={download} disabled={busy} className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface-2 disabled:opacity-60">
      {busy ? "Genero il PDF…" : error ? "Errore, riprova" : `PDF ${mode === "brief" ? "brief" : "scheda tecnica"}`}
    </button>
  );
}
