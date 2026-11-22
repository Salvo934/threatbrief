import type { CSSProperties } from "react";
import type { Flags, MatrixColumn } from "@/lib/attack/matrix";

type Mode = "single" | "compare";

function cellStyle(flags: Flags, mode: Mode): CSSProperties | undefined {
  if (mode === "single") {
    if (flags.a === "diretta") return { background: "var(--use-direct)", color: "var(--use-direct-text)", borderColor: "transparent" };
    if (flags.a === "software") return { background: "var(--use-soft)", color: "var(--use-soft-text)", borderColor: "transparent" };
    return undefined;
  }
  if (flags.a && flags.b) return { background: "var(--cmp-both)", color: "var(--cmp-text)", borderColor: "transparent" };
  if (flags.a) return { background: "var(--cmp-a)", color: "var(--cmp-text)", borderColor: "transparent" };
  if (flags.b) return { background: "var(--cmp-b)", color: "var(--cmp-text)", borderColor: "transparent" };
  return undefined;
}

function compareTag(flags: Flags) {
  if (flags.a && flags.b) return "A+B";
  if (flags.a) return "A";
  if (flags.b) return "B";
  return null;
}

const usageLabel = (u?: string) => (u === "diretta" ? "uso diretto" : u === "software" ? "tramite software" : "");

function tooltip(cell: MatrixColumn["cells"][number], mode: Mode) {
  const t = cell.technique;
  const parts = [`${t.external_id} ${t.name}`];
  if (mode === "single" && cell.flags.a) parts.push(usageLabel(cell.flags.a));
  if (mode === "compare") {
    if (cell.flags.a) parts.push(`A: ${usageLabel(cell.flags.a)}`);
    if (cell.flags.b) parts.push(`B: ${usageLabel(cell.flags.b)}`);
  }
  if (cell.subs.length) {
    parts.push("Sotto-tecniche:", ...cell.subs.map((s) => `  ${s.technique.external_id} ${s.technique.name}`));
  }
  return parts.join("\n");
}

export function AttackMatrix({ columns, mode = "single" }: { columns: MatrixColumn[]; mode?: Mode }) {
  const visible = columns.filter((c) => c.cells.length > 0);
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <div
        className="grid min-w-max gap-1.5 p-2"
        style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(132px, 1fr))` }}
      >
        {visible.map((col) => {
          const used = col.cells.filter((c) => c.flags.a || c.flags.b).length;
          return (
            <div key={col.tactic.id} className="flex flex-col gap-1">
              <div className="sticky top-0 rounded bg-surface-2 px-1.5 py-1.5">
                <a
                  href={col.tactic.url ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-[11px] font-semibold leading-tight hover:underline"
                >
                  {col.tactic.name}
                </a>
                <div className="text-[10px] text-muted tabular-nums">
                  {used}/{col.cells.length} usate
                </div>
              </div>
              {col.cells.map((cell) => {
                const tag = mode === "compare" ? compareTag(cell.flags) : null;
                return (
                  <a
                    key={cell.technique.id}
                    href={`https://attack.mitre.org/techniques/${cell.technique.external_id}/`}
                    target="_blank"
                    rel="noreferrer"
                    title={tooltip(cell, mode)}
                    style={cellStyle(cell.flags, mode)}
                    className="block rounded border border-line px-1.5 py-1 text-[11px] leading-tight hover:outline hover:outline-1 hover:outline-fg"
                  >
                    <span className="flex items-start justify-between gap-1">
                      <span className="line-clamp-2">{cell.technique.name}</span>
                      {tag && <span className="shrink-0 font-mono text-[9px] font-bold">{tag}</span>}
                    </span>
                    {cell.subs.length > 0 && (
                      <span className="mt-0.5 block font-mono text-[9px] opacity-80">
                        +{cell.subs.length} sotto-tecnic{cell.subs.length === 1 ? "a" : "he"}
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Swatch({ style, label }: { style: CSSProperties; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="inline-block size-3 rounded-sm" style={style} />
      {label}
    </span>
  );
}

export function MatrixLegend({ mode, nameA, nameB }: { mode: Mode; nameA?: string; nameB?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      {mode === "single" ? (
        <>
          <Swatch style={{ background: "var(--use-direct)" }} label="Uso diretto documentato" />
          <Swatch style={{ background: "var(--use-soft)" }} label="Solo tramite software usato dal gruppo" />
        </>
      ) : (
        <>
          <Swatch style={{ background: "var(--cmp-a)" }} label={`A · ${nameA ?? "attore A"}`} />
          <Swatch style={{ background: "var(--cmp-b)" }} label={`B · ${nameB ?? "attore B"}`} />
          <Swatch style={{ background: "var(--cmp-both)" }} label="A+B · entrambi" />
        </>
      )}
      <Swatch style={{ background: "var(--surface)", border: "1px solid var(--line)" }} label="Non osservata" />
      <span>Le sotto-tecniche sono aggregate sulla tecnica padre (dettaglio al passaggio del mouse).</span>
    </div>
  );
}
