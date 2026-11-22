import type { ReactNode } from "react";

export const inputClass = "w-full rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm";

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}
