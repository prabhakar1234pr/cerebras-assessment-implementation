import * as XLSX from "xlsx";
import type { ValidationIssue } from "./types";

const REQUIRED_SUMMARY_COLUMNS = [
  "Input Length",
  "Output Length",
  "Cache %",
  "Throughput (t/s)",
  "Gen Speed (t/s/user)",
] as const;

const TTFT_COLUMNS = ["TTFT (sec)", "TTFT (ms)"] as const;

export type FileValidationResult = {
  fileName: string;
  ok: boolean;
  issues: ValidationIssue[];
};

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/** Pre-parse checks with actionable messages (no full parse). */
export function validateWorkbook(
  fileName: string,
  wb: XLSX.WorkBook
): FileValidationResult {
  const issues: ValidationIssue[] = [];

  if (!/\.xlsx?$/i.test(fileName)) {
    issues.push({
      level: "error",
      code: "BAD_EXTENSION",
      message: "File must be .xlsx or .xls",
    });
    return { fileName, ok: false, issues };
  }

  if (!wb.SheetNames.length) {
    issues.push({
      level: "error",
      code: "NO_SHEETS",
      message: "Workbook has no sheets",
    });
    return { fileName, ok: false, issues };
  }

  const summaryName = wb.SheetNames.find((n) => n.toLowerCase() === "summary");
  if (!summaryName) {
    issues.push({
      level: "error",
      code: "MISSING_SUMMARY",
      message: `Missing required "Summary" sheet. Found: ${wb.SheetNames.join(", ")}`,
    });
    return { fileName, ok: false, issues };
  }

  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(
    wb.Sheets[summaryName],
    { header: 1, defval: null }
  ) as (string | number | null)[][];

  let headerLabels: string[] = [];
  let headerRow = -1;
  for (let i = 0; i < rows.length; i++) {
    const labels = (rows[i] ?? []).map((c) => str(c));
    if (
      labels.includes("Input Length") &&
      labels.includes("Throughput (t/s)")
    ) {
      headerRow = i;
      headerLabels = labels.filter(Boolean);
      break;
    }
  }

  if (headerRow < 0) {
    issues.push({
      level: "error",
      code: "SUMMARY_HEADER",
      message:
        'Summary sheet: could not find header row (need "Input Length" and "Throughput (t/s)" columns)',
    });
    return { fileName, ok: false, issues };
  }

  const missing = REQUIRED_SUMMARY_COLUMNS.filter(
    (col) => !headerLabels.includes(col)
  );
  if (missing.length) {
    issues.push({
      level: "error",
      code: "SUMMARY_COLUMNS",
      message: `Summary sheet missing columns: ${missing.join(", ")}`,
    });
  }
  if (!TTFT_COLUMNS.some((col) => headerLabels.includes(col))) {
    issues.push({
      level: "error",
      code: "SUMMARY_COLUMNS",
      message: `Summary sheet missing TTFT column (need ${TTFT_COLUMNS.join(" or ")})`,
    });
  }

  const inIdx = headerLabels.indexOf("Input Length");
  const thrIdx = headerLabels.indexOf("Throughput (t/s)");
  let configRows = 0;
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c == null || c === "")) continue;
    const inLen = row[inIdx];
    const thr = thrIdx >= 0 ? row[thrIdx] : null;
    if (
      (typeof inLen === "number" && inLen > 0) ||
      (typeof thr === "number" && thr > 0)
    ) {
      configRows++;
    }
  }

  if (configRows === 0) {
    issues.push({
      level: "error",
      code: "NO_CONFIG_ROWS",
      message:
        "Summary sheet has no configuration rows (need numeric Input Length on at least one row)",
    });
  }

  const hasGmsl = wb.SheetNames.some((n) => n.toLowerCase() === "g_msl_table");
  const hasSim = wb.SheetNames.some((n) => n.toLowerCase().startsWith("sim_"));

  if (!hasGmsl) {
    issues.push({
      level: "warning",
      code: "NO_GMSL",
      message: "Optional G_MSL_table sheet not found (engineer heatmap will be empty)",
    });
  }
  if (!hasSim) {
    issues.push({
      level: "warning",
      code: "NO_SIM",
      message: "No sim_* sheets found (variance flags will be unavailable)",
    });
  }

  const hasErrors = issues.some((i) => i.level === "error");
  return { fileName, ok: !hasErrors, issues };
}
