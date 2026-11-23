"use client";

import { useActionState, useState } from "react";
import { saveReview } from "@/app/digest/actions";
import type { FormState } from "@/app/report/actions";
import { PRIORITY_LABEL, type DigestReview, type Priority, type ReviewPriority } from "@/lib/digest/types";

const OPTIONS: ReviewPriority[] = ["azione", "monitorare", "info", "escludi"];
const TONE: Record<ReviewPriority, string> = {
  azione: "border-err text-err",
  monitorare: "border-warn-text text-warn-text",
  info: "border-accent text-accent",
  escludi: "border-line text-muted",
};

/** Revisione di un elemento: priorità finale + «perché ci riguarda» + «cosa fare». */
export function ReviewForm({ digestId, itemKey, suggested, review }: {
  digestId: string;
  itemKey: string;
  suggested: Priority;
  review: DigestReview | undefined;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveReview, {});
  const [priority, setPriority] = useState<ReviewPriority>(review?.priority ?? suggested);
  const excluded = priority === "escludi";

  return (
    <form action={action} className="mt-3 space-y-2 border-t border-line pt-3">
      <input type="hidden" name="digest_id" value={digestId} />
      <input type="hidden" name="item_key" value={itemKey} />
      <fieldset className="flex flex-wrap gap-1.5">
        <legend className="sr-only">Priorità</legend>
        {OPTIONS.map((o) => (
          <label key={o} className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-xs ${priority === o ? `${TONE[o]} font-semibold` : "border-line text-muted hover:bg-surface-2"}`}>
            <input type="radio" name="priority" value={o} checked={priority === o} onChange={() => setPriority(o)} className="sr-only" />
            {PRIORITY_LABEL[o]}
            {o === suggested && !review && <span className="ml-1 opacity-70">(suggerita)</span>}
          </label>
        ))}
      </fieldset>
      {!excluded && (
        <div className="grid gap-2 md:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted">Perché ci riguarda</span>
            <textarea name="relevance" defaultValue={review?.relevance ?? ""} maxLength={600} rows={2} placeholder="Es. 3 clienti usano questo gateway, esposto su Internet" className="w-full rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted">Cosa fare</span>
            <textarea name="action" defaultValue={review?.action ?? ""} maxLength={600} rows={2} placeholder={priority === "azione" ? "Obbligatorio per «Azione»" : "Anche «nessuna azione, monitoriamo»"} className="w-full rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm" />
          </label>
        </div>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60">
          {pending ? "…" : review ? "Aggiorna" : "Salva revisione"}
        </button>
        {state.error && <span role="alert" className="text-xs text-err">{state.error}</span>}
        {state.ok && <span role="status" className="text-xs text-muted">{state.ok}</span>}
        {review && !state.ok && <span className="text-xs text-ok">✓ rivisto</span>}
      </div>
    </form>
  );
}
