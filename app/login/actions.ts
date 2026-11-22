"use server";

import { redirect } from "next/navigation";
import { sessionDb } from "@/lib/supabase/server";

export type LoginState = { error?: string };

/** Solo redirect interni: evita open redirect con ?next=https://altrove */
function safeNext(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/analisi";
}

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Inserisci email e password." };

  const db = await sessionDb();
  const { error } = await db.auth.signInWithPassword({ email, password });
  // Messaggio generico: non riveliamo se l'email esiste
  if (error) return { error: "Credenziali non valide." };
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  const db = await sessionDb();
  await db.auth.signOut();
  redirect("/");
}
