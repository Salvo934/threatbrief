import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OsintTool } from "@/components/osint/osint-tool";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { getViewer } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Indagine OSINT",
  description: "Indagine passiva su domini, IP, URL e hash, con registro di ricerca riproducibile.",
};

const SOURCES = [
  ["RDAP", "chi ha registrato il dominio e quando; a chi appartiene la rete di un IP"],
  ["DNS pubblico (Cloudflare)", "a quali IP punta, server di posta, name server, record di testo"],
  ["Certificate Transparency (crt.sh)", "certificati emessi: sottodomini e storia del dominio"],
  ["Shodan InternetDB", "porte aperte e vulnerabilità note di un IP, già raccolte da Shodan"],
  ["ThreatBrief", "indicatori già segnalati da ThreatFox, URLhaus e OTX; gruppi collegati; CVE nel catalogo KEV"],
] as const;

export default function OsintPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Indagine OSINT">
        Inserisci un dominio, un IP, un URL o un hash: lo strumento interroga fonti aperte in modo <strong>passivo</strong> (il
        bersaglio non viene mai contattato), calcola segnali di rischio motivati, propone i collegamenti per proseguire
        l&apos;indagine e salva tutto in un registro riproducibile, esportabile in CSV, JSON e STIX.
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Gate />
      </Suspense>
      <Card title="Fonti e metodo">
        <ul className="space-y-1 text-sm">
          {SOURCES.map(([n, w]) => <li key={n}><strong>{n}</strong>: {w}.</li>)}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Solo infrastruttura, mai persone: niente ricerche su nomi, email o profili social. Il giudizio («malevolo»,
          «sospetto», «nessuna evidenza») è sempre motivato e accompagnato dal codice Admiralty; «nessuna evidenza» non
          significa «sicuro». Ogni fonte interrogata è registrata con URL, esito e ora di consultazione.
        </p>
      </Card>
    </div>
  );
}

async function Gate() {
  const viewer = await getViewer();
  if (!viewer?.isAnalyst) {
    return (
      <EmptyState>
        Lo strumento usa servizi esterni ed è riservato all&apos;analista.{" "}
        {!viewer && <Link href="/login?next=/osint" className="underline">Accedi</Link>}
      </EmptyState>
    );
  }
  return <OsintTool />;
}
