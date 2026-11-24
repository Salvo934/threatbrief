"use client";

import { geoCentroid, geoNaturalEarth1, geoPath } from "d3-geo";
import type { Feature, Geometry } from "geojson";
import { useMemo, useState } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import isoNumeric from "@/data/iso-numeric.json";
import type { CountryStat } from "@/lib/monitor/rules";

const W = 960;
const H = 500;
const NUM_TO_A2 = isoNumeric as Record<string, string>;
const ITALY: [number, number] = [12.5, 42.5];

type CountryFeature = Feature<Geometry, { name: string }>;

/** Geometrie e proiezione calcolate una volta sola (sono statiche). */
const projection = geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], { type: "Sphere" });
const path = geoPath(projection).digits(1);
/** Coordinate arrotondate: identiche sul server e nel browser (niente differenze di idratazione). */
const round = (p: [number, number] | null): [number, number] | null => (p ? [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10] : null);
const topo = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const FEATURES = (feature(topo, topo.objects.countries) as unknown as { features: CountryFeature[] }).features
  .filter((f) => f.properties?.name !== "Antarctica")
  .map((f) => ({
    a2: f.id != null ? (NUM_TO_A2[String(Number(f.id))] ?? null) : null,
    d: path(f) ?? "",
    c: round(projection(geoCentroid(f))),
  }));
const CENTROID = new Map(FEATURES.filter((f) => f.a2 && f.c).map((f) => [f.a2 as string, f.c as [number, number]]));
// Alcuni paesi hanno il centroide in mare o sono troppo piccoli: correzioni puntuali.
const FIX: Record<string, [number, number]> = { US: [-98, 39], CA: [-100, 56], FR: [2.5, 46.5], NO: [9, 61], RU: [60, 58], GB: [-1.8, 53] };

const point = (code: string) => (FIX[code] ? round(projection(FIX[code])) : CENTROID.get(code)) ?? null;

export function RadarMap({ countries, selected, onSelect, countryName }: {
  countries: CountryStat[];
  selected: string | null;
  onSelect: (code: string | null) => void;
  countryName: Record<string, string>;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...countries.map((c) => c.count));
  const stats = useMemo(() => new Map(countries.map((c) => [c.code, c])), [countries]);
  const italy = round(projection(ITALY))!;
  const info = stats.get(hover ?? selected ?? "");

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#1f2d45] bg-[#070d18]">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Mappa delle rivendicazioni per paese">
        <defs>
          <radialGradient id="glow">
            <stop offset="0%" stopColor="#ff5a3c" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ff5a3c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.28" />
          </linearGradient>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" fill="none" stroke="#0f1b2e" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />

        {FEATURES.map((f, i) => {
          const s = f.a2 ? stats.get(f.a2) : undefined;
          const active = f.a2 && (f.a2 === selected || f.a2 === hover);
          return (
            <path
              key={i}
              d={f.d}
              fill={s ? `rgba(255,90,60,${0.15 + 0.45 * (s.count / max)})` : "#121c2e"}
              stroke={active ? "#fbbf24" : "#1f2d45"}
              strokeWidth={active ? 1.2 : 0.5}
              className={s ? "cursor-pointer" : undefined}
              onMouseEnter={() => s && setHover(f.a2)}
              onMouseLeave={() => setHover(null)}
              onClick={() => s && onSelect(f.a2 === selected ? null : f.a2)}
            />
          );
        })}

        {/* Radar centrato sull'Italia: cerchi concentrici e fascio rotante (decorativi). */}
        <g pointerEvents="none" opacity="0.9">
          {[60, 140, 240, 360].map((r) => (
            <circle key={r} cx={italy[0]} cy={italy[1]} r={r} fill="none" stroke="#34d399" strokeOpacity="0.12" />
          ))}
          <g className="radar-sweep" style={{ transformOrigin: `${italy[0]}px ${italy[1]}px` }}>
            <path d={`M${italy[0]},${italy[1]} L${italy[0] + 420},${italy[1] - 60} A420,420 0 0,1 ${italy[0] + 420},${italy[1] + 60} Z`} fill="url(#sweep)" />
          </g>
          <circle cx={italy[0]} cy={italy[1]} r="3" fill="#34d399" />
        </g>

        {countries.map((c) => {
          const p = point(c.code);
          if (!p) return null;
          const r = Math.round((3 + 11 * Math.sqrt(c.count / max)) * 10) / 10;
          return (
            <g key={c.code} pointerEvents="none">
              <circle cx={p[0]} cy={p[1]} r={r * 2.2} fill="url(#glow)" opacity="0.55" />
              {c.recent > 0 && (
                <circle cx={p[0]} cy={p[1]} r={r} fill="none" stroke="#ff5a3c" strokeWidth="1.5" className="radar-ping" style={{ transformOrigin: `${p[0]}px ${p[1]}px` }} />
              )}
              <circle cx={p[0]} cy={p[1]} r={Math.max(2.5, r * 0.45)} fill="#ffb4a3" />
            </g>
          );
        })}
      </svg>

      <div className={`pointer-events-none absolute left-3 top-3 rounded-md ${info ? "" : "hidden sm:block "} bg-[#070d18]/85 px-3 py-2 text-xs text-[#cbd5e1] ring-1 ring-[#1f2d45]`}>
        {info ? (
          <>
            <div className="font-semibold text-white">{countryName[info.code] ?? info.code}</div>
            <div>{info.count} rivendicazioni{info.recent ? ` · ${info.recent} nelle ultime 6 ore` : ""}</div>
            <div className="text-[#94a3b8]">{info.groups.slice(0, 3).map(([g, n]) => `${g} (${n})`).join(", ")}</div>
          </>
        ) : (
          <span className="text-[#94a3b8]">Passa sopra un paese colorato · clicca per filtrare</span>
        )}
      </div>
      <div className="pointer-events-none absolute bottom-2 right-3 flex items-center gap-3 text-[10px] text-[#94a3b8]">
        <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-[#ffb4a3]" /> vittime dichiarate</span>
        <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-full ring-1 ring-[#ff5a3c]" /> ultime 6 ore</span>
      </div>
    </div>
  );
}
