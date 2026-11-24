import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Assistant } from "@/components/assistant/assistant";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { getViewer } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Chiedi a ThreatBrief",
  description: "Domande in linguaggio naturale sui dati dell'app, con risposte verificate e fonti citate.",
};

const TOOLS = [
  ["Rivendicazioni", "Italia e mondo, per gruppo, settore e paese"],
  ["Catalogo KEV", "vulnerabilità sfruttate, per fornitore, prodotto e uso ransomware"],
  ["Gruppi e tecniche ATT&CK", "profili, tattiche, software, mitigazioni e contromisure D3FEND"],
  ["Rapporti della notte", "cosa è successo nel mondo nelle ultime 24 ore"],
  ["Difesa e aerospazio", "avvisi ufficiali rilevanti per il settore"],
  ["Indicatori", "IP, domini, URL e hash raccolti da ThreatFox, URLhaus e OTX"],
  ["Report pubblicati", "i report dell'analista"],
] as const;

export default function AssistantPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Chiedi a ThreatBrief">
        Fai una domanda in italiano: l&apos;assistente sceglie quali dati dell&apos;app consultare, li legge e risponde
        citando le fonti. Un controllo automatico verifica che <strong>ogni numero</strong> della risposta compaia nei dati
        consultati e che ogni citazione rimandi a una fonte reale; se non torna, la risposta viene corretta o segnalata.
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Gate />
      </Suspense>
      <Card title="Cosa può consultare">
        <ul className="space-y-1 text-sm">
          {TOOLS.map(([n, w]) => <li key={n}><strong>{n}</strong>: {w}.</li>)}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Solo letture: l&apos;assistente non modifica nulla e non naviga sul web. Le rivendicazioni restano dichiarazioni
          dei gruppi, non verificate; i collegamenti tra malware e gruppi sono indizi, non attribuzioni.
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
        L&apos;assistente usa un modello a pagamento ed è riservato all&apos;analista.{" "}
        {!viewer && <Link href="/login?next=/assistente" className="underline">Accedi</Link>}
      </EmptyState>
    );
  }
  return <Assistant />;
}
