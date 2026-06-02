"use client";

import type { PerfSweep } from "@/lib/types";
import { fmtNum, workloadLabel } from "@/lib/format";
import { profileLabel } from "@/lib/profiles";
import { filterByProfile } from "@/lib/compare";

type Props = {
  sweeps: PerfSweep[];
  selectedProfile: number | "all";
  onProfile: (p: number | "all") => void;
};

function heatColor(value: number | null, min: number, max: number): string {
  if (value == null) return "bg-slate-800";
  const t = max > min ? (value - min) / (max - min) : 0.5;
  const hue = Math.round(40 + t * 100);
  return `hsl(${hue} 70% 35%)`;
}

export function EngineerView({ sweeps, selectedProfile, onProfile }: Props) {
  const profiles = [
    ...new Set(sweeps.map((s) => s.profile).filter((p): p is number => p != null)),
  ].sort((a, b) => a - b);

  const filtered = filterByProfile(sweeps, selectedProfile);
  const showLegacyCols = filtered.some((s) =>
    s.configs.some((c) => c.gMethod || c.targetPromptG)
  );

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-cerebras-border bg-cerebras-panel p-5">
        <h2 className="text-lg font-semibold text-white">Engineer / sanity-check view</h2>
        <p className="mt-1 text-sm text-slate-400">
          Full config matrix, G×context speed table, and simulation variance flags.
        </p>
        <label className="mt-4 block text-sm text-slate-300">
          Profile filter
          <select
            className="mt-1 w-full max-w-md rounded-lg border border-cerebras-border bg-cerebras-dark px-3 py-2"
            value={String(selectedProfile)}
            onChange={(e) => {
              const v = e.target.value;
              onProfile(v === "all" ? "all" : Number(v));
            }}
          >
            <option value="all">All profiles</option>
            {profiles.map((p) => (
              <option key={p} value={p}>
                {profileLabel(p)}
              </option>
            ))}
          </select>
        </label>
      </section>

      {filtered.map((sweep) => {
        const anomalies = sweep.simSheets.flatMap((sim) =>
          sim.rows
            .filter(
              (r) => r.throughputSpread > 0.12 || r.ttftMean > 1.5
            )
            .map((r) => ({
              sim: sim.label,
              concurrency: r.concurrency,
              spread: r.throughputSpread,
              ttft: r.ttftMean,
            }))
        );

        const gmslValues = sweep.gmsl?.rows.flatMap((r) =>
          r.speeds.filter((v): v is number => v != null)
        ) ?? [];
        const gMin = Math.min(...gmslValues, 0);
        const gMax = Math.max(...gmslValues, 1);

        return (
          <article
            key={sweep.id}
            className="space-y-4 rounded-xl border border-cerebras-border bg-cerebras-panel p-5"
          >
            <header>
              <h3 className="text-xl font-bold text-white">
                Model {sweep.modelId}
                {sweep.profile != null && (
                  <span className="ml-2 text-base font-normal text-slate-400">
                    · {profileLabel(sweep.profile)}
                  </span>
                )}
              </h3>
              <p className="text-sm text-slate-400">
                {workloadLabel(sweep.workload)} — {sweep.fileName}
              </p>
            </header>

            {anomalies.length > 0 && (
              <div className="rounded-lg border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
                <strong className="text-amber-300">Flags:</strong>{" "}
                {anomalies
                  .map(
                    (a) =>
                      `${a.sim} @ c=${a.concurrency}: throughput spread ${(a.spread * 100).toFixed(0)}%` +
                      (a.ttft > 1.5 ? `, TTFT ${a.ttft.toFixed(2)}s` : "")
                  )
                  .join("; ")}
              </div>
            )}

            <div className="overflow-x-auto">
              <h4 className="mb-2 text-sm font-semibold text-slate-300">
                Summary configurations
              </h4>
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="text-slate-500">
                  <tr>
                    {showLegacyCols && <th className="pb-1 pr-2">G</th>}
                    {showLegacyCols && <th className="pb-1 pr-2">Method</th>}
                    <th className="pb-1 pr-2">Batch</th>
                    {showLegacyCols && <th className="pb-1 pr-2">Conc.</th>}
                    <th className="pb-1 pr-2">Throughput</th>
                    <th className="pb-1 pr-2">Uncached</th>
                    <th className="pb-1 pr-2">Cached</th>
                    <th className="pb-1 pr-2">TTFT</th>
                    <th className="pb-1 pr-2">Gen/user</th>
                    <th className="pb-1">RPM</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-slate-200">
                  {sweep.configs.map((c, i) => (
                    <tr key={i} className="border-t border-cerebras-border/40">
                      {showLegacyCols && (
                        <td className="py-1 pr-2">{c.targetPromptG}</td>
                      )}
                      {showLegacyCols && (
                        <td className="py-1 pr-2">{c.gMethod}</td>
                      )}
                      <td className="py-1 pr-2">{c.batchSize}</td>
                      {showLegacyCols && (
                        <td className="py-1 pr-2">{c.concurrency}</td>
                      )}
                      <td className="py-1 pr-2">{fmtNum(c.throughput, 0)}</td>
                      <td className="py-1 pr-2">{fmtNum(c.uncachedThroughput, 0)}</td>
                      <td className="py-1 pr-2">{fmtNum(c.cachedThroughput, 0)}</td>
                      <td className="py-1 pr-2">{c.ttft.toFixed(2)}</td>
                      <td className="py-1 pr-2">{fmtNum(c.genSpeed, 0)}</td>
                      <td className="py-1">{fmtNum(c.rpm, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {sweep.gmsl && (
              <div className="overflow-x-auto">
                <h4 className="mb-2 text-sm font-semibold text-slate-300">
                  G_MSL table (tok/s vs context)
                </h4>
                <table className="text-xs">
                  <thead>
                    <tr>
                      <th className="p-1 text-slate-500">G \ ctx</th>
                      {sweep.gmsl.contextLengths.map((ctx) => (
                        <th key={ctx} className="p-1 text-slate-400">
                          {fmtNum(ctx)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sweep.gmsl.rows.map((row, gi) => (
                      <tr key={`${sweep.id}-gmsl-${gi}`}>
                        <td className="p-1 font-mono text-slate-400">{row.g}</td>
                        {row.speeds.map((v, j) => (
                          <td
                            key={j}
                            className="p-1 text-center font-mono text-white"
                            style={{
                              backgroundColor: heatColor(v, gMin, gMax),
                            }}
                          >
                            {v != null ? v : "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {sweep.simSheets.map((sim) => (
              <div key={sim.name} className="overflow-x-auto">
                <h4 className="mb-2 text-sm font-semibold text-slate-300">
                  Simulation: {sim.label}
                </h4>
                <table className="w-full min-w-[600px] text-left text-xs">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="pb-1 pr-2">Concurrency</th>
                      <th className="pb-1 pr-2">Thr. mean</th>
                      <th className="pb-1 pr-2">Thr. median</th>
                      <th className="pb-1 pr-2">Spread</th>
                      <th className="pb-1 pr-2">TTFT mean</th>
                      <th className="pb-1 pr-2">Gen mean</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-slate-200">
                    {sim.rows.map((r) => (
                      <tr
                        key={r.concurrency}
                        className={`border-t border-cerebras-border/40 ${
                          r.throughputSpread > 0.12 ? "bg-amber-950/20" : ""
                        }`}
                      >
                        <td className="py-1 pr-2">{r.concurrency}</td>
                        <td className="py-1 pr-2">{fmtNum(r.throughputMean, 0)}</td>
                        <td className="py-1 pr-2">{fmtNum(r.throughputMedian, 0)}</td>
                        <td className="py-1 pr-2">
                          {(r.throughputSpread * 100).toFixed(1)}%
                        </td>
                        <td className="py-1 pr-2">{r.ttftMean.toFixed(2)}</td>
                        <td className="py-1 pr-2">{fmtNum(r.genSpeedMean, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </article>
        );
      })}

      {filtered.length > 1 && (
        <section className="overflow-x-auto rounded-xl border border-cerebras-border bg-cerebras-panel p-5">
          <h3 className="mb-3 font-semibold text-white">
            Cross-model throughput (primary G1 row)
          </h3>
          <table className="w-full text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-2 text-left">Model</th>
                <th className="pb-2 text-left">Profile</th>
                <th className="pb-2 text-right">Throughput</th>
                <th className="pb-2 text-right">Gen/user</th>
                <th className="pb-2 text-right">TTFT</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const c =
                  s.configs.find((x) => x.gMethod === "G1") ?? s.configs[0];
                return (
                  <tr key={s.id} className="border-t border-cerebras-border/60">
                    <td className="py-2">{s.modelId}</td>
                    <td className="py-2">{s.profile ?? "—"}</td>
                    <td className="py-2 text-right font-mono">
                      {fmtNum(c.throughput, 0)}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {fmtNum(c.genSpeed, 0)}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {c.ttft.toFixed(2)}s
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
