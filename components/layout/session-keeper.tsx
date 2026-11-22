"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Tiene viva la sessione dell'analista dal browser: il client Supabase rinnova il token
 * prima della scadenza e aggiorna i cookie, poi ricarichiamo i dati della pagina.
 * Sostituisce il proxy di Next, che su Cloudflare Workers non è supportato (runtime Node.js).
 * Montato solo quando c'è un utente loggato: i visitori anonimi non caricano nulla.
 */
export function SessionKeeper() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_OUT") router.refresh();
    });
    void supabase.auth.getSession(); // se il token è scaduto, lo rinnova subito
    return () => data.subscription.unsubscribe();
  }, [router]);
  return null;
}
