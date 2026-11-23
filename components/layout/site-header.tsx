import { Suspense } from "react";
import { AccountCard, AccountProvider } from "./account-badge";
import { Brand } from "./brand";
import { MobileNav } from "./mobile-nav";
import { NavLinks, NavList } from "./nav-links";

/**
 * Navigazione principale: barra laterale fissa da schermo largo (lg) in su, barra in alto con
 * menu a scomparsa su schermi stretti. Non legge la sessione sul server: lo stato
 * dell'account arriva dal browser, così le pagine pubbliche restano uguali per tutti (cache).
 */
export function SiteHeader() {
  return (
    <AccountProvider>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="px-4 py-4">
          <Brand />
        </div>
        <nav aria-label="Principale" className="flex-1 overflow-y-auto px-3 py-2">
          <Suspense fallback={<NavList pathname={null} />}>
            <NavLinks />
          </Suspense>
        </nav>
        <div className="border-t border-line p-3">
          <AccountCard />
        </div>
      </aside>
      <MobileNav />
    </AccountProvider>
  );
}
