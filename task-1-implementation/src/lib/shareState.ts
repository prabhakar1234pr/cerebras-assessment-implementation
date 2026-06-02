import LZString from "lz-string";
import type { CustomerThresholds, PerfSweep, ViewMode } from "./types";

export type DashboardShareState = {
  v: 1;
  view: ViewMode;
  thresholds: CustomerThresholds;
  selectedProfile: number | "all";
  referenceId: string | null;
  sweeps: PerfSweep[];
};

export function encodeShareState(state: DashboardShareState): string {
  const json = JSON.stringify(state);
  return LZString.compressToEncodedURIComponent(json);
}

export function decodeShareState(encoded: string): DashboardShareState | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const parsed = JSON.parse(json) as DashboardShareState;
    if (parsed.v !== 1 || !Array.isArray(parsed.sweeps)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildShareUrl(state: DashboardShareState): string {
  const base =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}`
      : "";
  const param = encodeShareState(state);
  if (param.length > 12000) {
    throw new Error(
      "Too much data for a share link (~12k limit). Remove some sweeps or export CSV instead."
    );
  }
  return `${base}?s=${param}`;
}
