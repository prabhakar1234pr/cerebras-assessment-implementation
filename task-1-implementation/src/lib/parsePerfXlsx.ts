import * as XLSX from "xlsx";
import type {
  GMSLTable,
  ParseBatchResult,
  PerfFileInput,
  PerfSweep,
  SimRow,
  SimSheet,
  SummaryConfig,
  WorkloadMeta,
} from "./types";
import { validateWorkbook } from "./validation";

/** Supports legacy (May) and updated (Jun 2026) perf projection column names. */
const SUMMARY_HEADERS: Record<string, keyof SummaryConfig | "ttftRaw"> = {
  "Input Length": "inputLength",
  "Output Length": "outputLength",
  "Cache %": "cachePct",
  "G Method": "gMethod",
  "Target Prompt G": "targetPromptG",
  "Batch Size": "batchSize",
  "Max S": "maxS",
  "Max number of milliseconds": "maxS",
  "Target Max S": "targetMaxS",
  "Target Max number of milliseconds": "targetMaxS",
  Concurrency: "concurrency",
  "Prompt only Throughput (t/s)": "promptOnlyThroughput",
  "Gen only Throughput (t/s)": "genOnlyThroughput",
  "Throughput (t/s)": "throughput",
  "Throughput / box (t/s/csx)": "throughputPerBox",
  "Throughput / box (t/s/hardware)": "throughputPerBox",
  "Uncached Throughput (t/s)": "uncachedThroughput",
  "Uncached Throughput / box (t/s/csx)": "uncachedThroughputPerBox",
  "Uncached Throughput / box (t/s/hardware)": "uncachedThroughputPerBox",
  "Cached Throughput (t/s)": "cachedThroughput",
  "Cached Throughput / box (t/s/csx)": "cachedThroughputPerBox",
  "Cached Throughput / box (t/s/hardware)": "cachedThroughputPerBox",
  "TTFT (sec)": "ttftRaw",
  "TTFT (ms)": "ttftRaw",
  "Real Prompt Speed (t/s/user)": "realPromptSpeed",
  "Prompt Speed with Queueing (t/s/user)": "promptSpeedWithQueueing",
  "Gen Speed (t/s/user)": "genSpeed",
  RPM: "rpm",
};

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

export function parseModelAndProfile(
  fileName: string,
  relativePath?: string
): { modelId: string; profile: number | null } {
  const combined = `${relativePath ?? ""}/${fileName}`.replace(/\\/g, "/");
  const folder = combined.match(/Model[_\s]([A-Za-z0-9][A-Za-z0-9._-]*)[_\s]profile[_\s](\d+)/i);
  if (folder) {
    return { modelId: folder[1].replace(/_/g, " "), profile: Number(folder[2]) };
  }
  const file = fileName.match(/Model\s+(.+?)\s+profile\s+(\d+)/i);
  if (file) {
    return { modelId: file[1].trim(), profile: Number(file[2]) };
  }
  const base = fileName.replace(/\.xlsx?$/i, "");
  return { modelId: base || "Unknown", profile: null };
}

