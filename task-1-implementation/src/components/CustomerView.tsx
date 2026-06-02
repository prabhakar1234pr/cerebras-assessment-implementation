"use client";

import { useState } from "react";
import type { CustomerThresholds, PerfSweep } from "@/lib/types";
import { fmtNum, workloadLabel } from "@/lib/format";
import {
  passesThreshold,
  configAtBatch,
  availableBatchSizes,
} from "@/lib/parsePerfXlsx";
import { profileLabelWithWorkload } from "@/lib/profiles";
import { boxesFor, costProxyFor, fullResponseSec } from "@/lib/insights";
import {
  filterSweeps,
  formatDelta,
  pctDelta,
  uniqueModelIds,
} from "@/lib/compare";

type Props = {
  sweeps: PerfSweep[];
  thresholds: CustomerThresholds;
  onThresholds: (t: CustomerThresholds) => void;
  selectedProfile: number | "all";
  onProfile: (p: number | "all") => void;
  selectedModel: string | "all";
  onModel: (m: string | "all") => void;
  initialReferenceId?: string | null;
};

function StatusBadge({ pass }: { pass: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        pass ? "bg-emerald-900/60 text-emerald-300" : "bg-amber-900/60 text-amber-200"
      }`}
    >
      {pass ? "Meets SLA" : "Below SLA"}
    </span>
  );
}

export function CustomerView({
  sweeps,
  thresholds,
  onThresholds,
  selectedProfile,
  onProfile,
  selectedModel,
  onModel,
  initialReferenceId = null,
}: Props) {
  const [referenceId, setReferenceId] = useState<string | null>(
    initialReferenceId
  );
  const [batch, setBatch] = useState<number | "min">("min");

  const profiles = [
    ...new Set(sweeps.map((s) => s.profile).filter((p): p is number => p != null)),
  ].sort((a, b) => a - b);

  const models = uniqueModelIds(sweeps);
  const filtered = filterSweeps(sweeps, selectedProfile, selectedModel);
  const batchSizes = availableBatchSizes(filtered);

  const refSweep = referenceId
    ? filtered.find((s) => s.id === referenceId)
    : null;
  const refCfg = refSweep ? configAtBatch(refSweep, batch) : null;

  const comparisonOptions = filtered.map((s) => ({
    id: s.id,
    label: `${s.modelId}${s.profile != null ? ` (p${s.profile})` : ""}`,
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-cerebras-border bg-cerebras-panel p-5">
        <h2 className="text-lg font-semibold text-white">Customer / PM view</h2>
        <p className="mt-1 text-sm text-slate-400">
          Go/no-go against your workload SLA — comparable tok/s, latency, and
          relative cost, not raw spreadsheet columns.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <label className="text-sm text-slate-300">
            Min gen speed (tok/s/user)
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-cerebras-border bg-cerebras-dark px-3 py-2"
              value={thresholds.minGenSpeed}
              onChange={(e) =>
                onThresholds({
                  ...thresholds,
                  minGenSpeed: Number(e.target.value) || 0,
                })
              }
            />
          </label>
          <label className="text-sm text-slate-300">
            Max TTFT (sec)
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded-lg border border-cerebras-border bg-cerebras-dark px-3 py-2"
              value={thresholds.maxTtft}
              onChange={(e) =>
                onThresholds({
                  ...thresholds,
                  maxTtft: Number(e.target.value) || 0,
                })
              }
            />
          </label>
          <label className="text-sm text-slate-300">
            Concurrency (batch size)
            <select
              className="mt-1 w-full rounded-lg border border-cerebras-border bg-cerebras-dark px-3 py-2"
              value={String(batch)}
              onChange={(e) => {
                const v = e.target.value;
                setBatch(v === "min" ? "min" : Number(v));
              }}
            >
              <option value="min">Lowest (best latency)</option>
              {batchSizes.map((b) => (
                <option key={b} value={b}>
                  Batch {b}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-300">
            Traffic profile filter
            <select
              className="mt-1 w-full rounded-lg border border-cerebras-border bg-cerebras-dark px-3 py-2"
              value={String(selectedProfile)}
              onChange={(e) => {
                const v = e.target.value;
                onProfile(v === "all" ? "all" : Number(v));
              }}
            >
              <option value="all">All uploaded profiles</option>
              {profiles.map((p) => (
                <option key={p} value={p}>
                  Profile {p}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-300">
            Model filter
            <select
              className="mt-1 w-full rounded-lg border border-cerebras-border bg-cerebras-dark px-3 py-2"
              value={selectedModel}
              onChange={(e) => {
                const v = e.target.value;
                onModel(v === "all" ? "all" : v);
              }}
            >
              <option value="all">All models</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  Model {m}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          &ldquo;Boxes&rdquo; = Cerebras hardware units implied by the projection
          (throughput ÷ throughput-per-box) — a proxy for relative serving cost.
          Higher concurrency raises throughput/RPM but usually lowers per-user gen speed.
        </p>
      </section>

      {filtered.length === 0 ? (
        <p className="text-slate-400">No sweeps match the current filters.</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((sweep) => {
              const cfg = configAtBatch(sweep, batch);
              const pass = passesThreshold(cfg, thresholds);
              const boxes = boxesFor(cfg);
              const full = fullResponseSec(cfg);
              return (
                <article
                  key={sweep.id}
                  className="rounded-xl border border-cerebras-border bg-cerebras-panel p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        Model {sweep.modelId}
                      </h3>
                      <p className="text-xs text-slate-400">{sweep.fileName}</p>
                    </div>
                    <StatusBadge pass={pass} />
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    {profileLabelWithWorkload(sweep.profile, sweep.workload)}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {workloadLabel(sweep.workload)} · batch {cfg.batchSize}
                  </p>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-slate-500">Gen speed / user</dt>
                      <dd className="font-mono text-lg text-white">
                        {fmtNum(cfg.genSpeed, 0)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">TTFT</dt>
                      <dd className="font-mono text-lg text-white">
                        {cfg.ttft.toFixed(2)}s
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Throughput</dt>
                      <dd className="font-mono text-white">
                        {fmtNum(cfg.throughput, 0)} t/s
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">RPM</dt>
                      <dd className="font-mono text-white">{fmtNum(cfg.rpm, 1)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Boxes (cost proxy)</dt>
                      <dd className="font-mono text-cerebras-orange">
                        {boxes != null ? fmtNum(boxes, 1) : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Full response</dt>
                      <dd className="font-mono text-white">
                        {full != null ? `${full.toFixed(2)}s` : "—"}
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>

          {filtered.length > 1 && (
            <section className="overflow-x-auto rounded-xl border border-cerebras-border bg-cerebras-panel p-5">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                <h3 className="font-semibold text-white">Side-by-side comparison</h3>
                <label className="text-sm text-slate-300">
                  Reference model (compare vs)
                  <select
                    className="mt-1 block min-w-[220px] rounded-lg border border-cerebras-border bg-cerebras-dark px-3 py-2"
                    value={referenceId ?? ""}
                    onChange={(e) => setReferenceId(e.target.value || null)}
                  >
                    <option value="">None</option>
                    {comparisonOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="pb-2 pr-4">Model</th>
                    <th className="pb-2 pr-4">Profile</th>
                    <th className="pb-2 pr-4">Gen speed</th>
                    {refCfg && <th className="pb-2 pr-4">Δ gen vs ref</th>}
                    <th className="pb-2 pr-4">TTFT</th>
                    {refCfg && <th className="pb-2 pr-4">Δ TTFT vs ref</th>}
                    <th className="pb-2 pr-4">Throughput</th>
                    <th className="pb-2 pr-4">Boxes</th>
                    <th className="pb-2">SLA</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {[...filtered]
                    .sort(
                      (a, b) =>
                        configAtBatch(b, batch).genSpeed -
                        configAtBatch(a, batch).genSpeed
                    )
                    .map((sweep) => {
                      const cfg = configAtBatch(sweep, batch);
                      const pass = passesThreshold(cfg, thresholds);
                      const isRef = sweep.id === referenceId;
                      const boxes = boxesFor(cfg);
                      return (
                        <tr
                          key={sweep.id}
                          className={`border-t border-cerebras-border/60 ${
                            isRef ? "bg-cerebras-orange/5" : ""
                          }`}
                        >
                          <td className="py-2 pr-4 font-medium">
                            {sweep.modelId}
                            {isRef ? " ★" : ""}
                          </td>
                          <td className="py-2 pr-4">{sweep.profile ?? "—"}</td>
                          <td className="py-2 pr-4 font-mono">
                            {fmtNum(cfg.genSpeed, 0)}
                          </td>
                          {refCfg && (
                            <td className="py-2 pr-4 font-mono text-slate-400">
                              {isRef
                                ? "—"
                                : formatDelta(
                                    pctDelta(cfg.genSpeed, refCfg.genSpeed)
                                  )}
                            </td>
                          )}
                          <td className="py-2 pr-4 font-mono">
                            {cfg.ttft.toFixed(2)}s
                          </td>
                          {refCfg && (
                            <td className="py-2 pr-4 font-mono text-slate-400">
                              {isRef
                                ? "—"
                                : formatDelta(
                                    pctDelta(cfg.ttft, refCfg.ttft),
                                    true
                                  )}
                            </td>
                          )}
                          <td className="py-2 pr-4 font-mono">
                            {fmtNum(cfg.throughput, 0)}
                          </td>
                          <td className="py-2 pr-4 font-mono text-cerebras-orange">
                            {boxes != null ? fmtNum(boxes, 1) : "—"}
                          </td>
                          <td className="py-2">
                            <StatusBadge pass={pass} />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </div>
  );
}
