import { Shield } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { D3FEND_TACTICS, D3FEND_TACTIC_IT, getD3fendFor } from "@/lib/data/d3fend";

/**
 * Contromisure MITRE D3FEND per le tecniche di un attore: per categoria (rafforzare,
 * rilevare, isolare…), ordinate per quante tecniche coprono. Nomi D3FEND nell'originale.
 */
export async function D3fendPanel({ techniques, perTactic = 5 }: { techniques: string[]; perTactic?: number }) {
  const measures = await getD3fendFor(techniques);
  if (!measures.length) return null;
  const covered = new Set(measures.flatMap((m) => m.techniques)).size;
  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          <Shield aria-hidden className="size-4 text-ok" />
          Contromisure MITRE D3FEND
        </span>
      }
    >
      <p className="mb-3 text-sm text-muted">
        D3FEND è il catalogo MITRE delle tecniche difensive, collegate alle tecniche d&apos;attacco ATT&CK. Qui: le contromisure che
        riguardano più tecniche di questo attore ({covered} delle {techniques.length} hanno una mappatura D3FEND).
      </p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {D3FEND_TACTICS.map((t) => {
          const list = measures.filter((m) => m.tactic === t).slice(0, perTactic);
          if (!list.length) return null;
          return (
            <div key={t} className="rounded-md border border-line p-3">
              <p className="text-sm font-semibold">
                {D3FEND_TACTIC_IT[t].name} <span className="text-xs font-normal text-muted">· {t}</span>
              </p>
              <p className="text-xs text-muted">{D3FEND_TACTIC_IT[t].hint}</p>
              <ul className="mt-2 space-y-1 text-xs">
                {list.map((m) => (
                  <li key={m.id} className="flex justify-between gap-2">
                    <a href={`https://d3fend.mitre.org/technique/d3f:${m.iri}/`} target="_blank" rel="noreferrer" className="hover:underline">
                      <span className="font-mono text-muted">{m.id}</span> {m.label}
                    </a>
                    <span className="shrink-0 tabular-nums text-muted" title={m.techniques.join(", ")}>{m.techniques.length} tecn.</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">Fonte: MITRE D3FEND (API ufficiale), aggiornata ogni settimana.</p>
    </Card>
  );
}