function parseSummary(sheet: XLSX.WorkSheet): {
  workload: WorkloadMeta;
  configs: SummaryConfig[];
} {
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
  }) as (string | number | null)[][];

  let headerRow = -1;
  const colMap: Partial<Record<keyof SummaryConfig | "ttftRaw", number>> = {};
  let ttftInMs = false;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const labels = row.map((c) => str(c));
    if (labels.includes("Input Length") && labels.includes("Throughput (t/s)")) {
      headerRow = i;
      ttftInMs = labels.includes("TTFT (ms)");
      labels.forEach((label, idx) => {
        const key = SUMMARY_HEADERS[label];
        if (key) colMap[key] = idx;
      });
      break;
    }
  }

  if (headerRow < 0) {
    throw new Error("Summary sheet: header row not found");
  }

  const get = (
    row: (string | number | null)[],
    key: keyof SummaryConfig
  ): string | number => {
    const idx = colMap[key];
    if (idx == null) return key === "gMethod" ? "" : 0;
    const v = row[idx];
    return key === "gMethod" ? str(v) : num(v);
  };

  const getTtftSec = (row: (string | number | null)[]): number => {
    const idx = colMap.ttftRaw;
    if (idx == null) return 0;
    const v = num(row[idx]);
    return ttftInMs ? v / 1000 : v;
  };

  let workload: WorkloadMeta = { inputLength: 0, outputLength: 0, cachePct: 0 };
  const configs: SummaryConfig[] = [];

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c == null || c === "")) continue;

    const inLen = num(row[colMap.inputLength ?? 0]);
    if (inLen > 0) {
      workload = {
        inputLength: inLen,
        outputLength: num(row[colMap.outputLength ?? 1]),
        cachePct: num(row[colMap.cachePct ?? 2]),
      };
    }

    if (!workload.inputLength) continue;

    const batchSize = num(get(row, "batchSize"));
    const throughput = num(get(row, "throughput"));
    if (!batchSize && !throughput) continue;

    const cfg = {
      inputLength: workload.inputLength,
      outputLength: workload.outputLength,
      cachePct: workload.cachePct,
      gMethod: str(get(row, "gMethod")),
      targetPromptG: num(get(row, "targetPromptG")),
      batchSize: num(get(row, "batchSize")),
      maxS: num(get(row, "maxS")),
      targetMaxS: num(get(row, "targetMaxS")),
      concurrency: num(get(row, "concurrency")),
      promptOnlyThroughput: num(get(row, "promptOnlyThroughput")),
      genOnlyThroughput: num(get(row, "genOnlyThroughput")),
      throughput: num(get(row, "throughput")),
      throughputPerBox: num(get(row, "throughputPerBox")),
      uncachedThroughput: num(get(row, "uncachedThroughput")),
      uncachedThroughputPerBox: num(get(row, "uncachedThroughputPerBox")),
      cachedThroughput: num(get(row, "cachedThroughput")),
      cachedThroughputPerBox: num(get(row, "cachedThroughputPerBox")),
      ttft: getTtftSec(row),
      realPromptSpeed: num(get(row, "realPromptSpeed")),
      promptSpeedWithQueueing: num(get(row, "promptSpeedWithQueueing")),
      genSpeed: num(get(row, "genSpeed")),
      rpm: num(get(row, "rpm")),
    } satisfies SummaryConfig;
    cfg.inputLength = workload.inputLength;
    cfg.outputLength = workload.outputLength;
    cfg.cachePct = workload.cachePct;
    configs.push(cfg);
  }

  if (!configs.length) {
    throw new Error("Summary sheet: no configuration rows found");
  }

  return { workload, configs };
}

function parseGMSL(sheet: XLSX.WorkSheet): GMSLTable | null {
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
  }) as (string | number | null)[][];

  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    if (row[1] === 1024 || num(row[1]) === 1024) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return null;

  const header = rows[headerIdx];
  const contextLengths = header
    .slice(1)
    .map((c) => num(c))
    .filter((n) => n > 0);

  const tableRows: GMSLTable["rows"] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row[0] == null) continue;
    const g = num(row[0]);
    if (!g) continue;
    const speeds = contextLengths.map((_, j) => {
      const v = row[j + 1];
      return v == null || v === "" ? null : num(v);
    });
    tableRows.push({ g, speeds });
  }

  return tableRows.length ? { contextLengths, rows: tableRows } : null;
}

function parseSimSheet(sheet: XLSX.WorkSheet, name: string): SimSheet | null {
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
  }) as (string | number | null)[][];

  let headerRow = -1;
  let cIdx = 0;
  let tMean = 0;
  let tMed = 0;
  let ttftMean = 0;
  let ttftMed = 0;
  let gMean = 0;
  let gMed = 0;
  let tMin = 0;
  let tMax = 0;

  for (let i = 0; i < rows.length; i++) {
    const labels = (rows[i] ?? []).map((c) => str(c));
    if (labels[0] === "Concurrency") {
      headerRow = i;
      cIdx = labels.indexOf("Concurrency");
      tMean = labels.indexOf("Throughput Mean");
      tMed = labels.indexOf("Throughput Median");
      tMin = labels.indexOf("Throughput Min");
      tMax = labels.indexOf("Throughput Max");
      ttftMean = labels.indexOf("TTFT Mean");
      ttftMed = labels.indexOf("TTFT Median");
      gMean = labels.indexOf("Real Gen Speed Mean");
      gMed = labels.indexOf("Real Gen Speed Median");
      break;
    }
  }

  if (headerRow < 0) return null;

  const simRows: SimRow[] = [];
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row[cIdx] == null) continue;
    const concurrency = num(row[cIdx]);
    if (!concurrency) continue;
    const mean = num(row[tMean]);
    const min = num(row[tMin]);
    const max = num(row[tMax]);
    simRows.push({
      concurrency,
      throughputMean: mean,
      throughputMedian: num(row[tMed]),
      throughputSpread: mean > 0 ? (max - min) / mean : 0,
      ttftMean: num(row[ttftMean]),
      ttftMedian: num(row[ttftMed]),
      genSpeedMean: num(row[gMean]),
      genSpeedMedian: num(row[gMed]),
    });
  }

  if (!simRows.length) return null;
  const label = name.replace(/^sim_/, "").replace(/_/g, " ");
  return { name, label, rows: simRows };
}

