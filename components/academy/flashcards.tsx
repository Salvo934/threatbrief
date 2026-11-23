"use client";

import { RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Card } from "@/lib/academy";
import { useProgress } from "@/lib/academy/progress";

type Filter = "tutte" | "da-ripassare" | "nuove";

/** Allenamento a schede: domanda → risposta modello → «la sapevo» / «da ripassare». */
export function Flashcards({ cards, lessons }: { cards: Card[]; lessons: { slug: string; title: string }[] }) {
  const { progress, update } = useProgress();
  const [filter, setFilter] = useState<Filter>("tutte");
  const [lesson, setLesson] = useState("");
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);

  const deck = useMemo(() => {
    const status = progress?.cards ?? {};
    return cards.filter(
      (c) =>
        (!lesson || c.lesson === lesson) &&
        (filter === "tutte" || (filter === "da-ripassare" ? status[c.id] === "review" : !status[c.id])),
    );
  }, [cards, progress, filter, lesson]);

  const card = deck[index % Math.max(deck.length, 1)];
  const counts = useMemo(() => {
    const s = Object.values(progress?.cards ?? {});
    return { known: s.filter((v) => v === "known").length, review: s.filter((v) => v === "review").length };
  }, [progress]);

  function answer(value: "known" | "review") {
    if (!card) return;
    update((p) => ({ ...p, cards: { ...p.cards, [card.id]: value } }));
    setShown(false);
    setIndex((i) => (filter === "tutte" ? i + 1 : i)); // con i filtri la scheda esce dal mazzo da sola
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {(["tutte", "nuove", "da-ripassare"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => { setFilter(f); setIndex(0); setShown(false); }}
            className={`rounded-full border px-3 py-1 ${filter === f ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:bg-surface-2"}`}
          >
            {f === "tutte" ? "Tutte" : f === "nuove" ? "Mai viste" : "Da ripassare"}
          </button>
        ))}
        <select
          value={lesson}
          onChange={(e) => { setLesson(e.target.value); setIndex(0); setShown(false); }}
          className="rounded-md border border-line bg-surface px-2 py-1 text-sm"
          aria-label="Filtra per lezione"
        >
          <option value="">Tutte le lezioni</option>
          {lessons.map((l) => <option key={l.slug} value={l.slug}>{l.title}</option>)}
        </select>
        <span className="ml-auto text-xs tabular-nums text-muted">
          {progress === null ? "…" : `${counts.known} sapute · ${counts.review} da ripassare · ${cards.length} in tutto`}
        </span>
      </div>

      {!card ? (
        <div className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-muted">
          {filter === "da-ripassare" ? "Nessuna domanda da ripassare: ottimo lavoro." : "Nessuna domanda in questo filtro."}
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3 text-xs text-muted">
            <Link href={`/accademia/${card.lesson}`} className="hover:underline">{card.lessonTitle}</Link>
            <span className="tabular-nums">{(index % deck.length) + 1} / {deck.length}</span>
          </div>
          <p className="mt-3 text-lg font-semibold leading-snug">{card.q}</p>
          {shown ? (
            <>
              <div className="mt-4 rounded-md border-l-2 border-accent bg-accent-soft px-4 py-3 text-sm leading-relaxed">{card.a}</div>
              <p className="mt-2 text-xs text-muted">Risposta modello: ripetila a voce con parole tue, in meno di un minuto.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => answer("known")} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90">
                  <ThumbsUp aria-hidden className="size-4" /> La sapevo
                </button>
                <button type="button" onClick={() => answer("review")} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm hover:bg-surface-2">
                  <ThumbsDown aria-hidden className="size-4" /> Da ripassare
                </button>
              </div>
            </>
          ) : (
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => setShown(true)} className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90">
                Mostra la risposta
              </button>
              <button type="button" onClick={() => setIndex((i) => i + 1)} className="rounded-md border border-line px-3 py-2 text-sm text-muted hover:bg-surface-2">
                Salta
              </button>
            </div>
          )}
        </div>
      )}

      {progress && Object.keys(progress.cards).length > 0 && (
        <button
          type="button"
          onClick={() => update((p) => ({ ...p, cards: {} }))}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg"
        >
          <RotateCcw aria-hidden className="size-3.5" /> Azzera i risultati delle schede
        </button>
      )}
    </div>
  );
}
