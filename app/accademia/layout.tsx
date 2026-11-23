import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { getViewer } from "@/lib/supabase/server";

/** Accademia e Sul campo: area personale di formazione, visibile solo all'analista. */
export default function AccademiaLayout({ children }: LayoutProps<"/accademia">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

async function Gate({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (viewer?.isAnalyst) return <>{children}</>;
  return (
    <EmptyState>
      L&apos;Accademia è l&apos;area personale di formazione dell&apos;analista.{" "}
      {!viewer && <><Link href="/login?next=/accademia" className="underline">Accedi</Link> · </>}
      Per vedere cosa dimostra questo progetto, apri <Link href="/competenze" className="underline">Cosa dimostra</Link>.
    </EmptyState>
  );
}
