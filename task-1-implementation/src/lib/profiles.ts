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

export function profileLabel(profile: number | null): string {
  if (profile == null) return "Custom workload";
  const hint = PROFILE_HINTS[profile];
  return hint ? `Profile ${profile} — ${hint}` : `Profile ${profile}`;
}
