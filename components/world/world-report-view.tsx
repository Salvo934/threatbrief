import Link from "next/link";
import { Badge, Card, Stat } from "@/components/ui/primitives";
import { D3FEND_TACTIC_IT } from "@/lib/data/d3fend";
import { countryName, formatDateTime, formatNumber } from "@/lib/format";
import { mitigationIt, tacticIt } from "@/lib/i18n/attack-it";
import { sectorRawIt } from "@/lib/threats/sectors-it";
import type { AttackRef, WorldReport } from "@/lib/world/types";

export const longDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

type Tactic = { shortname: string; external_id: string; name: string };

function AttackLink({ r }: { r: AttackRef }) {
  return r.kind === "group" ? (
    <Link href={`/attori/${r.external_id}`} className="text-accent hover:underline">{r.name} <span className="font-mono text-xs">{r.external_id}</span></Link>
  ) : (
    <a href={`https://attack.mitre.org/software/${r.external_id}/`} target="_blank" rel="noreferrer" className="text-accent hover:underline">
      {r.name} <span className="font-mono text-xs">{r.external_id}</span>
    </a>
  );
}

const th = "px-3 py-2 text-left text-xs font-medium text-muted";
const td = "px-3 py-2 align-top";

export function WorldReportView({ report, tactics }: { report: WorldReport; tactics: Tactic[] }) {
  const d = report.data;
  const tac = new Map(tactics.map((t) => [t.shortname, tacticIt(t.external_id, t.name)]));
  const nActors = d.actors.length;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-warn-bg bg-warn-bg/40 px-4 py-3 text-sm">
        <strong>Rapporto generato automaticamente, non rivisto da un analista.</strong> Finestra: {formatDateTime(report.window_start)} →{" "}
        {formatDateTime(report.window_end)}. Le rivendicazioni sono dichiarazioni dei gruppi, non verificate; i collegamenti tra
        malware e gruppi sono indizi, non attribuzioni.
      </div>

      {d.ai && (
        <Card title="In breve">
          <p className="text-sm leading-relaxed">{d.ai.reading}</p>
          <p className="mt-2 text-xs text-muted">
            Scritto con IA ({d.ai.model}) usando solo i dati qui sotto e quelli del giorno prima; il testo viene scartato se cita
            numeri che non compaiono nei dati. Non rivisto da un analista.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Rivendicazioni ransomware" value={formatNumber(d.claims.total)} hint={d.claims.partial ? "dato parziale" : "nel mondo, 24 ore"} />
        <Stat label="Segnalazioni di malware" value={formatNumber(d.malware.reduce((s, m) => s + m.count, 0))} hint="prime 10 famiglie" />
        <Stat label="Nuove vulnerabilità sfruttate" value={d.kev.length} hint="aggiunte al catalogo KEV" />
        <Stat label="Attori collegati ad ATT&CK" value={nActors} hint="base per tecniche e difese" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Chi ha rivendicato attacchi">
          {d.claims.groups.length === 0 ? (
            <p className="text-sm text-muted">Nessuna rivendicazione nella finestra (o fonte non disponibile).</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr><th className={th}>Gruppo (leak site)</th><th className={th}>Vittime</th><th className={th}>In ATT&CK</th></tr></thead>
              <tbody className="divide-y divide-line">
                {d.claims.groups.map((g) => (
                  <tr key={g.name}>
                    <td className={td}>
                      <span className="font-medium">{g.name}</span>
                      {g.countries.length > 0 && <div className="text-xs text-muted">{g.countries.map(countryName).join(", ")}</div>}
                    </td>
                    <td className={`${td} tabular-nums`}>{g.count}</td>
                    <td className={td}>{g.attack ? <AttackLink r={g.attack} /> : <span className="text-xs text-muted">non documentato</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-xs text-muted">Fonte: ransomware.live. Solo conteggi: i nomi delle vittime non vengono salvati.</p>
        </Card>

        <Card title="Malware più segnalati">
          <table className="w-full text-sm">
            <thead><tr><th className={th}>Famiglia</th><th className={th}>Segnalazioni</th><th className={th}>In ATT&CK</th></tr></thead>
            <tbody className="divide-y divide-line">
              {d.malware.map((m) => (
                <tr key={m.name}>
                  <td className={`${td} font-medium`}>{m.name}</td>
                  <td className={`${td} tabular-nums`}>{formatNumber(m.count)}</td>
                  <td className={td}>
                    {m.attack ? (
                      <>
                        <AttackLink r={m.attack} />
                        {m.usedBy > 0 && <div className="text-xs text-muted">usato da {m.usedBy === 1 ? "1 gruppo documentato" : `${m.usedBy} gruppi documentati`}: indizio, non attribuzione</div>}
                      </>
                    ) : (
                      <span className="text-xs text-muted">non documentato</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted">Fonti: ThreatFox, URLhaus (abuse.ch). Una segnalazione è un indicatore (IP, dominio, URL, hash) visto nella finestra.</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Dove (paesi delle vittime)">
          <ul className="space-y-1 text-sm">
            {d.claims.countries.map((c) => (
              <li key={c.code} className="flex justify-between gap-2"><span>{countryName(c.code)}</span><span className="tabular-nums text-muted">{c.count}</span></li>
            ))}
          </ul>
        </Card>
        <Card title="Settori colpiti">
          <ul className="space-y-1 text-sm">
            {d.claims.sectors.map((s) => (
              <li key={s.label} className="flex justify-between gap-2"><span>{sectorRawIt(s.label)}</span><span className="tabular-nums text-muted">{s.count}</span></li>
            ))}
          </ul>
        </Card>
        <Card title="Vulnerabilità da correggere subito">
          {d.kev.length === 0 ? (
            <p className="text-sm text-muted">Nessuna nuova voce nel catalogo CISA KEV nella finestra.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {d.kev.map((k) => (
                <li key={k.cve_id}>
                  <span className="font-mono">{k.cve_id}</span> {k.ransomware && <Badge tone="warn">usata dal ransomware</Badge>}
                  <div className="text-xs text-muted">{k.vendor} {k.product}: {k.name}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {nActors === 0 ? (
        <Card title="Tecniche e difese">
          <p className="text-sm text-muted">Nessuno degli attori attivi è documentato in MITRE ATT&CK: tecniche e difese non calcolabili per questa finestra.</p>
        </Card>
      ) : (
        <>
          <Card title={`Le tecniche più ricorrenti (${nActors} attori collegati ad ATT&CK)`}>
            <p className="mb-3 text-xs text-muted">
              Calcolate su: {d.actors.map((a) => `${a.attack.name} (${a.via})`).join(", ")}. Il numero indica quanti di questi attori usano la
              tecnica secondo ATT&CK: è ciò che hanno documentato in passato, non ciò che è stato osservato stanotte.
            </p>
            <table className="w-full text-sm">
              <thead><tr><th className={th}>Tecnica</th><th className={th}>Fase</th><th className={th}>Attori</th></tr></thead>
              <tbody className="divide-y divide-line">
                {d.techniques.map((t) => (
                  <tr key={t.external_id}>
                    <td className={td}>
                      <a href={`https://attack.mitre.org/techniques/${t.external_id.replace(".", "/")}/`} target="_blank" rel="noreferrer" className="hover:underline">
                        <span className="font-mono text-xs text-muted">{t.external_id}</span> {t.name}
                      </a>
                    </td>
                    <td className={`${td} text-xs text-muted`}>{t.tactics.map((s) => tac.get(s) ?? s).join(", ")}</td>
                    <td className={`${td} tabular-nums`}>{t.actors}/{nActors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Le difese con più resa (mitigazioni ATT&CK)">
              <ol className="list-decimal space-y-2 pl-5 text-sm">
                {d.mitigations.map((m) => (
                  <li key={m.external_id}>
                    <Link href={`/mitigazioni/${m.external_id}`} className="font-medium hover:underline">{mitigationIt(m.external_id, m.name)}</Link>{" "}
                    <span className="font-mono text-xs text-muted">{m.external_id}</span>
                    <div className="text-xs text-muted">copre {m.techniques} tecniche usate dagli attori attivi</div>
                  </li>
                ))}
              </ol>
            </Card>
            <Card title="Contromisure MITRE D3FEND più pertinenti">
              <ul className="space-y-2.5 text-sm">
                {d.d3fend.map((e) => (
                  <li key={e.measures[0].id}>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {e.measures.slice(0, 4).map((m) => (
                        <span key={m.id} className="inline-flex items-center gap-1">
                          <a href={`https://d3fend.mitre.org/technique/d3f:${m.iri}/`} target="_blank" rel="noreferrer" className="font-medium hover:underline">{m.label}</a>
                          <Badge>{D3FEND_TACTIC_IT[m.tactic]?.name ?? m.tactic}</Badge>
                        </span>
                      ))}
                      {e.measures.length > 4 && <span className="text-xs text-muted">e altre {e.measures.length - 4} equivalenti</span>}
                    </div>
                    <div className="text-xs text-muted">{e.techniques} delle tecniche degli attori attivi (su {e.total} a cui si applica in D3FEND)</div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}

      <Card title="Limiti di questo rapporto">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {d.sources.map((s) => (
            <li key={s.id}>
              <strong>{s.name}</strong>: {s.ok ? "dati ricevuti" : "non disponibile"}
              {s.note ? ` (${s.note})` : ""}
            </li>
          ))}
          <li>Vede solo ciò che è pubblico: la maggior parte degli attacchi non viene mai rivendicata né segnalata.</li>
          <li>
            Tecniche e difese vengono da ciò che MITRE ATT&CK documenta per gli attori collegati ({nActors}); i gruppi «non documentati»
            non contribuiscono.
          </li>
          <li>Generato il {formatDateTime(report.generated_at)}. Per il giudizio dell&apos;analista vedi il <Link href="/" className="text-accent hover:underline">Briefing</Link>.</li>
        </ul>
      </Card>
    </div>
  );
}
