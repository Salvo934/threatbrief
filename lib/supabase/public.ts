import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client in sola lettura per le pagine pubbliche: usa la chiave publishable,
 * quindi è soggetto alla RLS (ruolo anon). Nessun cookie, nessuna sessione.
 */
export function publicDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Configura NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
