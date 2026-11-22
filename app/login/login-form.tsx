"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/analisi"} />
      <label className="block space-y-1 text-sm">
        <span className="text-muted">Email</span>
        <input name="email" type="email" required autoComplete="email"
          className="w-full rounded-md border border-line bg-surface px-3 py-2" />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-muted">Password</span>
        <input name="password" type="password" required autoComplete="current-password"
          className="w-full rounded-md border border-line bg-surface px-3 py-2" />
      </label>
      {state.error && <p role="alert" className="text-sm text-err">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
        {pending ? "Accesso…" : "Accedi"}
      </button>
    </form>
  );
}
