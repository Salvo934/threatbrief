"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type KevMonth = { month: string; label: string; totale: number; ransomware: number };

export function KevChart({ data }: { data: KevMonth[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="KEV aggiunte al catalogo per mese, ultimi 12 mesi">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12 }}
            labelStyle={{ color: "var(--text)" }}
          />
          <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11, color: "var(--muted)" }} />
          <Bar dataKey="totale" name="KEV aggiunte" fill="var(--accent)" fillOpacity={0.4} radius={[3, 3, 0, 0]} />
          <Bar dataKey="ransomware" name="di cui con uso ransomware noto" fill="var(--cmp-b)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
