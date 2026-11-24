import type { Metadata } from "next";
import { Suspense } from "react";
import { Monitor } from "@/components/monitor/monitor";
import { PageHeader, Skeleton } from "@/components/ui/primitives";
import { getMonitorData } from "@/lib/data/monitor";
import { countryName, formatDateTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "Monitoraggio",
  description: "Mappa delle rivendicazioni ransomware nel mondo: dove, quale gruppo, quando.",
};

export default function MonitoraggioPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Monitoraggio">
        Dove colpiscono i gruppi ransomware, chi e quando: ogni punto è una vittima dichiarata dai gruppi sui loro siti di
        rivendicazione, raccolta da ransomware.live ogni 6 ore. Il radar è centrato sull&apos;Italia.
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-[640px]" />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const { events, links, generatedAt } = await getMonitorData();
  const names: Record<string, string> = {};
  for (const e of events) if (e.country && !names[e.country]) names[e.country] = countryName(e.country);
  return (
    <>
      <Monitor events={events} links={links} countryName={names} generatedAt={generatedAt} />
      <div className="space-y-1 text-xs text-muted">
        <p>
          <strong>Come leggerla.</strong> Sono rivendicazioni pubblicate dai gruppi, <strong>non verificate</strong>: l&apos;ora è
          quella in cui la rivendicazione è stata vista, non quella dell&apos;attacco, che di solito è avvenuto giorni o settimane
          prima. Il paese è quello della vittima, non dell&apos;attaccante. Molti attacchi non vengono mai rivendicati.
        </p>
        <p>
          I nomi delle vittime non vengono salvati né mostrati. Il gruppo è collegato alla sua scheda quando esiste una scheda
          in italiano o un profilo MITRE ATT&amp;CK con lo stesso nome. Dati aggiornati alle {formatDateTime(generatedAt)}.
        </p>
      </div>
    </>
  );
}
