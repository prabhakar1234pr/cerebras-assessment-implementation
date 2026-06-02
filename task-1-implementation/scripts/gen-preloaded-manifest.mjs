import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "public", "preloaded");
const paths = [];

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (name.endsWith(".xlsx")) paths.push(path.relative(root, full).replace(/\\/g, "/"));
  }
}

walk(root);
paths.sort();

const out = path.join(__dirname, "..", "src", "lib", "preloadedManifest.ts");
const body = `/** Auto-generated — run: npm run sync:preloaded */\nexport const PRELOADED_PATHS = [\n${paths.map((p) => `  "${p}",`).join("\n")}\n] as const;\n`;
fs.writeFileSync(out, body);
console.log(`Wrote ${paths.length} paths to preloadedManifest.ts`);
