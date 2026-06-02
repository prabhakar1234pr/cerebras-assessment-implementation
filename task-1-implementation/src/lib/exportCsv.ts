import type { PerfSweep } from "./types";
import { primaryConfig } from "./parsePerfXlsx";

export function buildComparisonCsv(
  sweeps: PerfSweep[],
  referenceId: string | null
): string {
  const ref = referenceId
    ? sweeps.find((s) => s.id === referenceId)
    : null;
  const refCfg = ref ? primaryConfig(ref) : null;

  const headers = [
    "model",
    "profile",
    "file",
    "input_tokens",
    "output_tokens",
    "cache_pct",
    "gen_speed_user",
    "ttft_sec",
    "throughput_tps",
    "rpm",
    "meets_sla_placeholder",
    "vs_ref_gen_speed_pct",
    "vs_ref_ttft_pct",
  ];

  const rows = sweeps.map((s) => {
    const c = primaryConfig(s);
    let vsGen = "";
    let vsTtft = "";
    if (refCfg && s.id !== referenceId) {
      vsGen =
        refCfg.genSpeed > 0
          ? (((c.genSpeed - refCfg.genSpeed) / refCfg.genSpeed) * 100).toFixed(1)
          : "";
      vsTtft =
        refCfg.ttft > 0
          ? (((c.ttft - refCfg.ttft) / refCfg.ttft) * 100).toFixed(1)
          : "";
    }
    return [
      s.modelId,
      s.profile ?? "",
      s.fileName,
      c.inputLength,
      c.outputLength,
      c.cachePct,
      c.genSpeed,
      c.ttft,
      c.throughput,
      c.rpm,
      "",
      vsGen,
      vsTtft,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
