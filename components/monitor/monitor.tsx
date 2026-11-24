"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { byCountry, flag, inWindow, RECENT_HOURS, topGroups, WINDOWS, type GroupLink, type MonitorEvent } from "@/lib/monitor/rules";
import { sectorRawIt } from "@/lib/threats/sectors-it";
import { RadarMap } from "./radar-map";

const time = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "hot" }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className={`text-xl font-semibold tabular-nums ${tone === "hot" ? "text-err" : ""}`}>{value}</div>
    </div>
  );
}

export function Monitor({ events, links, countryName, generatedAt }: {
  events: MonitorEvent[];
  links: Record<string, GroupLink>;
  countryName: Record<string, string>;
  generatedAt: string;
}) {
  const now = Date.parse(generatedAt); // riferimento fisso: stesso risultato sul server e nel browser
  const [hours, setHours] = useState<number>(72);
  const [group, setGroup] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);

  const windowed = useMemo(() => inWindow(events, hours, now, group), [events, hours, now, group]);
  const countries = useMemo(() => byCountry(windowed, now), [windowed, now]);
  const groups = useMemo(() => topGroups(inWindow(events, hours, now), 10), [events, hours, now]);
  const feed = country ? windowed.filter((e) => e.country === country) : windowed;
  const recent = windowed.filter((e) => now - Date.parse(e.at) <= RECENT_HOURS * 3600_000).length;
  const italy = windowed.filter((e) => e.country === "IT").length;

  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${on ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:text-fg"}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {WINDOWS.map((w) => (
          <button key={w.hours} type="button" className={chip(hours === w.hours)} onClick={() => setHours(w.hours)}>{w.label}</button>
        ))}
        <span className="mx-1 h-4 w-px bg-line" />
        <button type="button" className={chip(!group)} onClick={() => setGroup(null)}>Tutti i gruppi</button>
        {groups.map(([g, n]) => (
          <button key={g} type="button" className={chip(group === g)} onClick={() => setGroup(group === g ? null : g)}>
            {g} <span className="tabular-nums opacity-70">{n}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Rivendicazioni" value={windowed.length} />
        <Stat label={`Ultime ${RECENT_HOURS} ore`} value={recent} tone={recent ? "hot" : undefined} />
        <Stat label="Paesi colpiti" value={countries.length} />
        <Stat label="In Italia" value={italy} tone={italy ? "hot" : undefined} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <RadarMap countries={countries} selected={country} onSelect={setCountry} countryName={countryName} />

        <section className="flex max-h-[560px] flex-col rounded-xl border border-line bg-surface">
          <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
            <h2 className="text-sm font-semibold">
              Eventi {country ? <>· {flag(country)} {countryName[country] ?? country}</> : null}
            </h2>
            {country && <button type="button" className="text-xs text-accent hover:underline" onClick={() => setCountry(null)}>tutti i paesi</button>}
          </header>
          <ol className="flex-1 divide-y divide-line overflow-y-auto">
            {feed.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">Nessun evento nel periodo scelto.</li>}
            {feed.slice(0, 150).map((e) => {
              const hot = now - Date.parse(e.at) <= RECENT_HOURS * 3600_000;
              const link = links[e.group];
              return (
                <li key={e.id} className="px-4 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-medium">
                      {hot && <span className="inline-block size-1.5 animate-pulse rounded-full bg-err" aria-label="recente" />}
                      {link ? <Link href={link.href} className="hover:underline" title={link.label}>{e.group}</Link> : e.group}
                    </span>
                    <time className="shrink-0 text-xs tabular-nums text-muted" dateTime={e.at}>{time.format(new Date(e.at))}</time>
                  </div>
                  <div className="text-xs text-muted">
                    {flag(e.country)} {e.country ? (countryName[e.country] ?? e.country) : "paese non indicato"} · {sectorRawIt(e.sector)} · rivendicazione ransomware
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}
