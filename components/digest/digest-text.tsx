"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** Testo finale del digest, pronto da copiare e inviare. */
export function DigestText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="space-y-2">
      <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface-2">
        {copied ? <Check aria-hidden className="size-4 text-ok" /> : <Copy aria-hidden className="size-4" />}
        {copied ? "Copiato" : "Copia il testo"}
      </button>
      <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap rounded-md border border-line bg-bg p-3 font-mono text-xs leading-relaxed">{text}</pre>
    </div>
  );
}