export async function parsePerfFile(
  file: File,
  relativePath?: string
): Promise<PerfSweep> {
  const buffer = await file.arrayBuffer();
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "array" });
  } catch {
    throw new Error(`${file.name}: not a valid Excel workbook (corrupt or wrong format)`);
  }

  const validation = validateWorkbook(file.name, wb);
  const errors = validation.issues.filter((i) => i.level === "error");
  if (!validation.ok) {
    throw new Error(
      `${file.name}:\n${errors.map((e) => `  • ${e.message}`).join("\n")}`
    );
  }

  const summaryName = wb.SheetNames.find((n) => n.toLowerCase() === "summary");
  if (!summaryName) {
    throw new Error(`${file.name}: missing Summary sheet`);
  }

  let workload: WorkloadMeta;
  let configs: SummaryConfig[];
  try {
    ({ workload, configs } = parseSummary(wb.Sheets[summaryName]));
  } catch (e) {
    throw new Error(
      `${file.name}: ${e instanceof Error ? e.message : String(e)}`
    );
  }
  const gmslName = wb.SheetNames.find((n) => n.toLowerCase() === "g_msl_table");
  const gmsl = gmslName ? parseGMSL(wb.Sheets[gmslName]) : null;

  const simSheets: SimSheet[] = [];
  for (const name of wb.SheetNames) {
    if (name.toLowerCase().startsWith("sim_")) {
      const sim = parseSimSheet(wb.Sheets[name], name);
      if (sim) simSheets.push(sim);
    }
  }

  const { modelId, profile } = parseModelAndProfile(file.name, relativePath);
  const id = `${modelId}__p${profile ?? "x"}__${file.name}`;

  return {
    id,
    modelId,
    profile,
    fileName: file.name,
    workload,
    configs,
    gmsl,
    simSheets,
  };
}

function normalizeFileInput(input: PerfFileInput): {
  file: File;
  relativePath?: string;
} {
  if (input instanceof File) {
    const rel = (input as File & { webkitRelativePath?: string })
      .webkitRelativePath;
    return { file: input, relativePath: rel || undefined };
  }
  return { file: input.file, relativePath: input.relativePath };
}

export async function parsePerfFiles(
  inputs: PerfFileInput[]
): Promise<ParseBatchResult> {
  const sweeps: PerfSweep[] = [];
  const reports: ParseBatchResult["reports"] = [];

  const normalized = inputs.map(normalizeFileInput);
  const xlsxFiles = normalized.filter((n) => /\.xlsx?$/i.test(n.file.name));
  const skipped = normalized.filter((n) => !/\.xlsx?$/i.test(n.file.name));

  for (const { file } of skipped) {
    reports.push({
      fileName: file.name,
      ok: false,
      issues: [
        {
          level: "error",
          code: "BAD_EXTENSION",
          message: "Skipped: not an .xlsx / .xls file",
        },
      ],
    });
  }

  for (const { file, relativePath } of xlsxFiles) {
    try {
      const sweep = await parsePerfFile(file, relativePath);
      sweeps.push(sweep);
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const warnings = validateWorkbook(file.name, wb).issues.filter(
        (i) => i.level === "warning"
      );
      reports.push({
        fileName: file.name,
        ok: true,
        issues: warnings,
        sweepId: sweep.id,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const lines = msg.includes("\n") ? msg.split("\n").slice(1) : [msg];
      reports.push({
        fileName: file.name,
        ok: false,
        issues: lines.map((line) => ({
          level: "error" as const,
          code: "PARSE_FAILED",
          message: line.replace(/^\s*•\s*/, ""),
        })),
      });
    }
  }

  return { sweeps, reports };
}

/** Primary config row for customer view (G1 if present, else first). */
export function primaryConfig(sweep: PerfSweep) {
  return sweep.configs.find((c) => c.gMethod === "G1") ?? sweep.configs[0];
}

export function passesThreshold(
  cfg: SummaryConfig,
  thresholds: { minGenSpeed: number; maxTtft: number }
): boolean {
  return cfg.genSpeed >= thresholds.minGenSpeed && cfg.ttft <= thresholds.maxTtft;
}
