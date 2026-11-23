"use client";

import {
  Building2, Database, FileText, GraduationCap, Grid3x3, LayoutDashboard, ScanSearch, ShieldCheck, Users, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: LucideIcon };

/** Voci raggruppate per area, nell'ordine del ciclo di intelligence. */
export const NAV: { title: string; items: Item[] }[] = [
  { title: "Panoramica", items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "Intelligence",
    items: [
      { href: "/attori", label: "Attori", icon: Users },
      { href: "/matrice", label: "Matrice ATT&CK", icon: Grid3x3 },
      { href: "/settori", label: "Settori", icon: Building2 },
      { href: "/mitigazioni", label: "Mitigazioni e NIS2", icon: ShieldCheck },
    ],
  },
  { title: "Strumenti", items: [{ href: "/analisi", label: "Analisi IOC", icon: ScanSearch }] },
  { title: "Pubblicazioni", items: [{ href: "/briefs", label: "Briefs", icon: FileText }] },
  { title: "Formazione", items: [{ href: "/accademia", label: "Accademia", icon: GraduationCap }] },
  { title: "Sistema", items: [{ href: "/fonti", label: "Fonti", icon: Database }] },
];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

/** Voce attiva evidenziata: legge l'URL, quindi va dentro un <Suspense> (fallback: NavList senza evidenza). */
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return <NavList pathname={usePathname()} onNavigate={onNavigate} />;
}

export function NavList({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  return (
    <div className="space-y-5">
      {NAV.map((section) => (
        <div key={section.title}>
          <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-muted/80">{section.title}</p>
          <ul className="space-y-0.5">
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = pathname !== null && isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                      active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
                    }`}
                  >
                    {active && <span aria-hidden className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent" />}
                    <Icon aria-hidden className={`size-4 shrink-0 ${active ? "text-accent" : "text-muted group-hover:text-fg"}`} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
