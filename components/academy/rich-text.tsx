import { Fragment } from "react";
import type { Block } from "@/lib/academy/types";

/** Grassetto (**…**) e codice (`…`) inline: niente HTML, niente dipendenze. */
export function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") ? (
          <strong key={i} className="font-semibold text-fg">{p.slice(2, -2)}</strong>
        ) : p.startsWith("`") ? (
          <code key={i} className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.85em]">{p.slice(1, -1)}</code>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((b, i) => {
        if (typeof b === "string") return <p key={i}><Inline text={b} /></p>;
        if ("list" in b) {
          const Tag = b.ordered ? "ol" : "ul";
          return (
            <Tag key={i} className={`space-y-1 pl-5 ${b.ordered ? "list-decimal" : "list-disc"}`}>
              {b.list.map((item, j) => <li key={j}><Inline text={item} /></li>)}
            </Tag>
          );
        }
        if ("table" in b) {
          return (
            <div key={i} className="overflow-x-auto rounded-md border border-line">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-left text-xs text-muted">
                  <tr>{b.table.head.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-line align-top">
                  {b.table.rows.map((row, r) => (
                    <tr key={r}>{row.map((cell, c) => <td key={c} className="px-3 py-2"><Inline text={cell} /></td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <div key={i} className={`rounded-md border-l-2 px-3 py-2 ${b.tone === "warn" ? "border-warn-text bg-warn-bg text-warn-text" : "border-accent bg-accent-soft"}`}>
            <Inline text={b.note} />
          </div>
        );
      })}
    </div>
  );
}
