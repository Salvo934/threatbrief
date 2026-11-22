import Link from "next/link";
import { Badge, Card } from "@/components/ui/primitives";
import type { AnalysisResult, IocFinding, IocStatus } from "@/lib/analysis/types";
import { formatDate, formatDateTime, sourceName } from "@/lib/format";

const STATUS: Record<IocStatus, { label: string; tone: "neutral" | "accent" | "warn"; help: string }> = {
  nuovo: { label: "Nuovo", tone: "neutral", help: "Non presente nelle fonti raccolte" },
  visto: { label: "Già visto", tone: "accent", help: "Presente in almeno una fonte" },
  collegato: { label: "Collegato", tone: "warn", help: "Associato a software o attori ATT&CK" },
};

const METHOD_LABEL = { id: "ID esplicito", nome: "nome della tecnica", "parola chiave": "parola chiave" } as const;

function Seen({ f }: { f: IocFinding }) {
  if (f.kev) {
    return (
      <span>
        In CISA KEV dal {formatDate(f.kev.date_added)}
        {f.kev.known_ransomware_use && <> · <Badge tone="warn">uso ransomware noto</Badge></>}
        <span className="block text-muted">{f.kev.vulnerability_name}</span>
      </span>
    );
  }
  if (!f.sources.length) return <span className="text-muted">—</span>;
  return (
    <span>
      {f.sources.map(sourceName).join(", ")}
      <span className="block text-muted tabular-nums">
        {formatDate(f.first_seen)} → {formatDate(f.last_seen)}
      </span>
    </span>
  );
}

function Links({ f }: { f: IocFinding }) {
  if (!f.groups.length && !f.software.length && !f.malware.length) return <span className="text-muted">—</span>;
  return (
    <div className="space-y-1">
      {f.malware.length > 0 && <div>Famiglia (fonte): {f.malware.join(", ")}</div>}
      {f.software.length > 0 && <div>Software ATT&CK: {f.software.map((s) => `${s.name} (${s.external_id})`).join(", ")}</div>}
      {f.groups.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {f.groups.slice(0, 8).map((g) => (
            <Link key={g.external_id + g.via} href={`/attori/${g.external_id}`} title={`via ${g.via}`}>
              <Badge tone={g.via === "fonte" ? "accent" : "neutral"}>{g.name}</Badge>
            </Link>
          ))}
          {f.groups.length > 8 && <span className="text-muted">+{f.groups.length - 8}</span>}
        </div>
      )}
    </div>
  );
}

export function AnalysisResultView({ result }: { result: AnalysisResult }) {
  const counts = { nuovo: 0, visto: 0, collegato: 0 };
  for (const f of result.iocs) counts[f.status]++;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Analisi del {formatDateTime(result.analyzedAt)} · {result.iocs.length} IOC estratti · {counts.collegato} collegati ·{" "}
        {counts.visto} già visti · {counts.nuovo} nuovi
        {result.truncated && " · input troncato (max 500 IOC / 100.000 caratteri)"}
      </p>

      <Card title={`Indicatori (${result.iocs.length})`}>
        {result.iocs.length === 0 ? (
          <p className="text-sm text-muted">Nessun indicatore riconosciuto nel testo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">Stato</th>
                  <th className="py-1.5 pr-3 font-medium">Tipo</th>
                  <th className="py-1.5 pr-3 font-medium">Indicatore</th>
                  <th className="py-1.5 pr-3 font-medium">Fonti / periodo</th>
                  <th className="py-1.5 font-medium">Collegamenti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line align-top">
                {result.iocs.map((f) => (
                  <tr key={`${f.type}|${f.value}`}>
                    <td className="py-2 pr-3">
                      <Badge tone={STATUS[f.status].tone} title={STATUS[f.status].help}>{STATUS[f.status].label}</Badge>
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs uppercase text-muted">{f.type}</td>
                    <td className="max-w-[28rem] break-all py-2 pr-3 font-mono text-xs">{f.value}</td>
                    <td className="py-2 pr-3 text-xs"><Seen f={f} /></td>
                    <td className="py-2 text-xs"><Links f={f} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-muted">
          I gruppi in blu sono dichiarati dalla fonte (es. avversario di un pulse OTX); quelli grigi derivano dal software
          collegato (ATT&CK documenta che il gruppo lo usa): è un indizio, non un&apos;attribuzione.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`Tecniche ATT&CK suggerite (${result.techniques.length})`}>
          {result.techniques.length === 0 ? (
            <p className="text-sm text-muted">Nessuna tecnica riconosciuta nel testo.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {result.techniques.map((t) => (
                <li key={t.external_id} className="py-2">
                  <a
                    href={`https://attack.mitre.org/techniques/${t.external_id.replace(".", "/")}/`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium hover:underline"
                  >
                    <span className="font-mono text-xs text-muted">{t.external_id}</span> {t.name}
                  </a>{" "}
                  <Badge>{METHOD_LABEL[t.method]}</Badge>
                  {t.sameName && (
                    <Badge tone="warn" title="Più tecniche ATT&CK hanno questo nome: scegli in base al contesto">
                      stesso nome: {t.sameName.join(", ")}
                    </Badge>
                  )}
                  <p className="mt-0.5 text-xs text-muted">{t.evidence}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">Suggerimenti da confermare: indicano dove il testo cita la tecnica.</p>
        </Card>
        <Card title={`Software ATT&CK citati (${result.software.length})`}>
          {result.software.length === 0 ? (
            <p className="text-sm text-muted">Nessun software ATT&CK citato.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {result.software.map((s) => (
                <li key={s.external_id} className="py-2">
                  <span className="font-medium">{s.name}</span>{" "}
                  <span className="font-mono text-xs text-muted">{s.external_id}</span>
                  <p className="mt-0.5 text-xs text-muted">{s.evidence}</p>
                  {s.groups.length > 0 && (
                    <p className="mt-1 text-xs">
                      Usato da:{" "}
                      {s.groups.slice(0, 10).map((g, i) => (
                        <span key={g.external_id}>
                          {i > 0 && ", "}
                          <Link href={`/attori/${g.external_id}`} className="text-accent hover:underline">{g.name}</Link>
                        </span>
                      ))}
                      {s.groups.length > 10 && ` e altri ${s.groups.length - 10}`}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
