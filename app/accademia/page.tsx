import { BookOpen, Clock, Layers, MessagesSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LessonCheck, PathProgress } from "@/components/academy/progress-widgets";
import { PageHeader } from "@/components/ui/primitives";
import { CARDS, GROUPS, LESSONS } from "@/lib/academy";
import { GLOSSARY } from "@/lib/academy/glossary";

export const metadata: Metadata = { title: "Accademia" };

const GROUP_HINT: Record<(typeof GROUPS)[number], string> = {
  Fondamenti: "Cos'è il mestiere e da dove arrivano le informazioni",
  Tecnica: "Framework, indicatori, attori e strumenti",
  Metodo: "Come si ragiona e come si scrive",
  Contesto: "Ransomware e normativa italiana ed europea",
  Colloquio: "Arrivare pronti",
};

export default function AccademiaPage() {
  const totalMinutes = LESSONS.reduce((s, l) => s + l.minutes, 0);
  return (
    <div className="space-y-6">
      <PageHeader title="Accademia: il mestiere dell'analista CTI">
        Un percorso in {LESSONS.length} lezioni per imparare la Cyber Threat Intelligence e arrivare pronti a un colloquio.
        Ogni lezione unisce teoria essenziale, esercizi sui dati reali di ThreatBrief e le domande che fanno davvero, con
        una risposta modello da ripetere a parole tue.
      </PageHeader>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PathProgress total={LESSONS.length} cards={CARDS.length} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/accademia/allenamento" className="rounded-lg border border-line bg-surface p-4 hover:border-accent">
            <MessagesSquare aria-hidden className="size-5 text-accent" />
            <div className="mt-2 text-sm font-medium">Allenamento</div>
            <div className="text-xs text-muted">{CARDS.length} domande da colloquio</div>
          </Link>
          <Link href="/accademia/glossario" className="rounded-lg border border-line bg-surface p-4 hover:border-accent">
            <BookOpen aria-hidden className="size-5 text-accent" />
            <div className="mt-2 text-sm font-medium">Glossario</div>
            <div className="text-xs text-muted">{GLOSSARY.length} termini</div>
          </Link>
        </div>
      </div>

      <p className="flex items-center gap-2 text-sm text-muted">
        <Layers aria-hidden className="size-4" /> Circa {Math.round(totalMinutes / 60)} ore di studio, più gli esercizi. Consiglio: una o due lezioni a settimana, con l&apos;esercizio fatto per davvero.
      </p>

      {GROUPS.map((group) => {
        const lessons = LESSONS.map((l, i) => ({ ...l, n: i + 1 })).filter((l) => l.group === group);
        return (
          <section key={group} className="space-y-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">{group}</h2>
              <p className="text-xs text-muted">{GROUP_HINT[group]}</p>
            </div>
            <ul className="grid gap-2 md:grid-cols-2">
              {lessons.map((l) => (
                <li key={l.slug}>
                  <Link href={`/accademia/${l.slug}`} className="flex h-full items-start gap-3 rounded-lg border border-line bg-surface p-4 hover:border-accent">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{l.n}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium leading-snug">{l.title}</span>
                      <span className="mt-1 block text-sm text-muted">{l.summary}</span>
                      <span className="mt-2 flex items-center gap-3 text-xs text-muted">
                        <span className="inline-flex items-center gap-1"><Clock aria-hidden className="size-3.5" />{l.minutes} min</span>
                        <span>{l.interview.length} domande</span>
                      </span>
                    </span>
                    <LessonCheck slug={l.slug} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
