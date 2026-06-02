"use client";

import type { FileParseReport } from "@/lib/types";

type Props = {
  reports: FileParseReport[];
};

export function ParseReport({ reports }: Props) {
  if (!reports.length) return null;

  const failed = reports.filter((r) => !r.ok);
  const warned = reports.filter((r) => r.ok && r.issues.length > 0);
  const ok = reports.filter((r) => r.ok && !r.issues.length);

  return (
    <div className="space-y-3 rounded-xl border border-cerebras-border bg-cerebras-panel p-4">
      <h3 className="text-sm font-semibold text-slate-300">Parse report</h3>
      {ok.length > 0 && (
        <p className="text-sm text-emerald-400">
          {ok.length} file{ok.length !== 1 ? "s" : ""} loaded successfully
        </p>
      )}
      {warned.map((r) => (
        <div
          key={r.fileName}
          className="rounded-lg border border-amber-800/40 bg-amber-950/30 px-3 py-2"
        >
          <p className="text-sm font-medium text-amber-200">{r.fileName}</p>
          <ul className="mt-1 list-inside list-disc text-xs text-amber-100/90">
            {r.issues.map((i, idx) => (
              <li key={idx}>{i.message}</li>
            ))}
          </ul>
        </div>
      ))}
      {failed.map((r) => (
        <div
          key={r.fileName}
          className="rounded-lg border border-red-800/50 bg-red-950/40 px-3 py-2"
        >
          <p className="text-sm font-medium text-red-300">{r.fileName}</p>
          <ul className="mt-1 list-inside list-disc text-xs text-red-200/90">
            {r.issues.map((i, idx) => (
              <li key={idx}>{i.message}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
