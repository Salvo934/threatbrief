import { AlertTriangle, ArrowLeft, ArrowRight, BookMarked, Clock, PenLine, Target, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkDone } from "@/components/academy/progress-widgets";
import { Blocks, Inline } from "@/components/academy/rich-text";
import { Card } from "@/components/ui/primitives";
import { LESSONS, getLesson } from "@/lib/academy";

type Props = PageProps<"/accademia/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return { title: lesson ? `${lesson.title} · Accademia` : "Accademia" };
}

export default async function LessonPage({ params }: Props) {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) notFound();
  const i = LESSONS.indexOf(lesson);
  const prev = LESSONS[i - 1];
  const next = LESSONS[i + 1];

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Link href="/accademia" className="inline-flex items-center gap-1 text-sm text-muted hover:underline">
          <ArrowLeft aria-hidden className="size-3.5" /> Accademia
        </Link>
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Lezione {i + 1} di {LESSONS.length} · {lesson.group}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{lesson.title}</h1>
        <p className="text-muted">{lesson.summary}</p>
        <p className="inline-flex items-center gap-1 text-xs text-muted"><Clock aria-hidden className="size-3.5" /> circa {lesson.minutes} minuti</p>
      </div>

      <Card title={<span className="inline-flex items-center gap-2"><Target aria-hidden className="size-4 text-accent" />Alla fine saprai</span>}>
        <ul className="list-disc space-y-1 pl-5 text-sm">{lesson.goals.map((g) => <li key={g}>{g}</li>)}</ul>
      </Card>

      {lesson.sections.map((s) => (
        <section key={s.title} className="space-y-3">
          <h2 className="text-lg font-semibold">{s.title}</h2>
          <Blocks blocks={s.blocks} />
        </section>
      ))}

      <Card title={<span className="inline-flex items-center gap-2"><Wrench aria-hidden className="size-4 text-accent" />Prova nell&apos;app</span>}>
        <ul className="space-y-3 text-sm">
          {lesson.practice.map((p) => (
            <li key={p.href}>
              <Link href={p.href} className="font-medium text-accent hover:underline">{p.label} →</Link>
              <p className="mt-0.5 text-muted">{p.task}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card title={<span className="inline-flex items-center gap-2"><PenLine aria-hidden className="size-4 text-accent" />Esercizio</span>}>
        <p className="text-sm leading-relaxed"><Inline text={lesson.exercise} /></p>
      </Card>

      <Card title={<span className="inline-flex items-center gap-2"><AlertTriangle aria-hidden className="size-4 text-warn-text" />Errori da evitare</span>}>
        <ul className="list-disc space-y-1 pl-5 text-sm">{lesson.pitfalls.map((p) => <li key={p}><Inline text={p} /></li>)}</ul>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Domande da colloquio</h2>
        <p className="text-sm text-muted">Prova a rispondere a voce prima di aprire la risposta modello. Poi allenati con le <Link href="/accademia/allenamento" className="underline">schede</Link>.</p>
        <div className="space-y-2">
          {lesson.interview.map((item) => (
            <details key={item.q} className="group rounded-lg border border-line bg-surface open:border-accent">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium marker:hidden">
                <span className="mr-2 text-accent group-open:hidden">+</span>
                <span className="mr-2 hidden text-accent group-open:inline">−</span>
                {item.q}
              </summary>
              <p className="border-t border-line px-4 py-3 text-sm leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <Card title={<span className="inline-flex items-center gap-2"><BookMarked aria-hidden className="size-4 text-accent" />Per approfondire</span>}>
        <ul className="space-y-1.5 text-sm">
          {lesson.sources.map((s) => (
            <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">{s.title}</a></li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <MarkDone slug={lesson.slug} />
        <div className="flex gap-2 text-sm">
          {prev && (
            <Link href={`/accademia/${prev.slug}`} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-2 hover:bg-surface-2">
              <ArrowLeft aria-hidden className="size-4" /> Precedente
            </Link>
          )}
          {next && (
            <Link href={`/accademia/${next.slug}`} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-2 hover:bg-surface-2">
              Successiva <ArrowRight aria-hidden className="size-4" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
