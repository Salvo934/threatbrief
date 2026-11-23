import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BriefingView } from "@/components/briefing/briefing-view";
import { getBriefing } from "@/lib/data/briefings";

type Props = PageProps<"/briefing/[date]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const b = /^\d{4}-\d{2}-\d{2}$/.test(date) ? await getBriefing(date) : null;
  return { title: b?.title ?? "Briefing" };
}

export default async function BriefingPage({ params }: Props) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const briefing = await getBriefing(date);
  if (!briefing) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/briefing" className="text-sm text-muted hover:underline">← Tutti i briefing</Link>
      <BriefingView briefing={briefing} />
    </div>
  );
}
