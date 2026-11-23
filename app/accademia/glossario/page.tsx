import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/primitives";
import { getLesson } from "@/lib/academy";
import { GLOSSARY } from "@/lib/academy/glossary";

export const metadata: Metadata = { title: "Glossario · Accademia" };

export default function GlossarioPage() {
  const terms = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term, "it"));
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/accademia" className="text-sm text-muted hover:underline">← Accademia</Link>
      <PageHeader title="Glossario">I termini che un analista CTI deve saper spiegare in una frase, con il rimando alla lezione.</PageHeader>
      <dl className="divide-y divide-line rounded-lg border border-line bg-surface">
        {terms.map((t) => (
          <div key={t.term} className="grid gap-1 px-4 py-3 sm:grid-cols-[220px_1fr] sm:gap-4">
            <dt className="text-sm font-semibold">{t.term}</dt>
            <dd className="text-sm text-muted">
              {t.def}
              {t.lesson && (
                <Link href={`/accademia/${t.lesson}`} className="ml-1 whitespace-nowrap text-accent hover:underline">
                  → {getLesson(t.lesson)?.title.split(":")[0]}
                </Link>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
