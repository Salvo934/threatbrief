import { Bot, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActionForm } from "@/components/report/action-form";
import { DigestText } from "@/components/digest/digest-text";
import { GenerateButton } from "@/components/digest/generate-button";
import { ReviewForm } from "@/components/digest/review-form";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { composeDigest } from "@/lib/digest/compose";
import { PRIORITY_LABEL, SECTION_LABEL, SECTION_ORDER, type DigestItem, type DigestReview } from "@/lib/digest/types";
import { formatDateTime } from "@/lib/format";
import { getViewer, sessionDb } from "@/lib/supabase/server";
import { markReviewed, publishBriefing, unpublishBriefing } from "../actions";

type Props = PageProps<"/digest/[date]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Digest ${(await params).date}` };
}

export default function DigestPage(props: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-[700px]" />}>
      <Digest params={props.params} />
    </Suspense>
  );
}

const SUGGESTED_TONE = { azione: "warn", monitorare: "neutral", info: "neutral" } as const;

async function Digest({ params }: Pick<Props, "params">) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const viewer = await getViewer();
  if (!viewer?.isAnalyst) {
    return <EmptyState>Area riservata all&apos;analista. <Link href={`/login?next=/digest/${date}`} className="underline">Accedi</Link></EmptyState>;
  }
  const db = await sessionDb();
  const { data: digest } = await db
    .from("digests")
    .select("id, digest_date, generated_at, generated_by, window_start, window_end, items, status, reviewed_at")
    .eq("digest_date", date)
    .maybeSingle();
  if (!digest) notFound();
  const items = (digest.items ?? []) as DigestItem[];
  const { data: reviewRows } = await db.from("digest_reviews").select("item_key, priority, relevance, action").eq("digest_id", digest.id);
  const reviews = (reviewRows ?? []) as DigestReview[];
  const byKey = new Map(reviews.map((r) => [r.item_key, r]));
  const { data: published } = await db.from("briefings").select("title, intro, published_at").eq("brief_date", date).maybeSingle();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
  const pretty = new Date(`${date}T12:00:00Z`).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Link href="/digest" className="text-sm text-muted hover:underline">← Digest</Link>
        <h1 className="text-2xl font-semibold tracking-tight">Digest di {pretty}</h1>
        <p className="text-sm text-muted">
          Finestra {formatDateTime(digest.window_start)} → {formatDateTime(digest.window_end)} · {items.length} elementi ·{" "}
          {reviews.length} rivisti
        </p>
      </div>

      {digest.status !== "rivisto" && (
        <div className="flex items-start gap-3 rounded-lg border border-warn-text/40 bg-warn-bg px-4 py-3 text-sm text-warn-text">
          <Bot aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Bozza automatica — da verificare</p>
            <p>
              Fatti e priorità suggerite sono generati da regole sui dati raccolti ({digest.generated_by}, {formatDateTime(digest.generated_at)}).
              Per ogni elemento scegli la priorità e scrivi perché ci riguarda e cosa fare. Gli elementi non rivisti non entrano nel testo finale.
            </p>
          </div>
        </div>
      )}

      {date === today && <GenerateButton label="Rigenera con i dati più recenti (le revisioni restano)" />}

      {items.length === 0 && <EmptyState>Nessuna novità nella finestra: anche questo è un digest («nessun elemento rilevante»).</EmptyState>}

      {SECTION_ORDER.map((section) => {
        const list = items.filter((i) => i.section === section);
        if (!list.length) return null;
        return (
          <section key={section} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">{SECTION_LABEL[section]} ({list.length})</h2>
            {list.map((item) => {
              const review = byKey.get(item.key);
              return (
                <div key={item.key} className={`rounded-lg border bg-surface p-4 ${review?.priority === "escludi" ? "border-line opacity-60" : review ? "border-accent/50" : "border-line"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium">{item.title}</p>
                    {review ? (
                      <Badge tone={review.priority === "azione" ? "warn" : review.priority === "escludi" ? "neutral" : "accent"}>{PRIORITY_LABEL[review.priority]}</Badge>
                    ) : (
                      <Badge tone={SUGGESTED_TONE[item.suggested]}>suggerita: {PRIORITY_LABEL[item.suggested]}</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm">{item.facts}</p>
                  <p className="mt-1 text-xs text-muted">
                    Motivo del suggerimento: {item.reason}{" "}
                    {item.source.url && (
                      item.source.url.startsWith("http") ? (
                        <a href={item.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-accent hover:underline">
                          {item.source.name} <ExternalLink aria-hidden className="size-3" />
                        </a>
                      ) : (
                        <Link href={item.source.url} className="text-accent hover:underline">{item.source.name}</Link>
                      )
                    )}
                  </p>
                  <ReviewForm digestId={digest.id} itemKey={item.key} suggested={item.suggested} review={review} />
                </div>
              );
            })}
          </section>
        );
      })}

      <Card title="Testo finale (solo elementi rivisti)">
        <DigestText text={composeDigest(date, items, reviews)} />
        <div className="mt-4 border-t border-line pt-3">
          <ActionForm action={markReviewed} submit={digest.status === "rivisto" ? "Riporta in bozza" : "Segna il digest come rivisto"} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="digest_date" value={date} />
            <input type="hidden" name="status" value={digest.status === "rivisto" ? "bozza" : "rivisto"} />
          </ActionForm>
        </div>
      </Card>

      <Card title="Pubblica come briefing pubblico (TLP:CLEAR)">
        {published ? (
          <p className="mb-3 text-sm">
            Pubblicato il {formatDateTime(published.published_at)} come «{published.title}». Ripubblicando aggiorni i contenuti.{" "}
            <Link href={`/briefing/${date}`} className="text-accent hover:underline">Vedi la pagina pubblica</Link>
          </p>
        ) : (
          <p className="mb-3 text-sm text-muted">
            Il briefing pubblico mostra al massimo 5 punti tra quelli che hai rivisto (non esclusi), in ordine di priorità, con i
            tuoi testi. Compare nella home e in /briefing.
          </p>
        )}
        {digest.status !== "rivisto" ? (
          <p className="text-sm text-muted">Per pubblicare, prima segna il digest come rivisto.</p>
        ) : (
          <ActionForm action={publishBriefing} submit={published ? "Aggiorna il briefing pubblico" : "Pubblica il briefing"}>
            <input type="hidden" name="digest_date" value={date} />
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted">Titolo</span>
              <input name="title" maxLength={160} defaultValue={published?.title ?? ""} placeholder={`Briefing del ${date.split("-").reverse().join("/")}`} className="w-full rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted">Introduzione (facoltativa, max 600 caratteri)</span>
              <textarea name="intro" maxLength={600} rows={2} defaultValue={published?.intro ?? ""} className="w-full rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm" />
            </label>
            <label className="flex items-start gap-2 rounded-md border border-warn-text/40 bg-warn-bg px-3 py-2 text-sm text-warn-text">
              <input type="checkbox" name="clear_ok" className="mt-1" />
              <span>
                Ho riletto «perché ci riguarda» e «cosa fare»: non contengono informazioni interne (clienti, sistemi, fornitori) e
                possono essere pubblicati come <strong>TLP:CLEAR</strong>.
              </span>
            </label>
          </ActionForm>
        )}
        {published && (
          <div className="mt-3 border-t border-line pt-3">
            <ActionForm action={unpublishBriefing} submit="Ritira il briefing pubblico" danger confirm="Ritirare il briefing dalla pagina pubblica?">
              <input type="hidden" name="digest_date" value={date} />
            </ActionForm>
          </div>
        )}
      </Card>
    </div>
  );
}
