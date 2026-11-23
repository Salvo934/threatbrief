import Link from "next/link";

/** Collegamenti alle pagine «figlie» di una voce del menu (es. Minacce → Attori, Confronta). */
export function SubNav({ items, current }: { items: { href: string; label: string }[]; current: string }) {
  return (
    <nav aria-label="Sezioni" className="mb-4 flex flex-wrap gap-1 border-b border-line text-sm">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={i.href === current ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-2 ${i.href === current ? "border-accent font-medium text-accent" : "border-transparent text-muted hover:text-fg"}`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export const MINACCE_TABS = [
  { href: "/minacce", label: "Minacce principali" },
  { href: "/minacce/notte", label: "La notte nel mondo" },
  { href: "/attori", label: "Tutti gli attori" },
  { href: "/matrice", label: "Confronta due attori" },
];
export const SETTORI_TABS = [
  { href: "/settori", label: "Settori" },
  { href: "/mitigazioni", label: "Mitigazioni e NIS2" },
];
