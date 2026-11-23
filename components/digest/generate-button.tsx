"use client";

import { RefreshCw } from "lucide-react";
import { useActionState } from "react";
import { generateNow } from "@/app/digest/actions";
import type { FormState } from "@/app/report/actions";

export function GenerateButton({ label = "Genera la bozza di oggi" }: { label?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(async () => generateNow(), {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
        <RefreshCw aria-hidden className={`size-4 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Genero…" : label}
      </button>
      {state.error && <span role="alert" className="text-sm text-err">{state.error}</span>}
    </form>
  );
}
