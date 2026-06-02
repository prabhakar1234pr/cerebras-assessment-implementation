"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type {
  CustomerThresholds,
  FileParseReport,
  PerfSweep,
  ViewMode,
} from "@/lib/types";
import { parsePerfFiles } from "@/lib/parsePerfXlsx";
import { decodeShareState } from "@/lib/shareState";
import {
  loadPreloadedSweeps,
  PRELOADED_MODEL_COUNT,
  PRELOADED_SWEEP_COUNT,
} from "@/lib/preloaded";
import { UploadPanel } from "./UploadPanel";
import { CustomerView } from "./CustomerView";
import { EngineerView } from "./EngineerView";
import { ParseReport } from "./ParseReport";
import { DashboardToolbar } from "./DashboardToolbar";

const ComparisonCharts = dynamic(
  () =>
    import("./ComparisonCharts").then((m) => ({ default: m.ComparisonCharts })),
  { ssr: false, loading: () => null }
);

const DEFAULT_THRESHOLDS: CustomerThresholds = {
  minGenSpeed: 1000,
  maxTtft: 1.0,
};

export function PerfDashboard() {
  const [sweeps, setSweeps] = useState<PerfSweep[]>([]);
  const [view, setView] = useState<ViewMode>("customer");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<FileParseReport[]>([]);
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [selectedProfile, setSelectedProfile] = useState<number | "all">("all");
  const [selectedModel, setSelectedModel] = useState<string | "all">("all");
  const [sharedComparisonRef, setSharedComparisonRef] = useState<string | null>(
    null
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("s");
    if (encoded) {
      const state = decodeShareState(encoded);
      if (state) {
        setSweeps(state.sweeps);
        setView(state.view);
        setThresholds(state.thresholds);
        setSelectedProfile(state.selectedProfile);
        setSelectedModel(state.selectedModel ?? "all");
        setSharedComparisonRef(state.referenceId);
        setLoading(false);
        setHydrated(true);
        return;
      }
    }
    setHydrated(true);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || sweeps.length > 0) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { sweeps: preloaded, reports: preloadReports } =
          await loadPreloadedSweeps();
        if (cancelled) return;
        setSweeps(preloaded);
        setReports(preloadReports);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Failed to load shipped perf data"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, sweeps.length]);

  const mergeSweeps = useCallback((parsed: PerfSweep[]) => {
    setSweeps((prev) => {
      const map = new Map(prev.map((s) => [s.id, s]));
      parsed.forEach((s) => map.set(s.id, s));
      return [...map.values()];
    });
  }, []);

  const ingest = useCallback(
    async (files: File[]) => {
      setLoading(true);
      setError(null);
      try {
        const { sweeps: parsed, reports: batchReports } =
          await parsePerfFiles(files);
        setReports((prev) => [...prev, ...batchReports]);
        if (!parsed.length) {
          const failed = batchReports.filter((r) => !r.ok);
          if (failed.length) {
            setError(
              "No files could be parsed. See parse report below for details."
            );
          } else {
            setError("No .xlsx files found in selection.");
          }
          return;
        }
        mergeSweeps(parsed);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [mergeSweeps]
  );

  const reloadPreloaded = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { sweeps: preloaded, reports: preloadReports } =
        await loadPreloadedSweeps();
      setSweeps(preloaded);
      setReports(preloadReports);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const shareState = {
    v: 1 as const,
    view,
    thresholds,
    selectedProfile,
    selectedModel,
    referenceId: null,
    sweeps,
  };

  const failedReports = reports.filter((r) => !r.ok);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      {sweeps.length > 0 && (
        <p className="rounded-lg border border-cerebras-border bg-cerebras-panel px-4 py-3 text-sm text-slate-300">
          <span className="font-medium text-white">
            Models A–K pre-loaded
          </span>{" "}
          ({PRELOADED_SWEEP_COUNT} sweeps, {PRELOADED_MODEL_COUNT} models). Upload
          more <code>.xlsx</code> files below to add Model L or other sweeps.
        </p>
      )}

      <UploadPanel
        onFiles={ingest}
        onReloadPreloaded={reloadPreloaded}
        loading={loading}
        error={error}
      />

      {failedReports.length > 0 && <ParseReport reports={failedReports} />}

      {sweeps.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-slate-400">
              <span className="font-medium text-white">{sweeps.length}</span> sweep
              {sweeps.length !== 1 ? "s" : ""} loaded
              <button
                type="button"
                className="ml-3 text-orange-400 hover:underline"
                onClick={() => {
                  setSweeps([]);
                  setReports([]);
                  setSharedComparisonRef(null);
                  reloadPreloaded();
                }}
              >
                Reset to shipped models
              </button>
            </p>
            <div className="flex rounded-lg border border-cerebras-border p-1">
              {(
                [
                  ["customer", "Customer / PM"],
                  ["engineer", "Engineer"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                    view === id
                      ? "bg-cerebras-orange text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <DashboardToolbar
            sweeps={sweeps}
            selectedProfile={selectedProfile}
            selectedModel={selectedModel}
            shareState={shareState}
          />

          <ComparisonCharts
            sweeps={sweeps}
            selectedProfile={selectedProfile}
            selectedModel={selectedModel}
          />

          {view === "customer" ? (
            <CustomerView
              sweeps={sweeps}
              thresholds={thresholds}
              onThresholds={setThresholds}
              selectedProfile={selectedProfile}
              onProfile={setSelectedProfile}
              selectedModel={selectedModel}
              onModel={setSelectedModel}
              initialReferenceId={sharedComparisonRef}
            />
          ) : (
            <EngineerView
              sweeps={sweeps}
              selectedProfile={selectedProfile}
              onProfile={setSelectedProfile}
              selectedModel={selectedModel}
              onModel={setSelectedModel}
            />
          )}
        </>
      )}

      {sweeps.length === 0 && !loading && hydrated && (
        <p className="text-center text-slate-500">
          Could not load shipped perf data. Use upload or Reload shipped models.
        </p>
      )}
    </div>
  );
}
