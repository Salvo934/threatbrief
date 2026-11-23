"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { generateDigest } from "@/lib/digest/build";
import { getViewer, sessionDb } from "@/lib/supabase/server";
import type { FormState } from "@/app/report/actions";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRIORITIES = ["azione", "monitorare", "info", "escludi"] as const;

async function analyst() {
  const viewer = await getViewer();
  if (!viewer?.isAnalyst) throw new Error("Solo l'analista può lavorare sul digest.");
  return { db: await sessionDb(), viewer };
}

async function guarded(fn: () => Promise<FormState>): Promise<FormState> {
  try {
    return await fn();
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e; // redirect() di Next
    return { error: e instanceof Error ? e.message : "Operazione non riuscita." };
  }
}

/** Genera (o rigenera) la bozza di oggi su richiesta: le revisioni già fatte restano. */
export async function generateNow(): Promise<FormState> {
  return guarded(async () => {
    const { db } = await analyst();
    const d = await generateDigest(db, "analista");
    redirect(`/digest/${d.digest_date}`);
  });
}

export async function saveReview(_prev: FormState, form: FormData): Promise<FormState> {
  return guarded(async () => {
    const { db, viewer } = await analyst();
    const digestId = String(form.get("digest_id") ?? "");
    const itemKey = String(form.get("item_key") ?? "").slice(0, 200);
    const priority = String(form.get("priority") ?? "");
    if (!UUID.test(digestId) || !itemKey) return { error: "Elemento non valido." };
    if (!(PRIORITIES as readonly string[]).includes(priority)) return { error: "Scegli una priorità." };
    const relevance = String(form.get("relevance") ?? "").trim().slice(0, 600) || null;
    const action = String(form.get("action") ?? "").trim().slice(0, 600) || null;
    if (priority === "azione" && !action) return { error: "Per un elemento «Azione» scrivi cosa fare." };
    const { error } = await db.from("digest_reviews").upsert(
      { digest_id: digestId, item_key: itemKey, priority, relevance, action, updated_at: new Date().toISOString(), updated_by: viewer.userId },
      { onConflict: "digest_id,item_key" },
    );
    if (error) return { error: "Revisione non salvata." };
    refresh();
    return { ok: "Salvato." };
  });
}

export async function markReviewed(_prev: FormState, form: FormData): Promise<FormState> {
  return guarded(async () => {
    const { db, viewer } = await analyst();
    const date = String(form.get("digest_date") ?? "");
    if (!DATE.test(date)) return { error: "Data non valida." };
    const reviewed = form.get("status") === "rivisto";
    const { error } = await db
      .from("digests")
      .update(reviewed ? { status: "rivisto", reviewed_at: new Date().toISOString(), reviewed_by: viewer.userId } : { status: "bozza", reviewed_at: null, reviewed_by: null })
      .eq("digest_date", date);
    if (error) return { error: "Aggiornamento non riuscito." };
    refresh();
    return { ok: reviewed ? "Digest segnato come rivisto." : "Riportato in bozza." };
  });
}
