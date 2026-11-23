import { ArrowLeft, Briefcase, CalendarClock, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Blocks } from "@/components/academy/rich-text";
import { PageHeader } from "@/components/ui/primitives";
import { CASES } from "@/lib/academy";
import { REALITY } from "@/lib/academy/field/routine";
import type { FieldCase } from "@/lib/academy/types";

export const metadata: Metadata = { title: "Sul campo · Accademia" };

const FREQ_ORDER: FieldCase["frequency"][] = ["Ogni giorno", "Ogni settimana", "Più volte al mese", "Raro, ma capita"];

export default function SulCampoPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-2">
        <Link href="/accademia" className="inline-flex items-center gap-1 text-sm text-muted hover:underline">
          <ArrowLeft aria-hidden className="size-3.5" /> Accademia
        </Link>
        <PageHeader title="Sul campo: com'è davvero il lavoro">
          Cosa fa un analista CTI nella grande maggioranza dei giorni, e i casi pratici più frequenti, passo per passo: chi
          chiede, cosa fai, in quanto tempo, cosa consegni. Gli esempi di prodotto sono simulati (domini e IP di esempio);
          gli eventi citati come «esempio reale» sono pubblici e linkati alla fonte.
        </PageHeader>
      </div>

      {REALITY.map((s) => (
        <section key={s.title} className="space-y-3">
          <h2 className="text-lg font-semibold">{s.title}</h2>
          <Blocks blocks={s.blocks} />
        </section>
      ))}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">I casi più frequenti</h2>
        <p className="text-sm text-muted">In ordine di frequenza. Ognuno ha i passi con i tempi, un esempio di prodotto finale, gli errori tipici e le domande da colloquio (anche nell&apos;Allenamento).</p>
        {FREQ_ORDER.map((freq) => {
          const cases = CASES.filter((c) => c.frequency === freq);
          if (!cases.length) return null;
          return (
            <div key={freq} className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                <CalendarClock aria-hidden className="size-3.5" /> {freq}
              </h3>
              <ul className="grid gap-2 md:grid-cols-2">
                {cases.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/accademia/sul-campo/${c.slug}`} className="flex h-full gap-3 rounded-lg border border-line bg-surface p-4 hover:border-accent">
                      <Briefcase aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" />
                      <span className="min-w-0">
                        <span className="block font-medium leading-snug">{c.title}</span>
                        <span className="mt-1 block text-sm text-muted">{c.summary}</span>
                        <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted">
                          <UserRound aria-hidden className="size-3.5" /> {c.requester}
                          {c.realExample && <span className="ml-2 rounded bg-accent-soft px-1.5 py-0.5 text-accent">esempio reale</span>}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
