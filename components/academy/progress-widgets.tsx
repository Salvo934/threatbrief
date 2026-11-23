"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { useProgress } from "@/lib/academy/progress";

/** Barra di avanzamento del percorso (lezioni completate). */
export function PathProgress({ total, cards }: { total: number; cards: number }) {
  const { progress } = useProgress();
  const done = progress?.done.length ?? 0;
  const known = progress ? Object.values(progress.cards).filter((v) => v === "known").length : 0;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">Il tuo percorso</span>
        <span className="tabular-nums text-muted">
          {progress === null ? "…" : `${done}/${total} lezioni · ${known}/${cards} domande sapute`}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">I progressi restano salvati solo in questo browser.</p>
    </div>
  );
}

/** Spunta accanto alla lezione nell'indice. */
export function LessonCheck({ slug }: { slug: string }) {
  const { progress } = useProgress();
  const done = progress?.done.includes(slug);
  return done ? (
    <CheckCircle2 aria-label="Completata" className="size-5 shrink-0 text-ok" />
  ) : (
    <Circle aria-label="Da fare" className="size-5 shrink-0 text-line" />
  );
}

/** Pulsante per segnare la lezione come completata (o riaprirla). */
export function MarkDone({ slug }: { slug: string }) {
  const { progress, update } = useProgress();
  if (progress === null) return <span className="inline-block h-9 w-48 animate-pulse rounded-md bg-surface-2" />;
  const done = progress.done.includes(slug);
  return (
    <button
      type="button"
      onClick={() =>
        update((p) => ({ ...p, done: done ? p.done.filter((s) => s !== slug) : [...p.done, slug] }))
      }
      className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
        done ? "border border-line text-muted hover:bg-surface-2" : "bg-accent text-white hover:opacity-90"
      }`}
    >
      <CheckCircle2 aria-hidden className="size-4" />
      {done ? "Completata · segna da rifare" : "Segna come completata"}
    </button>
  );
}
