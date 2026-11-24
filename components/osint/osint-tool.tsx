"use client";

import { createBrowserClient } from "@supabase/ssr";
import { Download, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Card } from "@/components/ui/primitives";
import { lookupsToCsv, type OsintLookup } from "@/lib/osint/export";
import { OsintResult } from "./osint-result";

const EXAMPLES = ["poste-verifica-account.com", "8.8.8.8", "hxxps://example[.]com/login", "acn.gov.it"];

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

export function OsintTool() {
  const supabase = useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!), []);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<OsintLookup | null>(null);
  const [history, setHistory] = useState<OsintLookup[]>([]);
  const [note, setNote] = useState("");

  const [version, setVersion] = useState(0); // cambia dopo ogni modifica: il registro si ricarica
  const loadHistory = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let active = true;
    supabase.from("osint_lookups").select("*").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => active && setHistory((data ?? []) as OsintLookup[]));
    return () => {
      active = false;
    };
  }, [supabase, version]);

  const run = useCallback(async (q: string) => {
    const value = q.trim();
    if (!value) return;
    setQuery(value);
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.functions.invoke("osint", { body: { query: value } });
    setBusy(false);
    if (err) {
      let msg = err.message;
      try {
        msg = ((await (err as { context?: Response }).context?.json()) as { error?: string })?.error ?? msg;
      } catch {
        // risposta senza corpo JSON
      }
      setError(msg);
      return;
    }
    const d = data as Omit<OsintLookup, "query" | "kind" | "verdict" | "admiralty" | "note"> & { verdict: { label: string; admiralty: string } };
    const lookup: OsintLookup = {
      id: d.id, query: value, kind: (d.result.indicator as { kind: string }).kind, verdict: d.verdict.label, admiralty: d.verdict.admiralty,
      signals: d.signals, sources: d.sources, result: d.result, note: null, created_at: d.created_at,
    };
    setCurrent(lookup);
    setNote("");
    loadHistory();
  }, [supabase, loadHistory]);

  const saveNote = async () => {
    if (!current?.id) return;
    await supabase.from("osint_lookups").update({ note: note.slice(0, 2000) }).eq("id", current.id);
    setCurrent({ ...current, note });
    loadHistory();
  };

  const remove = async (id: string) => {
    await supabase.from("osint_lookups").delete().eq("id", id);
    if (current?.id === id) setCurrent(null);
    loadHistory();
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); void run(query); }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Dominio, IP, URL o hash (anche «defanged»: hxxp, [.])"
            className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 font-mono text-sm"
            maxLength={2048}
          />
          <button disabled={busy} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            <Search aria-hidden className="size-4" /> {busy ? "Indagine in corso…" : "Indaga"}
          </button>
        </form>
        <div className="flex flex-wrap gap-1.5 text-xs text-muted">
          Esempi: {EXAMPLES.map((e) => <button key={e} type="button" className="font-mono text-accent hover:underline" onClick={() => void run(e)}>{e}</button>)}
        </div>
        {error && <p className="rounded-md border border-err/40 bg-err/10 px-3 py-2 text-sm text-err">{error}</p>}
        {busy && <p className="text-sm text-muted">Interrogo RDAP, DNS, Certificate Transparency, Shodan InternetDB e il database di ThreatBrief (fino a 30 secondi)…</p>}

        {current && (
          <>
            <OsintResult l={current} onPick={(v) => void run(v)} />
            <Card title="Note e esportazione">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} placeholder="Appunti dell'analista (salvati nel registro)" className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" />
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <button type="button" onClick={() => void saveNote()} className="rounded-md border border-line px-3 py-1.5 hover:border-accent">Salva nota</button>
                <button type="button" onClick={() => download(`osint-${current.id.slice(0, 8)}.json`, JSON.stringify(current, null, 2), "application/json")} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 hover:border-accent"><Download aria-hidden className="size-3.5" /> JSON</button>
                <a href={`/osint/${current.id}/stix`} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 hover:border-accent"><Download aria-hidden className="size-3.5" /> STIX 2.1</a>
              </div>
            </Card>
          </>
        )}
      </div>

      <aside className="space-y-3">
        <Card title={`Registro di ricerca (${history.length})`} action={
          history.length > 0 && (
            <button type="button" onClick={() => download(`registro-osint-${new Date().toISOString().slice(0, 10)}.csv`, lookupsToCsv(history), "text/csv;charset=utf-8")} className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
              <Download aria-hidden className="size-3" /> CSV
            </button>
          )
        }>
          {history.length === 0 ? <p className="text-sm text-muted">Le indagini compaiono qui, con data, fonti ed esito.</p> : (
            <ul className="max-h-[520px] divide-y divide-line overflow-y-auto text-sm">
              {history.map((h) => (
                <li key={h.id} className="flex items-start gap-2 py-1.5">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => { setCurrent(h); setNote(h.note ?? ""); setQuery(h.query); }}>
                    <span className="block truncate font-mono text-xs">{h.query}</span>
                    <span className="flex items-center gap-1.5 text-[11px] text-muted">
                      <Badge tone={h.verdict === "malevolo" || h.verdict === "sospetto" ? "warn" : "neutral"}>{h.verdict}</Badge>
                      {new Date(h.created_at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </button>
                  <button type="button" onClick={() => void remove(h.id)} aria-label="Elimina dal registro" className="text-muted hover:text-err"><Trash2 className="size-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-muted">Il CSV ha una riga per indagine (data, indicatore, giudizio, segnali, fonti con ora di consultazione): pronto per Excel, R o Python.</p>
        </Card>
      </aside>
    </div>
  );
}
