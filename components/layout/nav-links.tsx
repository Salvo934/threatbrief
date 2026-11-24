"use client";

import {
  BookOpenCheck, Briefcase, Building2, MessagesSquare, FileText, FolderPen, GraduationCap, Network, Newspaper, Radar, ScanSearch, ShieldAlert, Sunrise,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "./account-badge";

/** `match`: altri percorsi che appartengono alla stessa voce (es. Minacce comprende Attori e Matrice). */
type Item = { href: string; label: string; icon: LucideIcon; match?: string[] };

/** Menu pubblico: sei voci, ognuna la prova di un requisito degli annunci CTI. */
export const PUBLIC_NAV: Item[] = [
  { href: "/", label: "Briefing", icon: Sunrise, match: ["/briefing"] },
  { href: "/monitoraggio", label: "Monitoraggio", icon: Radar },
  { href: "/minacce", label: "Minacce", icon: ShieldAlert, match: ["/attori", "/matrice"] },
  { href: "/settori", label: "Settori", icon: Building2, match: ["/mitigazioni"] },
  { href: "/analisi", label: "Analizza", icon: ScanSearch },
  { href: "/briefs", label: "Report", icon: FileText },
];

/** Area personale dell'analista: visibile solo dopo l'accesso. */
export const PERSONAL_NAV: Item[] = [
  { href: "/digest", label: "Digest giornaliero", icon: Newspaper },
  { href: "/report", label: "I miei report", icon: FolderPen },
  { href: "/assistente", label: "Chiedi a ThreatBrief", icon: MessagesSquare },
  { href: "/osint", label: "Indagine OSINT", icon: Network },
  { href: "/accademia", label: "Accademia", icon: GraduationCap },
  { href: "/accademia/sul-campo", label: "Sul campo", icon: Briefcase },
];

const ALL = [...PUBLIC_NAV, ...PERSONAL_NAV];
const prefixes = (i: Item) => [i.href, ...(i.match ?? [])];
const matches = (pathname: string, p: string) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`));

/** Attiva la voce con il prefisso più lungo (così «Sul campo» non accende anche «Accademia»). */
function activeHref(pathname: string): string | null {
  let best: { href: string; len: number } | null = null;
  for (const item of ALL) {
    for (const p of prefixes(item)) {
      if (matches(pathname, p) && (!best || p.length > best.len)) best = { href: item.href, len: p.length };
    }
  }
  return best?.href ?? null;
}

/** Voce attiva evidenziata: legge l'URL, quindi va dentro un <Suspense> (fallback: NavList senza evidenza). */
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return <NavList pathname={usePathname()} onNavigate={onNavigate} />;
}

function Section({ title, items, active, onNavigate }: { title?: string; items: Item[]; active: string | null; onNavigate?: () => void }) {
  return (
    <div>
      {title && <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-muted/80">{title}</p>}
      <ul className="space-y-0.5">
        {items.map(({ href, label, icon: Icon }) => {
          const on = active === href;
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={on ? "page" : undefined}
                className={`group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  on ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                {on && <span aria-hidden className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent" />}
                <Icon aria-hidden className={`size-4 shrink-0 ${on ? "text-accent" : "text-muted group-hover:text-fg"}`} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function NavList({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  const account = useAccount();
  const active = pathname === null ? null : activeHref(pathname);
  return (
    <div className="space-y-5">
      <Section items={PUBLIC_NAV} active={active} onNavigate={onNavigate} />
      {account?.isAnalyst && <Section title="Area personale" items={PERSONAL_NAV} active={active} onNavigate={onNavigate} />}
      <div className="border-t border-line pt-3">
        <Link
          href="/competenze"
          onClick={onNavigate}
          aria-current={pathname === "/competenze" ? "page" : undefined}
          className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm ${pathname === "/competenze" ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"}`}
        >
          <BookOpenCheck aria-hidden className="size-4 shrink-0" />
          Cosa dimostra
        </Link>
      </div>
    </div>
  );
}
