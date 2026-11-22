"use client";

import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/app/report/actions";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

/** Form collegato a una Server Action, con stato di invio ed esito (errore o conferma). */
export function ActionForm({ action, children, submit, className = "space-y-3", danger, confirm }: {
  action: Action;
  children?: ReactNode;
  submit: string;
  className?: string;
  danger?: boolean;
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className={`rounded-md px-3 py-1.5 text-sm disabled:opacity-60 ${
            danger ? "border border-line text-err hover:bg-surface-2" : "bg-accent text-white hover:opacity-90"
          }`}
        >
          {pending ? "…" : submit}
        </button>
        {state.error && <p role="alert" className="text-sm text-err">{state.error}</p>}
        {state.ok && <p role="status" className="text-sm text-muted">{state.ok}</p>}
      </div>
    </form>
  );
}

/** Pulsante di rimozione compatto per una riga (hidden fields + conferma esito). */
export function RemoveButton({ action, fields }: { action: Action; fields: Record<string, string | number> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="inline">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="submit" disabled={pending} className="text-xs text-muted hover:text-err" title={state.error}>
        {pending ? "…" : state.error ? "errore" : "rimuovi"}
      </button>
    </form>
  );
}
