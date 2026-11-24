"use client";

import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;
/** Client Supabase del browser (sessione dell'analista), condiviso dai componenti OSINT. */
export const browserDb = () =>
  (client ??= createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!));

/** Chiama una Edge Function e restituisce i dati o un messaggio d'errore leggibile. */
export async function invoke<T>(name: string, body: unknown): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await browserDb().functions.invoke(name, { body });
  if (!error) return { data: data as T, error: null };
  let msg = error.message;
  try {
    msg = ((await (error as { context?: Response }).context?.json()) as { error?: string })?.error ?? msg;
  } catch {
    // risposta senza corpo JSON
  }
  return { data: null, error: msg };
}

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}
