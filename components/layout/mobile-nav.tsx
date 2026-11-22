"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AccountCard } from "./account-badge";
import { NavLinks } from "./nav-links";
import { Brand } from "./brand";

/** Barra in alto su schermi stretti, con il menu completo in un pannello a scomparsa. */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur lg:hidden">
      <Brand compact />
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Apri il menu"
        aria-expanded={open}
        className="grid size-9 place-items-center rounded-md border border-line text-muted hover:bg-surface-2 hover:text-fg"
      >
        <Menu aria-hidden className="size-4" />
      </button>

      {/* Portale su <body>: il backdrop-blur della barra creerebbe un contenitore per i "fixed". */}
      {open && createPortal(
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Chiudi il menu" onClick={close} className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <Brand />
              <button
                type="button"
                onClick={close}
                aria-label="Chiudi il menu"
                className="grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-fg"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
            <nav aria-label="Principale" className="flex-1 overflow-y-auto px-3 py-4">
              <NavLinks onNavigate={close} />
            </nav>
            <div className="border-t border-line p-3">
              <AccountCard onNavigate={close} />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
