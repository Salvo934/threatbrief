"use client";

import { ExternalLink } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";
import { citations, type OsintLookup } from "@/lib/osint/export";
import { PivotGraph } from "./pivot-graph";

type Rdap = { registered?: string; lastChanged?: string; expires?: string; registrar?: string; nameservers?: string[]; status?: string[]; network?: string; cidr?: string; country?: string; org?: string };
type Certs = { total: number; first?: string; last?: string; issuers: string[]; subdomains: string[] };
type Hosting = { ports?: number[]; vulns?: string[]; hostnames?: string[]; tags?: string[]; cpes?: string[] };
type Known = { value: string; sources: string[]; malware: string[]; lastSeen?: string; groups: string[] };
type Pivot = { kind: string; value: string; via: string };

const VERDICT_STYLE: Record<string, string> = {
  malevolo: "border-err/40 bg-err/10 text-err",
  sospetto: "border-warn-text/40 bg-warn-bg text-warn-text",
  "nessuna evidenza": "border-line bg-surface-2 text-fg",
};
const d = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—");

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1 text-sm">
      <dt className="w-36 shrink-0 text-muted">{k}</dt>
      <dd className="min-w-0 break-words">{v ?? "—"}</dd>
    </div>
  );
}

export function OsintResult({ l, onPick }: { l: OsintLookup; onPick: (v: string) => void }) {
  const r = l.result as {
    indicator?: { kind: string; value: string }; domain?: string; rdap?: Rdap | null; ipRdap?: Rdap | null;
    dns?: Record<string, string[]>; certs?: Certs | null; hosting?: Hosting | null; hostingIp?: string; known?: Known[];
    kevVulns?: string[]; pivots?: Pivot[]; lookalikeOf?: string | null;
  };
  const timeline = [
    { at: r.rdap?.registered, what: "Dominio registrato", src: "RDAP" },
    { at: r.certs?.first, what: "Primo certificato TLS ancora valido", src: "crt.sh" },
    { at: r.rdap?.lastChanged, what: "Ultima modifica della registrazione", src: "RDAP" },
    { at: r.certs?.last, what: "Ultimo certificato emesso", src: "crt.sh" },
    ...(r.known ?? []).map((k) => ({ at: k.lastSeen, what: `Ultima segnalazione come malevolo (${k.value})`, src: k.sources.join(", ") })),
    { at: r.rdap?.expires, what: "Scadenza della registrazione", src: "RDAP" },
  ].filter((t) => t.at).sort((a, b) => a.at!.localeCompare(b.at!));

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border px-4 py-3 ${VERDICT_STYLE[l.verdict] ?? VERDICT_STYLE["nessuna evidenza"]}`}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-lg font-semibold capitalize">{l.verdict}</span>
          <Badge>Admiralty {l.admiralty}</Badge>
          <span className="break-all font-mono text-sm">{r.indicator?.value ?? l.query}</span>
          <span className="text-xs opacity-80">{r.indicator?.kind}</span>
        </div>
        <p className="mt-1 text-sm opacity-90">
          {l.verdict === "malevolo" ? "Segnalato da fonti di threat intelligence affidabili; la segnalazione può essere vecchia o un falso positivo."
            : l.verdict === "sospetto" ? "Ci sono segnali di rischio: da approfondire prima di agire."
            : "Le fonti consultate non segnalano nulla: NON significa che sia sicuro."}
        </p>
      </div>

      <Card title={`Segnali (${l.signals.length})`}>
        {l.signals.length === 0 ? <p className="text-sm text-muted">Nessun segnale dalle fonti consultate.</p> : (
          <ul className="space-y-1.5 text-sm">
            {l.signals.map((s, i) => (
              <li key={i} className="flex gap-2">
                <Badge tone={s.level === "alto" ? "warn" : "neutral"}>{s.level}</Badge>
                <span>{s.text} <span className="text-xs text-muted">· {s.source}</span></span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {(r.rdap || r.domain) && (
          <Card title={`Registrazione${r.domain ? ` · ${r.domain}` : ""}`}>
            {!r.rdap?.registered && !r.rdap?.registrar && (
              <p className="mb-2 rounded-md bg-surface-2 px-3 py-2 text-xs text-muted">
                {l.sources.some((s) => s.name.startsWith("RDAP") && s.status === 404)
                  ? <>Il registro di questo dominio non pubblica i dati via RDAP (succede per esempio con i domini .it), oppure il dominio non è registrato. Verifica a mano: {r.domain?.endsWith(".it") ? <a href={`https://whois.nic.it/${r.domain}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">whois.nic.it</a> : <a href={`https://lookup.icann.org/en/lookup?name=${r.domain}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">ICANN Lookup</a>}.</>
                  : "Dati di registrazione non disponibili (fonte non raggiungibile)."}
              </p>
            )}
            <dl>
              <Row k="Registrato il" v={d(r.rdap?.registered)} />
              <Row k="Scade il" v={d(r.rdap?.expires)} />
              <Row k="Registrar" v={r.rdap?.registrar} />
              <Row k="Name server" v={r.rdap?.nameservers?.join(", ")} />
              <Row k="Stato" v={r.rdap?.status?.join(", ")} />
              {r.lookalikeOf && <Row k="Imita il marchio" v={<Badge tone="warn">{r.lookalikeOf}</Badge>} />}
            </dl>
          </Card>
        )}
        {r.dns && (
          <Card title="DNS (Cloudflare, risoluzione pubblica)">
            <dl>
              {Object.entries(r.dns).map(([t, vals]) => <Row key={t} k={t} v={vals.length ? <span className="font-mono text-xs">{vals.join(", ")}</span> : "—"} />)}
            </dl>
          </Card>
        )}
        {(r.hosting || r.ipRdap) && (
          <Card title={`Host ${r.hostingIp ?? ""}`}>
            <dl>
              {r.ipRdap && <Row k="Rete" v={[r.ipRdap.network, r.ipRdap.cidr, r.ipRdap.country].filter(Boolean).join(" · ")} />}
              {r.ipRdap?.org && <Row k="Organizzazione" v={r.ipRdap.org} />}
              <Row k="Porte aperte" v={r.hosting?.ports?.length ? r.hosting.ports.join(", ") : "nessuna nota"} />
              <Row k="Vulnerabilità" v={r.hosting?.vulns?.length ? <span className="text-xs">{r.hosting.vulns.slice(0, 12).map((v) => (r.kevVulns ?? []).includes(v) ? `${v} (KEV)` : v).join(", ")}{r.hosting.vulns.length > 12 ? ` e altre ${r.hosting.vulns.length - 12}` : ""}</span> : "nessuna nota"} />
              <Row k="Nomi associati" v={r.hosting?.hostnames?.slice(0, 8).join(", ")} />
              <Row k="Etichette" v={r.hosting?.tags?.join(", ")} />
            </dl>
            <p className="mt-2 text-xs text-muted">Dati raccolti in precedenza da Shodan: l&apos;host non è stato contattato.</p>
          </Card>
        )}
        {r.certs && (
          <Card title={`Certificati (${r.certs.total})`}>
            <dl>
              <Row k="Primo / ultimo" v={`${d(r.certs.first)} → ${d(r.certs.last)}`} />
              <Row k="Emittenti" v={r.certs.issuers.join(", ")} />
              <Row k="Sottodomini" v={r.certs.subdomains.length ? <span className="font-mono text-xs">{r.certs.subdomains.slice(0, 20).join(", ")}{r.certs.subdomains.length > 20 ? " …" : ""}</span> : "—"} />
            </dl>
          </Card>
        )}
      </div>

      {(r.known ?? []).length > 0 && (
        <Card title="Già noto a ThreatBrief">
          <ul className="space-y-1 text-sm">
            {r.known!.map((k) => (
              <li key={k.value}><span className="font-mono">{k.value}</span>: {k.sources.join(", ")}{k.malware.length ? ` · ${k.malware.join(", ")}` : ""}{k.groups.length ? ` · usato da ${k.groups.slice(0, 5).join(", ")}${k.groups.length > 5 ? "…" : ""} (indizio)` : ""}</li>
            ))}
          </ul>
        </Card>
      )}

      {(r.pivots ?? []).length > 0 && (
        <Card title={`Collegamenti (${r.pivots!.length}) · clicca un nodo per indagarlo`}>
          <PivotGraph center={r.indicator?.value ?? l.query} pivots={r.pivots!} onPick={onPick} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {r.pivots!.map((p) => (
              <button key={p.value} type="button" onClick={() => onPick(p.value)} title={p.via} className="rounded border border-line px-2 py-0.5 font-mono text-xs hover:border-accent hover:text-accent">
                {p.value}
              </button>
            ))}
          </div>
        </Card>
      )}

      {timeline.length > 0 && (
        <Card title="Cronologia">
          <ol className="space-y-1 border-l border-line pl-4 text-sm">
            {timeline.map((t, i) => <li key={i}><span className="tabular-nums text-muted">{d(t.at)}</span> · {t.what} <span className="text-xs text-muted">({t.src})</span></li>)}
          </ol>
        </Card>
      )}

      <Card title="Metodo e fonti (per la riproducibilità)">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-muted"><th className="py-1 pr-3">Fonte</th><th className="pr-3">Esito</th><th className="pr-3">Tempo</th><th>Consultata (UTC)</th></tr></thead>
            <tbody className="divide-y divide-line">
              {l.sources.map((s, i) => (
                <tr key={i}>
                  <td className="py-1 pr-3">
                    {s.url.startsWith("http") ? <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">{s.name}<ExternalLink aria-hidden className="size-3" /></a> : s.name}
                  </td>
                  <td className={`pr-3 ${s.ok ? "text-ok" : "text-err"}`}>{s.ok ? (s.status === 404 ? "nessun dato" : "ok") : `errore${s.error ? `: ${s.error}` : ""}`}</td>
                  <td className="pr-3 tabular-nums">{s.ms} ms</td>
                  <td className="tabular-nums">{s.fetched_at.replace("T", " ").slice(0, 19)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-accent">Citazioni pronte per la tesi</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs">{citations(l).map((c, i) => <li key={i} className="break-all">{c}</li>)}</ol>
        </details>
      </Card>
    </div>
  );
}
