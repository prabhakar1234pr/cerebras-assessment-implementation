"use client";

import { useState } from "react";
import type { PerfSweep } from "@/lib/types";
import { filterByProfile } from "@/lib/compare";
import { buildComparisonCsv, downloadCsv } from "@/lib/exportCsv";
import { buildShareUrl, type DashboardShareState } from "@/lib/shareState";

type Props = {
  sweeps: PerfSweep[];
  selectedProfile: number | "all";
  shareState: DashboardShareState;
};

export function DashboardToolbar({
  sweeps,
  selectedProfile,
  shareState,
}: Props) {
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const filtered = filterByProfile(sweeps, selectedProfile);

  const exportCsv = () => {
    const csv = buildComparisonCsv(filtered, null);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`perf-comparison-${stamp}.csv`, csv);
  };

  const copyShareLink = async () => {
    setShareMsg(null);
    try {
      const url = buildShareUrl(shareState);
      await navigator.clipboard.writeText(url);
      setShareMsg("Link copied — opens same sweeps & settings (re-upload not needed).");
    } catch (e) {
      setShareMsg(e instanceof Error ? e.message : "Could not create share link");
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl border border-cerebras-border bg-cerebras-panel p-4">
      <button
        type="button"
        onClick={exportCsv}
        disabled={!filtered.length}
        className="rounded-lg border border-cerebras-border px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
      >
        Export CSV
      </button>
      <button
        type="button"
        onClick={copyShareLink}
        disabled={!sweeps.length}
        className="rounded-lg border border-cerebras-border px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
      >
        Copy share link
      </button>
      {shareMsg && (
        <p
          className={`text-sm ${shareMsg.startsWith("Link") ? "text-emerald-400" : "text-amber-300"}`}
        >
          {shareMsg}
        </p>
      )}
    </div>
  );
}
