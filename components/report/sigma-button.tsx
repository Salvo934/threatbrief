"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { invoke } from "@/components/osint/invoke";

type Result = { rules: unknown[]; rejected: { title: string; errors: string[] }[]; skipped: number; model: string };

/** Genera (o rigenera) le regole Sigma del report con la Edge Function «sigma». */
export function SigmaButton({ reportId, hasRules }: { reportId: string; hasRules: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [rejected, setRejected] = useState<Result["rejected"]>([]);

  const run = async () => {
    if (hasRules && !confirm("Le regole attuali verranno sostituite. Continuare?")) return;
    setBusy(true);
    setMsg(null);
    const { data, error } = await invoke<Result>("sigma", { report_id: reportId });
    setBusy(false);
    if (error || !data) return setMsg(error ?? "Generazione non riuscita.");
    setRejected(data.rejected);
    setMsg(`${data.rules.length} regole salvate${data.rejected.length ? `, ${data.rejected.length} scartate dai controlli` : ""}${data.skipped ? `; ${data.skipped} tecniche non incluse (ricognizione o oltre il limite di 6)` : ""}.`);
    router.refresh();
  };

  return (
    <div className="space-y-2">
      <button type="button" onClick={() => void run()} disabled={busy} className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60">
        {busy ? "Genero le regole… (circa un minuto)" : hasRules ? "Rigenera le regole" : "Genera regole di rilevamento"}
      </button>
      {msg && <p className="text-sm">{msg}</p>}
      {rejected.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted">
          {rejected.map((r) => <li key={r.title}><strong>{r.title}</strong>: {r.errors.join("; ")}</li>)}
        </ul>
      )}
    </div>
  );
}
