import Link from "next/link";
import { Suspense } from "react";
import { AccountBadge } from "@/components/layout/account-badge";
import { NavLinks, NavList } from "@/components/layout/nav-links";

/**
 * Navigazione principale: barra laterale fissa da schermo largo (lg) in su,
 * barra in alto con le voci in riga scorrevole su schermi stretti.
 * Non legge la sessione sul server: lo stato dell'account arriva dal browser.
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
          <AccountBadge />
        </div>
      </div>
      <nav aria-label="Principale" className="px-2 py-2 lg:mt-4 lg:flex-1 lg:px-3">
        <Suspense fallback={<NavList pathname={null} />}>
          <NavLinks />
        </Suspense>
      </nav>
      <div className="hidden flex-col items-start gap-2 border-t border-line px-5 py-4 text-xs lg:flex">
        <AccountBadge keepSession />
      </div>
    </aside>
  );
}
