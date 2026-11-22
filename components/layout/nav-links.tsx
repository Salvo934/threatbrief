"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/attori", label: "Attori" },
  { href: "/matrice", label: "Matrice" },
  { href: "/settori", label: "Settori" },
  { href: "/mitigazioni", label: "Mitigazioni" },
  { href: "/analisi", label: "Analisi" },
  { href: "/briefs", label: "Briefs" },
  { href: "/fonti", label: "Fonti" },
];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

/** Voce attiva evidenziata: legge l'URL, quindi va dentro un <Suspense> (fallback: NavList senza evidenza). */
export function NavLinks() {
  return <NavList pathname={usePathname()} />;
}

/** Voci di navigazione: in colonna nella barra laterale, in riga scorrevole su mobile. */
export function NavList({ pathname }: { pathname: string | null }) {
  return (
    <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {NAV.map((item) => {
        const active = pathname !== null && isActive(pathname, item.href);
        return (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`block rounded-md px-3 py-1.5 text-sm ${
                active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
              }`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
