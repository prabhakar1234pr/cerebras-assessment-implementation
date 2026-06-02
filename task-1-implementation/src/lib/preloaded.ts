import { PRELOADED_PATHS } from "./preloadedManifest";
import { parsePerfFiles } from "./parsePerfXlsx";
import type { ParseBatchResult } from "./types";

const BASE = "/preloaded";

export async function loadPreloadedSweeps(): Promise<ParseBatchResult> {
  const inputs: { file: File; relativePath: string }[] = [];

  for (const rel of PRELOADED_PATHS) {
    const url = `${BASE}/${rel.split("/").map(encodeURIComponent).join("/")}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load preloaded file: ${rel}`);
    }
    const blob = await res.blob();
    const name = rel.split("/").pop() ?? rel;
    const file = new File([blob], name, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    inputs.push({ file, relativePath: rel });
  }

  return parsePerfFiles(inputs);
}

export const PRELOADED_MODEL_COUNT = 11;
export const PRELOADED_SWEEP_COUNT = PRELOADED_PATHS.length;
