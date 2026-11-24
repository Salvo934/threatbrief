"use client";

type Pivot = { kind: string; value: string; via: string };

const COLOR: Record<string, string> = { ipv4: "#f59e0b", ipv6: "#f59e0b", domain: "#60a5fa", url: "#a78bfa" };

/** Mappa radiale dei collegamenti: al centro l'indicatore, intorno i pivot (cliccabili). */
export function PivotGraph({ center, pivots, onPick }: { center: string; pivots: Pivot[]; onPick: (v: string) => void }) {
  const W = 640;
  const H = 360;
  const cx = W / 2;
  const cy = H / 2;
  const shown = pivots.slice(0, 16);
  const R = Math.min(150, 70 + shown.length * 6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Collegamenti dell'indicatore">
      {shown.map((p, i) => {
        const a = (i / shown.length) * Math.PI * 2 - Math.PI / 2;
        const x = Math.round((cx + Math.cos(a) * R * 1.55) * 10) / 10;
        const y = Math.round((cy + Math.sin(a) * R) * 10) / 10;
        const label = p.value.length > 26 ? `${p.value.slice(0, 24)}…` : p.value;
        return (
          <g key={p.value} className="cursor-pointer" onClick={() => onPick(p.value)}>
            <title>{`${p.value} — ${p.via} (clicca per indagare)`}</title>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="currentColor" strokeOpacity="0.18" />
            <circle cx={x} cy={y} r="5" fill={COLOR[p.kind] ?? "#94a3b8"} />
            <text x={x} y={y - 9} textAnchor="middle" fontSize="11" fill="currentColor" className="opacity-80 hover:opacity-100">{label}</text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r="9" fill="#ef4444" />
      <text x={cx} y={cy + 24} textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">
        {center.length > 40 ? `${center.slice(0, 38)}…` : center}
      </text>
    </svg>
  );
}
