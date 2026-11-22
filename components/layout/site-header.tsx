import Link from "next/link";
import { Suspense } from "react";
import { logout } from "@/app/login/actions";
import { NavLinks, NavList } from "@/components/layout/nav-links";
import { SessionKeeper } from "@/components/layout/session-keeper";
import { getViewer } from "@/lib/supabase/server";

/**
 * Navigazione principale: barra laterale fissa da schermo largo (lg) in su,
 * barra in alto con le voci in riga scorrevole su schermi stretti.
 */
export function SiteHeader() {
  return (
    <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-56 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0">
      <div className="flex items-center justify-between gap-3 px-4 pt-3 lg:px-5 lg:pt-5">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden className="inline-block size-2.5 rounded-sm bg-accent" />
          ThreatBrief
        </Link>
        <div className="flex items-center gap-2 text-xs lg:hidden">
          <Suspense fallback={<span className="text-muted">…</span>}>
            <ViewerBadge />
          </Suspense>
        </div>
      </div>
      <nav aria-label="Principale" className="px-2 py-2 lg:mt-4 lg:flex-1 lg:px-3">
        <Suspense fallback={<NavList pathname={null} />}>
          <NavLinks />
        </Suspense>
      </nav>
      <div className="hidden flex-col items-start gap-2 border-t border-line px-5 py-4 text-xs lg:flex">
        <Suspense fallback={<span className="text-muted">…</span>}>
          <ViewerBadge keepSession />
        </Suspense>
      </div>
    </aside>
  );
}

/** keepSession: monta il rinnovo della sessione una sola volta (il badge compare due volte nel layout). */
async function ViewerBadge({ keepSession = false }: { keepSession?: boolean }) {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <>
        <span className="rounded-full border border-line px-2.5 py-0.5 text-muted">Demo pubblica · sola lettura</span>
        <Link href="/login" className="rounded-md py-1 text-muted hover:text-fg">Accedi</Link>
      </>
    );
  }
  return (
    <>
      {keepSession && <SessionKeeper />}
      <span className="text-muted">
        {viewer.name ?? viewer.email}
        {!viewer.isAnalyst && " · senza permessi di scrittura"}
      </span>
      {viewer.isAnalyst && <Link href="/report" className="rounded-md py-1 text-accent hover:underline">I miei report</Link>}
      <form action={logout}>
        <button className="rounded-md py-1 text-muted hover:text-fg">Esci</button>
      </form>
    </>
  );
}
