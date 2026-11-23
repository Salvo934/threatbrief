import type { Metadata } from "next";
import Link from "next/link";
import { Flashcards } from "@/components/academy/flashcards";
import { PageHeader } from "@/components/ui/primitives";
import { CARDS, CASES, LESSONS } from "@/lib/academy";

export const metadata: Metadata = { title: "Allenamento · Accademia" };

export default function AllenamentoPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/accademia" className="text-sm text-muted hover:underline">← Accademia</Link>
      <PageHeader title="Allenamento per il colloquio">
        Leggi la domanda e rispondi <strong>a voce</strong>, come se fossi al colloquio. Poi apri la risposta modello e
        sii onesto: se non l&apos;avresti detta in modo chiaro, segnala «da ripassare». Le domande difficili tornano nel
        filtro «Da ripassare».
      </PageHeader>
      <Flashcards
        cards={CARDS}
        groups={[
          ...LESSONS.map((l) => ({ id: l.slug, title: l.title })),
          ...CASES.map((c) => ({ id: `campo:${c.slug}`, title: `Sul campo · ${c.title}` })),
        ]}
      />
    </div>
  );
}
