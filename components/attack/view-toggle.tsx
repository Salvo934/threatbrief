import Link from "next/link";

/** Alterna matrice completa / solo tecniche usate, mantenendo gli altri parametri. */
export function ViewToggle({ base, params, onlyUsed }: {
  base: string;
  params: Record<string, string | undefined>;
  onlyUsed: boolean;
}) {
  const href = (vista: string) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    sp.set("vista", vista);
    return `${base}?${sp}`;
  };
  const cls = (active: boolean) =>
    `rounded px-2 py-1 ${active ? "bg-surface font-medium text-fg shadow-sm" : "text-muted hover:text-fg"}`;
  return (
    <div className="inline-flex rounded-md border border-line bg-surface-2 p-0.5 text-xs" role="group" aria-label="Vista matrice">
      <Link href={href("completa")} className={cls(!onlyUsed)} aria-current={!onlyUsed ? "true" : undefined}>
        Matrice completa
      </Link>
      <Link href={href("usate")} className={cls(onlyUsed)} aria-current={onlyUsed ? "true" : undefined}>
        Solo usate
      </Link>
    </div>
  );
}
