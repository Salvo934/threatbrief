"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AnalysisResultView } from "@/components/analysis/analysis-result";
import { analyze, saveAnalysis, type AnalyzeState } from "./actions";

export function Workbench({ canSave, sample }: { canSave: boolean; sample: string }) {
  const [input, setInput] = useState("");
  const [state, runAnalyze, analyzing] = useActionState<AnalyzeState, FormData>(analyze, {});
  const [saveState, runSave, saving] = useActionState<AnalyzeState, FormData>(saveAnalysis, {});

  // l'ultimo risultato tra analisi e salvataggio
  const current = saveState.result && saveState.input === state.input ? saveState : state;

  return (
    <div className="space-y-4">
      <form action={runAnalyze} className="space-y-2">
        <label htmlFor="input" className="block text-sm font-medium">
          Testo da analizzare
        </label>
        <textarea
          id="input"
          name="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={10}
          maxLength={100_000}
          placeholder="Incolla un report, un'email sospetta o una lista di IOC (anche defanged: hxxp://, [.] …)"
          className="w-full rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs leading-relaxed"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={analyzing} className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60">
            {analyzing ? "Analisi in corso…" : "Analizza"}
          </button>
          <button
            type="button"
            onClick={() => setInput(sample)}
            className="rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-fg"
          >
            Carica testo di esempio
          </button>
          <span className="text-xs text-muted">Il testo non viene salvato se non lo chiedi.</span>
        </div>
      </form>

      {current.error && <p role="alert" className="text-sm text-err">{current.error}</p>}

      {current.result && (
        <>
          {canSave ? (
            <form action={runSave} className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-surface p-3">
              <input type="hidden" name="input" value={state.input ?? ""} />
              <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
                Titolo
                <input name="title" required maxLength={200} placeholder="es. Phishing a tema fatture, 22/11"
                  className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-fg" />
              </label>
              <button disabled={saving} className="rounded-md border border-line px-3 py-1.5 text-sm font-medium disabled:opacity-60">
                {saving ? "Salvataggio…" : "Salva analisi"}
              </button>
              {saveState.saved && (
                <Link href={`/analisi/${saveState.saved.id}`} className="text-sm text-accent hover:underline">
                  Salvata: apri →
                </Link>
              )}
            </form>
          ) : (
            <p className="text-xs text-muted">
              Per salvare l&apos;analisi serve l&apos;<Link href="/login?next=/analisi" className="underline">accesso analista</Link>.
            </p>
          )}
          <AnalysisResultView result={current.result} />
        </>
      )}
    </div>
  );
}
