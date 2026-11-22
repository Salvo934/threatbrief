import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

/**
 * Client legato alla sessione dell'utente (cookie). Usa la chiave publishable:
 * cosa può leggere/scrivere lo decide la RLS in base all'utente loggato.
 * Da chiamare dentro un <Suspense> o in una Server Action (legge i cookie).
 */
export async function sessionDb() {
  // Il client controlla la scadenza del token con l'ora corrente: va eseguito a ogni
  // richiesta, mai in prerender (altrimenti Next segnala "blocking-prerender-current-time").
  await connection();
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            for (const { name, value, options } of list) store.set(name, value, options);
          } catch {
            // In un Server Component i cookie sono in sola lettura: li aggiorna SessionKeeper nel browser.
          }
        },
      },
    },
  );
}

export type Viewer = { userId: string; email: string | null; isAnalyst: boolean; name: string | null } | null;

/** Utente corrente (verificato con getClaims) e se è un analista autorizzato a scrivere. */
export async function getViewer(): Promise<Viewer> {
  const db = await sessionDb();
  const { data } = await db.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  // La RLS di analysts mostra solo la propria riga: se c'è, l'utente è analista.
  const { data: analyst } = await db.from("analysts").select("display_name").eq("user_id", claims.sub).maybeSingle();
  return {
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    isAnalyst: !!analyst,
    name: analyst?.display_name ?? null,
  };
}
