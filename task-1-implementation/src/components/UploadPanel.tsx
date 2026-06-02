"use client";

import { useCallback, useState } from "react";

type Props = {
  onFiles: (files: File[]) => void;
  onReloadPreloaded: () => void;
  loading: boolean;
  error: string | null;
};

export function UploadPanel({ onFiles, onReloadPreloaded, loading, error }: Props) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (loading) return;
      const items = e.dataTransfer.files;
      if (items?.length) onFiles(Array.from(items));
    },
    [loading, onFiles]
  );

  return (
    <section className="rounded-xl border border-cerebras-border bg-cerebras-panel p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Upload perf sweeps
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        Models A–K load on open. Add more sweeps here (e.g. Model L) via drag-and-drop
        or the buttons below.
      </p>

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={handleDrop}
        className={`mt-4 flex min-h-[120px] flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 transition ${
          dragOver
            ? "border-cerebras-orange bg-cerebras-orange/10"
            : "border-cerebras-border bg-cerebras-dark/50"
        }`}
      >
        <p className="text-center text-sm text-slate-400">
          {dragOver ? "Drop files to upload" : "Drag & drop .xlsx files or folders"}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <label className="cursor-pointer rounded-lg bg-cerebras-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Choose files
          <input
            type="file"
            accept=".xlsx,.xls"
            multiple
            className="hidden"
            disabled={loading}
            onChange={(e) => {
              const list = e.target.files;
              if (list?.length) onFiles(Array.from(list));
              e.target.value = "";
            }}
          />
        </label>
        <label className="cursor-pointer rounded-lg border border-cerebras-border px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
          Choose folder
          <input
            type="file"
            accept=".xlsx,.xls"
            multiple
            className="hidden"
            disabled={loading}
            // @ts-expect-error webkitdirectory is non-standard
            webkitdirectory=""
            onChange={(e) => {
              const list = e.target.files;
              if (list?.length) onFiles(Array.from(list));
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          onClick={onReloadPreloaded}
          disabled={loading}
          className="rounded-lg border border-cerebras-border px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
        >
          Reload shipped models (A–K)
        </button>
      </div>
      {loading && <p className="mt-3 text-sm text-slate-400">Parsing spreadsheets…</p>}
      {error && (
        <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {error}
        </pre>
      )}
    </section>
  );
}
