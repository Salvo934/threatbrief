"use client";

import { ExternalLink, Send, ShieldCheck, TriangleAlert } from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";
import { invoke } from "@/components/osint/invoke";

type Source = { n: number; tool: string; title: string; link: string };
type Answer = { answer: string; sources: Source[]; consulted: number; warning: string | null; corrected: boolean; model: string };
type Turn = { id: number; question: string; result?: Answer; error?: string };

const EXAMPLES = [
  "Quali gruppi ransomware hanno rivendicato più attacchi in Italia negli ultimi 30 giorni?",
  "Ci sono vulnerabilità Fortinet nel catalogo KEV usate dal ransomware?",
  "Cosa è successo stanotte nel mondo?",
  "Che tecniche usa APT28 e come ci si difende dal phishing con allegato (T1566.001)?",
  "Ci sono avvisi recenti rilevanti per difesa e aerospazio?",
];

/** Testo con **grassetto** e citazioni [n] cliccabili verso la fonte. */
function inline(text: string, sources: Source[], key: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[\d+\])/g).map((part, i) => {
    const k = `${key}-${i}`;
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={k}>{part.slice(2, -2)}</strong>;
    const m = /^\[(\d+)\]$/.exec(part);
    if (m) {
      const s = sources.find((x) => x.n === Number(m[1]));
      return s ? (
        <a key={k} href={s.link} title={s.title} target={s.link.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
          className="mx-0.5 rounded bg-accent-soft px-1 align-super text-[10px] font-semibold text-accent">{m[1]}</a>
      ) : <sup key={k} className="text-err">[{m[1]}]</sup>;
    }
    return <Fragment key={k}>{part}</Fragment>;
  });
}

/** Paragrafi ed elenchi puntati: il minimo di markdown che il modello usa. */
function Rendered({ text, sources }: { text: string; sources: Source[] }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((b, i) => {
        const lines = b.split("\n").filter(Boolean);
        if (lines.length && lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l))) {
          return <ul key={i} className="list-disc space-y-1 pl-5">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*([-*•]|\d+\.)\s+/, ""), sources, `${i}-${j}`)}</li>)}</ul>;
        }
        return <p key={i}>{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l.replace(/^#+\s*/, ""), sources, `${i}-${j}`)}</Fragment>)}</p>;
      })}
    </div>
  );
}

export function Assistant() {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);

  const ask = async (q: string) => {
    const text = q.trim();
    if (text.length < 5 || busy) return;
    const id = Date.now();
    setTurns((t) => [{ id, question: text }, ...t]);
    setQuestion("");
    setBusy(true);
    const { data, error } = await invoke<Answer>("ask", { question: text });
    setBusy(false);
    setTurns((t) => t.map((x) => (x.id === id ? { ...x, result: data ?? undefined, error: error ?? undefined } : x)));
  };

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); void ask(question); }} className="rounded-lg border border-line bg-surface p-3">
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} maxLength={800}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(question); } }}
          placeholder="Fai una domanda sui dati di ThreatBrief: rivendicazioni, vulnerabilità, gruppi, tecniche, rapporti della notte…"
          className="w-full resize-y rounded-md border border-line bg-surface px-3 py-2 text-sm" />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-muted">Invio per chiedere, Maiusc+Invio per andare a capo. Ogni domanda costa pochi centesimi.</span>
          <button type="submit" disabled={busy || question.trim().length < 5} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60">
            <Send aria-hidden className="size-3.5" /> {busy ? "Sto cercando…" : "Chiedi"}
          </button>
        </div>
      </form>

      {turns.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button key={e} type="button" onClick={() => void ask(e)} className="rounded-full border border-line px-3 py-1 text-left text-xs hover:border-accent">{e}</button>
          ))}
        </div>
      )}

      {turns.map((t) => (
        <article key={t.id} className="space-y-3 rounded-lg border border-line bg-surface p-4">
          <p className="font-medium">{t.question}</p>
          {!t.result && !t.error && <p className="animate-pulse text-sm text-muted">Consulto i dati dell&apos;app…</p>}
          {t.error && <p className="text-sm text-err">{t.error}</p>}
          {t.result && (
            <>
              <Rendered text={t.result.answer} sources={t.result.sources} />
              {t.result.warning ? (
                <p className="flex items-start gap-1.5 rounded-md bg-warn-bg px-2 py-1.5 text-xs text-warn-text"><TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" /> {t.result.warning}</p>
              ) : (
                <p className="flex items-center gap-1.5 text-[11px] text-muted">
                  <ShieldCheck aria-hidden className="size-3.5" /> Controllo superato: ogni numero compare nei dati consultati e ogni citazione rimanda a una fonte reale{t.result.corrected ? " (dopo una correzione automatica)" : ""}.
                </p>
              )}
              {t.result.sources.length > 0 && (
                <ol className="space-y-0.5 border-t border-line pt-2 text-xs">
                  {t.result.sources.map((s) => (
                    <li key={s.n}>
                      <span className="font-semibold text-accent">[{s.n}]</span>{" "}
                      <a href={s.link} target={s.link.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="hover:underline">{s.title}</a>
                      {s.link.startsWith("http") && <ExternalLink aria-hidden className="ml-1 inline size-3 text-muted" />}
                    </li>
                  ))}
                </ol>
              )}
              <p className="text-[11px] text-muted">Fonti consultate: {t.result.consulted} · scritto con IA ({t.result.model}) sui soli dati dell&apos;app: verifica prima di riusare.</p>
            </>
          )}
        </article>
      ))}
    </div>
  );
}
