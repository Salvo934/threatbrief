"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/primitives";
import type { OsintLookup } from "@/lib/osint/export";
import { invoke } from "./invoke";

type Ai = NonNullable<OsintLookup["ai"]>;

/** Nota dell'analista scritta con IA sui soli dati dell'indagine, con i prossimi passi cliccabili. */
export function AiNote({ lookup, onUpdate, onPick }: { lookup: OsintLookup; onUpdate: (ai: Ai) => void; onPick: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ai = lookup.ai;

  const generate = async () => {
    setBusy(true);
    setError(null);
    const { data, error: err } = await invoke<{ ai: Ai }>("osint-ai", { lookup_id: lookup.id });
    setBusy(false);
    if (err || !data) return setError(err ?? "Risposta vuota");
    onUpdate(data.ai);
  };

  return (
    <Card
      title={<span className="inline-flex items-center gap-1.5"><Sparkles aria-hidden className="size-4 text-accent" /> Nota dell&apos;analista</span>}
      action={!busy && <button type="button" onClick={() => void generate()} className="text-xs text-accent hover:underline">{ai ? "Rigenera" : "Scrivi con IA"}</button>}
    >
      {busy && <p className="text-sm text-muted">Scrivo la nota usando solo i dati raccolti…</p>}
      {error && <p className="text-sm text-err">{error}</p>}
      {!ai && !busy && !error && (
        <p className="text-sm text-muted">
          L&apos;IA riassume l&apos;indagine e indica quali collegamenti indagare per primi. Usa solo i dati qui sotto: la nota viene
          scartata se contiene numeri che non compaiono nei dati, e i passi suggeriti devono essere collegamenti reali.
        </p>
      )}
      {ai && (
        <div className="space-y-3 text-sm">
          <p className="leading-relaxed">{ai.summary}</p>
          {ai.next_steps.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium text-muted">Prossimi passi</div>
              <ol className="list-decimal space-y-1 pl-5">
                {ai.next_steps.map((s) => (
                  <li key={s.pivot}>
                    <button type="button" onClick={() => onPick(s.pivot)} className="font-mono text-xs text-accent hover:underline">{s.pivot}</button>
                    <span className="text-muted"> — {s.why}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <p className="text-[11px] text-muted">
            Scritto con IA ({ai.model}) sui soli dati dell&apos;indagine{ai.rejected ? `; ${ai.rejected} passi scartati perché non corrispondevano a collegamenti reali` : ""}. Da verificare.
          </p>
        </div>
      )}
    </Card>
  );
}
