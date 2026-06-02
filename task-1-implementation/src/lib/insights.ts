import type { PerfSweep, SummaryConfig } from "./types";

/**
 * Derived metrics + Summary-only anomaly detection.
 *
 * The shipped June-2026 sweeps contain ONLY a `Summary` sheet (no G_MSL_table,
 * no sim_* sheets), so the engineer view cannot rely on those optional sheets
 * for sanity-checking. Everything here is computed from the Summary rows alone,
 * so it works on the real data AND on any conforming uploaded sweep (Model L).
 */

/** Hardware boxes implied by a row: total throughput / per-box throughput. */
export function boxesFor(cfg: SummaryConfig): number | null {
  if (!Number.isFinite(cfg.throughputPerBox) || cfg.throughputPerBox <= 0) {
    return null;
  }
  return cfg.throughput / cfg.throughputPerBox;
}

/**
 * Relative cost proxy = boxes per million tokens of throughput.
 * Lower is cheaper. Unit-free, so it is comparable across models/profiles
 * without needing a real $ price. boxes / (throughput in millions of t/s).
 */
export function costProxyFor(cfg: SummaryConfig): number | null {
  const boxes = boxesFor(cfg);
  if (boxes == null || cfg.throughput <= 0) return null;
  return boxes / (cfg.throughput / 1_000_000);
}

/** Total time to fully answer one request: TTFT + output / gen speed (seconds). */
export function fullResponseSec(cfg: SummaryConfig): number | null {
  if (cfg.genSpeed <= 0) return null;
  return cfg.ttft + cfg.outputLength / cfg.genSpeed;
}

export type Anomaly = {
  severity: "warn" | "info";
  label: string;
  detail: string;
};

/**
 * Detects projection oddities an engineer should eyeball before a customer
 * sees them. All checks are derived from Summary rows only.
 */
export function detectAnomalies(sweep: PerfSweep): Anomaly[] {
  const out: Anomaly[] = [];
  const cfgs = [...sweep.configs].sort((a, b) => a.batchSize - b.batchSize);
  if (cfgs.length === 0) return out;

  // 1) Throughput should be non-decreasing as batch size grows. A drop means
  //    the larger batch is actually less efficient — usually a config/projection
  //    problem worth a look.
  for (let i = 1; i < cfgs.length; i++) {
    const prev = cfgs[i - 1];
    const cur = cfgs[i];
    if (cur.throughput > 0 && prev.throughput > 0 && cur.throughput < prev.throughput * 0.98) {
      const drop = ((prev.throughput - cur.throughput) / prev.throughput) * 100;
      out.push({
        severity: "warn",
        label: "Throughput regresses with batch size",
        detail: `Batch ${prev.batchSize}→${cur.batchSize}: total throughput drops ${drop.toFixed(0)}% (${Math.round(prev.throughput).toLocaleString()} → ${Math.round(cur.throughput).toLocaleString()} t/s). Larger batch should not lower total throughput.`,
      });
    }
  }

  // 2) Gen-speed cliff: per-user gen speed normally eases down as batch grows;
  //    a sudden >35% single-step drop is a cliff worth flagging.
  for (let i = 1; i < cfgs.length; i++) {
    const prev = cfgs[i - 1];
    const cur = cfgs[i];
    if (prev.genSpeed > 0 && cur.genSpeed > 0 && cur.genSpeed < prev.genSpeed * 0.65) {
      const drop = ((prev.genSpeed - cur.genSpeed) / prev.genSpeed) * 100;
      out.push({
        severity: "warn",
        label: "Gen-speed cliff",
        detail: `Batch ${prev.batchSize}→${cur.batchSize}: per-user gen speed falls ${drop.toFixed(0)}% (${Math.round(prev.genSpeed)} → ${Math.round(cur.genSpeed)} t/s/user).`,
      });
    }
  }

  // 3) TTFT consistency: TTFT should be ~ inputLength / realPromptSpeed.
  //    A large mismatch suggests the latency projection is internally inconsistent.
  for (const c of cfgs) {
    if (c.realPromptSpeed > 0 && c.inputLength > 0 && c.ttft > 0) {
      const implied = c.inputLength / c.realPromptSpeed; // seconds
      const ratio = c.ttft / implied;
      if (ratio > 3 || ratio < 0.33) {
        out.push({
          severity: "info",
          label: "TTFT vs prompt-speed mismatch",
          detail: `Batch ${c.batchSize}: reported TTFT ${c.ttft.toFixed(2)}s vs implied ${implied.toFixed(2)}s from input/prompt-speed (${ratio.toFixed(1)}×).`,
        });
        break; // one note per sweep is enough
      }
    }
  }

  // 4) Cache reconciliation: cached + uncached throughput should ≈ total.
  for (const c of cfgs) {
    const parts = c.cachedThroughput + c.uncachedThroughput;
    if (c.throughput > 0 && parts > 0) {
      const diff = Math.abs(parts - c.throughput) / c.throughput;
      if (diff > 0.05) {
        out.push({
          severity: "info",
          label: "Cached + uncached ≠ total throughput",
          detail: `Batch ${c.batchSize}: cached+uncached (${Math.round(parts).toLocaleString()}) differs from total (${Math.round(c.throughput).toLocaleString()}) by ${(diff * 100).toFixed(0)}%.`,
        });
        break;
      }
    }
  }

  return out;
}
