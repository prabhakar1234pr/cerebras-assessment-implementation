import type { PerfSweep, SummaryConfig } from "./types";
import { primaryConfig } from "./parsePerfXlsx";

export function filterByProfile(
  sweeps: PerfSweep[],
  selectedProfile: number | "all"
): PerfSweep[] {
  return selectedProfile === "all"
    ? sweeps
    : sweeps.filter((s) => s.profile === selectedProfile);
}

export function pctDelta(value: number, ref: number): number | null {
  if (!Number.isFinite(ref) || ref === 0) return null;
  return ((value - ref) / ref) * 100;
}

export function refConfig(
  sweeps: PerfSweep[],
  referenceId: string | null
): SummaryConfig | null {
  if (!referenceId) return null;
  const ref = sweeps.find((s) => s.id === referenceId);
  return ref ? primaryConfig(ref) : null;
}

export function formatDelta(pct: number | null, invertGood = false): string {
  if (pct == null) return "—";
  const sign = pct > 0 ? "+" : "";
  const good =
    invertGood ? pct < 0 : pct > 0;
  const suffix = good ? " ↑" : pct < 0 ? " ↓" : "";
  return `${sign}${pct.toFixed(1)}%${suffix}`;
}
