export function fmtNum(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function fmtPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function workloadLabel(w: {
  inputLength: number;
  outputLength: number;
  cachePct: number;
}): string {
  return `${fmtNum(w.inputLength)} in / ${fmtNum(w.outputLength)} out · ${fmtPct(w.cachePct)} cache`;
}
