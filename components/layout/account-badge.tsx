"use client";

import { createBrowserClient } from "@supabase/ssr";
import { FolderPen, LogIn, LogOut } from "lucide-react";
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
function useAccount(keepSession: boolean): Account | undefined {
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

  return account;
}

const initials = (name: string) =>
  name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?";

/** Scheda account in fondo alla barra laterale (e nel menu mobile). */
export function AccountCard({ keepSession = false, onNavigate }: { keepSession?: boolean; onNavigate?: () => void }) {
  const account = useAccount(keepSession);

  if (account === undefined) return <div aria-hidden className="h-[74px] animate-pulse rounded-lg bg-surface-2" />;

  if (account === null) {
    return (
      <div className="rounded-lg border border-line bg-bg p-3">
        <div className="flex items-center gap-2 text-xs font-medium">
          <span aria-hidden className="size-1.5 rounded-full bg-ok" />
          Demo pubblica
        </div>
        <p className="mt-1 text-xs text-muted">Sola lettura: dati reali, esempi marcati.</p>
        <Link
          href="/login"
          onClick={onNavigate}
          className="mt-2.5 flex items-center justify-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1.5 text-xs font-medium hover:bg-surface-2"
        >
          <LogIn aria-hidden className="size-3.5" /> Accesso analista
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-bg p-3">
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-white">
          {initials(account.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{account.name}</p>
          <p className="text-xs text-muted">{account.isAnalyst ? "Analista" : "Senza permessi di scrittura"}</p>
        </div>
      </div>
      <div className="mt-2.5 flex gap-1.5">
        {account.isAnalyst && (
          <Link
            href="/report"
            onClick={onNavigate}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-accent px-2 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            <FolderPen aria-hidden className="size-3.5" /> I miei report
          </Link>
        )}
        <form action={logout}>
          <button
            title="Esci"
            aria-label="Esci"
            className="grid h-full place-items-center rounded-md border border-line bg-surface px-2.5 text-muted hover:bg-surface-2 hover:text-fg"
          >
            <LogOut aria-hidden className="size-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
