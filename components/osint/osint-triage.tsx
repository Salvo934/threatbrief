"use client";

import { Download, ListChecks, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Card } from "@/components/ui/primitives";
import { clusterLookups, extractIndicators, MAX_BATCH, type Cluster } from "@/lib/osint/cluster";
import { lookupsToCsv, type OsintLookup } from "@/lib/osint/export";
import { browserDb, download, invoke } from "./invoke";

type BatchAi = { clusters: { id: string; title: string; description: string; action: string }[]; rejected?: number; model: string | null };
type Batch = { id: string; name: string; created_at: string; clusters: Cluster[]; ai: BatchAi | null };
type FnResult = { id: string; created_at: string; verdict: { label: string; admiralty: string }; signals: OsintLookup["signals"]; sources: OsintLookup["sources"]; result: OsintLookup["result"] };

const PARALLEL = 3;
const RANK = { alto: 0, medio: 1, info: 2 } as const;

/** Triage di una lista: indaga ogni indicatore (modalità leggera), raggruppa, descrive con IA. */
export function OsintTriage({ onOpen }: { onOpen: (l: OsintLookup) => void }) {
  const db = browserDb();
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [rows, setRows] = useState<OsintLookup[]>([]);
  const [past, setPast] = useState<{ id: string; name: string; created_at: string }[]>([]);
  const [aiBusy, setAiBusy] = useState(false);

  const found = useMemo(() => extractIndicators(text), [text]);

  useEffect(() => {
    let active = true;
    db.from("osint_batches").select("id, name, created_at").order("created_at", { ascending: false }).limit(20)
      .then(({ data }: { data: { id: string; name: string; created_at: string }[] | null }) => active && setPast(data ?? []));
    return () => {
      active = false;
    };
  }, [db, batch?.id]);

  const describe = async (b: Batch) => {
    if (!b.clusters.length) return;
    setAiBusy(true);
    const { data, error: err } = await invoke<{ ai: BatchAi }>("osint-ai", { batch_id: b.id });
    setAiBusy(false);
    if (err || !data) return setError(`Descrizione dei gruppi non disponibile: ${err}`);
    setBatch({ ...b, ai: data.ai });
  };

  const start = async () => {
    if (!found.length) return;
    setRunning(true);
    setError(null);
    setRows([]);
    const { data: b, error: bErr } = await db.from("osint_batches")
      .insert({ name: (name.trim() || `Triage del ${new Date().toLocaleString("it-IT")}`).slice(0, 200) })
      .select("id, name, created_at").single();
    if (bErr || !b) {
      setRunning(false);
      return setError("Impossibile creare il triage.");
    }
    setProgress({ done: 0, total: found.length });
    const out: OsintLookup[] = [];
    const queue = [...found];
    const worker = async () => {
      for (let ind = queue.shift(); ind; ind = queue.shift()) {
        const { data } = await invoke<FnResult>("osint", { query: ind.value, light: true, batch_id: b.id });
        if (data) {
          out.push({ id: data.id, query: ind.value, kind: ind.kind, verdict: data.verdict.label, admiralty: data.verdict.admiralty, signals: data.signals, sources: data.sources, result: data.result, note: null, created_at: data.created_at, batch_id: b.id });
          setRows([...out]);
        }
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, worker));
    const clusters = clusterLookups(out);
    await db.from("osint_batches").update({ clusters }).eq("id", b.id);
    const full: Batch = { ...b, clusters, ai: null };
    setBatch(full);
    setRunning(false);
    await describe(full);
  };

  const open = async (id: string) => {
    setError(null);
    const [{ data: b }, { data: ls }] = await Promise.all([
      db.from("osint_batches").select("id, name, created_at, clusters, ai").eq("id", id).single(),
      db.from("osint_lookups").select("*").eq("batch_id", id).order("created_at"),
    ]);
    if (b) setBatch(b as Batch);
    setRows((ls ?? []) as OsintLookup[]);
  };

  const clusterOf = new Map((batch?.clusters ?? []).flatMap((c) => c.members.map((m) => [m, c.id] as const)));
  const byQuery = new Map(rows.map((r) => [r.query, r]));
  const verdictTone = (v?: string) => (v === "malevolo" || v === "sospetto" ? "warn" : "neutral");

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-4">
        <Card title={<span className="inline-flex items-center gap-1.5"><ListChecks aria-hidden className="size-4" /> Lista da indagare</span>}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="Incolla qui domini, IP, URL o hash: uno per riga o anche dentro un testo (un'email, un report). Vanno bene anche in forma defanged."
            className="w-full rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs" />
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} placeholder="Nome del triage (es. «Phishing INPS novembre»)" className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-1.5 text-sm" />
            <button type="button" disabled={running || !found.length} onClick={() => void start()} className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60">
              {running ? `Indago ${progress.done}/${progress.total}…` : `Avvia il triage (${found.length})`}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Riconosciuti {found.length} indicatori distinti{found.length >= MAX_BATCH ? ` (massimo ${MAX_BATCH} per triage)` : ""}. Modalità leggera: senza Certificate Transparency, per
            non sovraccaricare le fonti. Ogni indicatore finisce anche nel registro di ricerca.
          </p>
          {running && <div className="mt-2 h-1.5 overflow-hidden rounded bg-surface-2"><div className="h-full bg-accent transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} /></div>}
          {error && <p className="mt-2 text-sm text-err">{error}</p>}
        </Card>

        {batch && !running && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{batch.name}</h2>
              <button type="button" onClick={() => download(`triage-${batch.id.slice(0, 8)}.csv`, lookupsToCsv(rows, clusterOf), "text/csv;charset=utf-8")} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-sm hover:border-accent">
                <Download aria-hidden className="size-3.5" /> Dataset CSV (con gruppi)
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {(["malevolo", "sospetto", "nessuna evidenza"] as const).map((v) => (
                <div key={v} className="rounded-lg border border-line bg-surface px-3 py-2">
                  <div className="text-2xl font-semibold tabular-nums">{rows.filter((r) => r.verdict === v).length}</div>
                  <div className="text-xs capitalize text-muted">{v}</div>
                </div>
              ))}
            </div>

            {batch.clusters.length === 0 ? (
              <Card title="Gruppi"><p className="text-sm text-muted">Nessun gruppo: gli indicatori non condividono infrastruttura, marchio, registrazione o malware.</p></Card>
            ) : batch.clusters.map((c) => {
              const d = batch.ai?.clusters.find((x) => x.id === c.id);
              return (
                <Card key={c.id} title={`Gruppo ${c.id}${d ? ` · ${d.title}` : ""} (${c.members.length})`}>
                  {d ? (
                    <div className="mb-3 space-y-1 text-sm">
                      <p>{d.description}</p>
                      <p><strong>Azione:</strong> {d.action}</p>
                      <p className="inline-flex items-center gap-1 text-[11px] text-muted"><Sparkles aria-hidden className="size-3" /> Descrizione scritta con IA sui soli dati del gruppo; da verificare.</p>
                    </div>
                  ) : aiBusy ? <p className="mb-2 text-sm text-muted">Descrivo i gruppi…</p> : null}
                  <div className="mb-2 text-xs text-muted">Perché sono insieme (calcolato dal codice): {c.reasons.join(" · ")}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.members.map((m) => (
                      <button key={m} type="button" onClick={() => byQuery.get(m) && onOpen(byQuery.get(m)!)} className="inline-flex items-center gap-1 rounded border border-line px-2 py-0.5 font-mono text-xs hover:border-accent">
                        {m} <Badge tone={verdictTone(byQuery.get(m)?.verdict)}>{byQuery.get(m)?.verdict ?? "—"}</Badge>
                      </button>
                    ))}
                  </div>
                </Card>
              );
            })}
            {batch.clusters.length > 0 && !batch.ai && !aiBusy && (
              <button type="button" onClick={() => void describe(batch)} className="text-sm text-accent hover:underline">Descrivi i gruppi con IA</button>
            )}

            <Card title={`Tutti gli indicatori (${rows.length})`}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-left text-muted"><th className="py-1 pr-3">Indicatore</th><th className="pr-3">Giudizio</th><th className="pr-3">Gruppo</th><th>Segnale principale</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className="py-1 pr-3"><button type="button" onClick={() => onOpen(r)} className="font-mono text-accent hover:underline">{r.query}</button></td>
                        <td className="pr-3"><Badge tone={verdictTone(r.verdict)}>{r.verdict}</Badge></td>
                        <td className="pr-3">{clusterOf.get(r.query) ?? "—"}</td>
                        <td className="text-muted">{([...r.signals].sort((a, b) => RANK[a.level] - RANK[b.level])[0])?.text ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>

      <aside>
        <Card title={`Triage precedenti (${past.length})`}>
          {past.length === 0 ? <p className="text-sm text-muted">Nessun triage ancora.</p> : (
            <ul className="divide-y divide-line text-sm">
              {past.map((p) => (
                <li key={p.id} className="py-1.5">
                  <button type="button" onClick={() => void open(p.id)} className="text-left hover:underline">{p.name}</button>
                  <div className="text-[11px] text-muted">{new Date(p.created_at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </aside>
    </div>
  );
}
