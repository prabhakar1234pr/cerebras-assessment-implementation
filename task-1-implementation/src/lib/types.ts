export interface SummaryConfig {
  inputLength: number;
  outputLength: number;
  cachePct: number;
  gMethod: string;
  targetPromptG: number;
  batchSize: number;
  maxS: number;
  targetMaxS: number;
  concurrency: number;
  promptOnlyThroughput: number;
  genOnlyThroughput: number;
  throughput: number;
  throughputPerBox: number;
  uncachedThroughput: number;
  uncachedThroughputPerBox: number;
  cachedThroughput: number;
  cachedThroughputPerBox: number;
  ttft: number;
  realPromptSpeed: number;
  promptSpeedWithQueueing: number;
  genSpeed: number;
  rpm: number;
}

export interface WorkloadMeta {
  inputLength: number;
  outputLength: number;
  cachePct: number;
}

export interface GMSLTable {
  contextLengths: number[];
  rows: { g: number; speeds: (number | null)[] }[];
}

export interface SimRow {
  concurrency: number;
  throughputMean: number;
  throughputMedian: number;
  throughputSpread: number;
  ttftMean: number;
  ttftMedian: number;
  genSpeedMean: number;
  genSpeedMedian: number;
}

export interface SimSheet {
  name: string;
  label: string;
  rows: SimRow[];
}

export interface PerfSweep {
  id: string;
  modelId: string;
  profile: number | null;
  fileName: string;
  workload: WorkloadMeta;
  configs: SummaryConfig[];
  gmsl: GMSLTable | null;
  simSheets: SimSheet[];
}

export interface CustomerThresholds {
  minGenSpeed: number;
  maxTtft: number;
}

export type ViewMode = "customer" | "engineer";

export type ValidationIssue = {
  level: "error" | "warning";
  code: string;
  message: string;
};

export type FileParseReport = {
  fileName: string;
  ok: boolean;
  issues: ValidationIssue[];
  sweepId?: string;
};

export type ParseBatchResult = {
  sweeps: PerfSweep[];
  reports: FileParseReport[];
};

/** File from upload (webkitRelativePath) or preloaded fetch (explicit path). */
export type PerfFileInput =
  | File
  | { file: File; relativePath?: string };
