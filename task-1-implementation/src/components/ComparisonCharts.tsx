"use client";

import type { ReactElement } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PerfSweep } from "@/lib/types";
import { primaryConfig } from "@/lib/parsePerfXlsx";
import { filterSweeps } from "@/lib/compare";

type Props = {
  sweeps: PerfSweep[];
  selectedProfile: number | "all";
  selectedModel: string | "all";
};

export function ComparisonCharts({
  sweeps,
  selectedProfile,
  selectedModel,
}: Props) {
  const filtered = filterSweeps(sweeps, selectedProfile, selectedModel);
  if (filtered.length < 2) return null;

  const data = filtered.map((s) => {
    const c = primaryConfig(s);
    return {
      name: s.modelId,
      genSpeed: Math.round(c.genSpeed),
      ttft: Number(c.ttft.toFixed(3)),
      throughput: Math.round(c.throughput),
    };
  });

  return (
    <section className="rounded-xl border border-cerebras-border bg-cerebras-panel p-5">
      <h3 className="mb-4 font-semibold text-white">Comparison charts</h3>
      <div className="grid gap-8 lg:grid-cols-3">
        <ChartBlock title="Gen speed (tok/s/user)">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3a4f" />
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "#1a2332",
                border: "1px solid #2d3a4f",
              }}
            />
            <Bar
              dataKey="genSpeed"
              name="Gen speed"
              fill="#FF6B35"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartBlock>
        <ChartBlock title="TTFT (sec) — lower is better">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3a4f" />
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "#1a2332",
                border: "1px solid #2d3a4f",
              }}
            />
            <Bar dataKey="ttft" name="TTFT" fill="#38bdf8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartBlock>
        <ChartBlock title="Throughput (t/s)">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3a4f" />
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "#1a2332",
                border: "1px solid #2d3a4f",
              }}
            />
            <Legend />
            <Bar
              dataKey="throughput"
              name="Throughput"
              fill="#a78bfa"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartBlock>
      </div>
    </section>
  );
}

function ChartBlock({
  title,
  children,
}: {
  title: string;
  children: ReactElement;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-slate-400">{title}</p>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
