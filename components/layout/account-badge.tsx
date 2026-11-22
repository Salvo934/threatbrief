"use client";

import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/app/login/actions";

type Account = { name: string; isAnalyst: boolean } | null;

/**
 * Stato dell'account calcolato nel browser, non sul server: così le pagine pubbliche sono
 * identiche per tutti e Cloudflare può metterle in cache senza rischiare di servire a un
 * visitatore la pagina generata per l'analista.
 * Il client Supabase rinnova anche il token prima della scadenza (al posto del proxy di Next,
 * non supportato sui Worker). `keepSession`: solo un'istanza ricarica i dati al rinnovo.
 */
export function AccountBadge({ keepSession = false }: { keepSession?: boolean }) {
  const router = useRouter();
  const [account, setAccount] = useState<Account | undefined>(undefined);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
    let active = true;

    async function load() {
      const { data } = await supabase.auth.getSession(); // rinnova il token se è scaduto
      const user = data.session?.user;
      if (!user) return active && setAccount(null);
      // La RLS di analysts mostra solo la propria riga: se c'è, l'utente è analista.
      const { data: analyst } = await supabase.from("analysts").select("display_name").eq("user_id", user.id).maybeSingle();
      if (active) setAccount({ name: analyst?.display_name ?? user.email ?? "Utente", isAnalyst: !!analyst });
    }

    void load();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        void load();
        if (keepSession && event === "TOKEN_REFRESHED") router.refresh();
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [keepSession, router]);

  if (account === undefined) return <span className="text-muted">…</span>;
  if (account === null) {
    return (
      <>
        <span className="whitespace-nowrap rounded-full border border-line px-2.5 py-0.5 text-muted">
          <span className="hidden sm:inline">Demo pubblica · </span>sola lettura
        </span>
        <Link href="/login" className="rounded-md py-1 text-muted hover:text-fg">Accedi</Link>
      </>
    );
  }
  return (
    <>
      <span className="text-muted">
        {account.name}
        {!account.isAnalyst && " · senza permessi di scrittura"}
      </span>
      {account.isAnalyst && <Link href="/report" className="rounded-md py-1 text-accent hover:underline">I miei report</Link>}
      <form action={logout}>
        <button className="rounded-md py-1 text-muted hover:text-fg">Esci</button>
      </form>
    </>
  );
}
