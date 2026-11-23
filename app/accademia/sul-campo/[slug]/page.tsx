import { AlertTriangle, ArrowLeft, ArrowRight, CalendarClock, FileText, Landmark, UserRound, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Blocks, Inline } from "@/components/academy/rich-text";
import { Badge, Card } from "@/components/ui/primitives";
import { CASES, getCase } from "@/lib/academy";

type Props = PageProps<"/accademia/sul-campo/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = getCase((await params).slug);
  return { title: c ? `${c.title} · Sul campo` : "Sul campo" };
}

export default async function CasePage({ params }: Props) {
  const { slug } = await params;
  const c = getCase(slug);
  if (!c) notFound();
  const i = CASES.indexOf(c);
  const prev = CASES[i - 1];
  const next = CASES[i + 1];

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Link href="/accademia/sul-campo" className="inline-flex items-center gap-1 text-sm text-muted hover:underline">
          <ArrowLeft aria-hidden className="size-3.5" /> Sul campo
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{c.title}</h1>
        <p className="text-muted">{c.summary}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge><CalendarClock aria-hidden className="mr-1 size-3" />{c.frequency}</Badge>
          <Badge><UserRound aria-hidden className="mr-1 size-3" />Chi chiede: {c.requester}</Badge>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">La situazione</h2>
        <Blocks blocks={c.scenario} />
      </section>

      {c.realExample && (
        <Card title={<span className="inline-flex items-center gap-2"><Landmark aria-hidden className="size-4 text-accent" />Esempio reale: {c.realExample.title}</span>}>
          <p className="text-sm leading-relaxed">{c.realExample.text}</p>
          <a href={c.realExample.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-accent hover:underline">Fonte primaria →</a>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Cosa fai, passo per passo</h2>
        <ol className="relative space-y-4 border-l border-line pl-5">
          {c.steps.map((s, n) => (
            <li key={s.title} className="relative">
              <span className="absolute -left-[29px] grid size-4 place-items-center rounded-full bg-accent text-[10px] font-semibold text-white">{n + 1}</span>
              <p className="text-xs font-medium uppercase tracking-wide text-accent">{s.when}</p>
              <p className="font-medium">{s.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted"><Inline text={s.detail} /></p>
            </li>
          ))}
        </ol>
      </section>

      <Card title={<span className="inline-flex items-center gap-2"><FileText aria-hidden className="size-4 text-accent" />Cosa consegni — {c.deliverable.title}</span>}>
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-bg p-3 font-mono text-xs leading-relaxed">{c.deliverable.text}</pre>
        <p className="mt-2 text-xs text-muted">Esempio simulato: domini .invalid e IP di documentazione (203.0.113.0/24), nessun cliente reale.</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={<span className="inline-flex items-center gap-2"><Wrench aria-hidden className="size-4 text-accent" />Strumenti</span>}>
          <ul className="list-disc space-y-1 pl-5 text-sm">{c.tools.map((t) => <li key={t}>{t}</li>)}</ul>
        </Card>
        <Card title={<span className="inline-flex items-center gap-2"><AlertTriangle aria-hidden className="size-4 text-warn-text" />Errori tipici</span>}>
          <ul className="list-disc space-y-1 pl-5 text-sm">{c.pitfalls.map((p) => <li key={p}><Inline text={p} /></li>)}</ul>
        </Card>
      </div>

      <Card title="Allenati in ThreatBrief">
        <ul className="space-y-3 text-sm">
          {c.inApp.map((p) => (
            <li key={p.href}>
              <Link href={p.href} className="font-medium text-accent hover:underline">{p.label} →</Link>
              <p className="mt-0.5 text-muted">{p.task}</p>
            </li>
          ))}
        </ul>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Domande da colloquio su questo caso</h2>
        <div className="space-y-2">
          {c.interview.map((item) => (
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

      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-5 text-sm">
        {prev && (
          <Link href={`/accademia/sul-campo/${prev.slug}`} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-2 hover:bg-surface-2">
            <ArrowLeft aria-hidden className="size-4" /> Caso precedente
          </Link>
        )}
        {next && (
          <Link href={`/accademia/sul-campo/${next.slug}`} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-2 hover:bg-surface-2">
            Caso successivo <ArrowRight aria-hidden className="size-4" />
          </Link>
        )}
      </div>
    </article>
  );
}
