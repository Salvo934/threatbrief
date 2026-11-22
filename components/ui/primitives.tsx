import type { ReactNode } from "react";

export function PageHeader({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {children && <div className="max-w-3xl text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Card({ title, action, children, className = "" }: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-line bg-surface ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

const BADGE = {
  neutral: "border-line bg-surface-2 text-muted",
  accent: "border-transparent bg-accent-soft text-accent",
  warn: "border-transparent bg-warn-bg text-warn-text",
} as const;

export function Badge({ children, tone = "neutral", title }: {
  children: ReactNode;
  tone?: keyof typeof BADGE;
  title?: string;
}) {
  return (
    <span title={title} className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] leading-none ${BADGE[tone]}`}>
      {children}
    </span>
  );
}

export function Skeleton({ className = "h-40" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-surface-2 ${className}`} />;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">{children}</p>;
}
