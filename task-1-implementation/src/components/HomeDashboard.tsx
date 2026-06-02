"use client";

import dynamic from "next/dynamic";

const PerfDashboard = dynamic(
  () =>
    import("./PerfDashboard").then((m) => ({
      default: m.PerfDashboard,
    })),
  {
    ssr: false,
    loading: () => (
      <p className="px-4 py-12 text-center text-slate-400">Loading dashboard…</p>
    ),
  }
);

export function HomeDashboard() {
  return <PerfDashboard />;
}
