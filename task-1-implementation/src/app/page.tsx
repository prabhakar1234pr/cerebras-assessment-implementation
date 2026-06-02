import { PerfDashboard } from "@/components/PerfDashboard";

export default function Home() {
  return (
    <main>
      <header className="border-b border-cerebras-border bg-cerebras-panel">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-cerebras-orange">
            Cerebras · Task 1
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">
            Perf Projection Explorer
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Turn internal .xlsx perf sweeps into actionable views for customers and
            deployment engineers. Upload any model — including ones not in the sample set.
          </p>
        </div>
      </header>
      <PerfDashboard />
    </main>
  );
}
