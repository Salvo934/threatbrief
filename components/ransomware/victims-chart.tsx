"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type VictimMonth = { month: string; label: string; vittime: number };

export function VictimsChart({ data, label }: { data: VictimMonth[]; label: string }) {
  return (
    <div className="h-56 w-full" role="img" aria-label={label}>
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
          <Bar dataKey="vittime" name="Rivendicazioni" fill="var(--cmp-b)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
