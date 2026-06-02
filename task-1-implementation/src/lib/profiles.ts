/** Human-readable hints for shipped profiles (for customer context). */
export const PROFILE_HINTS: Record<number, string> = {
  1: "Long prompt, short reply (e.g. classification / extraction)",
  2: "Long prompt, long generation (e.g. document drafting)",
  3: "Medium chat workload",
  4: "Balanced 1K / 1K turn",
  5: "Long context, medium output",
  6: "Very long context, short output, heavy cache",
  7: "Large doc + long answer, high cache",
};

/**
 * Derive a workload hint from the actual input/output/cache values.
 * Used as a fallback so unseen profiles (e.g. Model L profile 8) still get a
 * meaningful label instead of a bare number — driven by data, not a hardcoded map.
 */
export function deriveWorkloadHint(w: {
  inputLength: number;
  outputLength: number;
  cachePct: number;
}): string {
  const { inputLength: i, outputLength: o, cachePct: c } = w;
  if (!i && !o) return "Custom workload";

  const inSize = i >= 30000 ? "very long" : i >= 8000 ? "long" : i >= 2000 ? "medium" : "short";
  const ratio = o > 0 ? i / o : Infinity;

  let shape: string;
  if (ratio >= 8) shape = `${inSize} prompt, short reply (extraction / classification / summarization)`;
  else if (ratio <= 0.6) shape = `${inSize} prompt, long generation (drafting / long-form)`;
  else shape = `${inSize} prompt, balanced output (chat / Q&A)`;

  const cache = c >= 0.7 ? " · heavy cache reuse (agents / repeat-context)" : c >= 0.3 ? " · moderate cache" : " · cold cache";
  return shape + cache;
}

export function profileLabel(profile: number | null): string {
  if (profile == null) return "Custom workload";
  const hint = PROFILE_HINTS[profile];
  return hint ? `Profile ${profile} — ${hint}` : `Profile ${profile}`;
}

/**
 * Label that prefers the curated hint for known profiles but falls back to a
 * data-derived hint for unknown ones — so Model L renders meaningfully.
 */
export function profileLabelWithWorkload(
  profile: number | null,
  workload: { inputLength: number; outputLength: number; cachePct: number }
): string {
  if (profile != null && PROFILE_HINTS[profile]) {
    return `Profile ${profile} — ${PROFILE_HINTS[profile]}`;
  }
  const derived = deriveWorkloadHint(workload);
  return profile != null ? `Profile ${profile} — ${derived}` : derived;
}
