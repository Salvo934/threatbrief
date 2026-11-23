"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Progressi dell'Accademia salvati solo nel browser (localStorage): lezioni completate e
 * stato delle schede di allenamento. Se lo storage non è disponibile (navigazione privata,
 * dati cancellati) l'Accademia funziona lo stesso, senza memoria.
 */
const KEY = "threatbrief-accademia-v1";

export type Progress = { done: string[]; cards: Record<string, "known" | "review"> };
const EMPTY: Progress = { done: [], cards: {} };

function read(): Progress {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw) as Partial<Progress>;
    return { done: Array.isArray(p.done) ? p.done : [], cards: p.cards && typeof p.cards === "object" ? p.cards : {} };
  } catch {
    return EMPTY;
  }
}

function write(p: Progress) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
    window.dispatchEvent(new Event(KEY));
  } catch {
    // storage non disponibile: i progressi restano solo in questa pagina
  }
}

/** `null` finché non è stato letto il browser (evita differenze tra server e client). */
export function useProgress() {
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    const sync = () => setProgress(read());
    sync();
    window.addEventListener(KEY, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(KEY, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((fn: (p: Progress) => Progress) => {
    const next = fn(read());
    setProgress(next);
    write(next);
  }, []);

  return { progress, update };
}
