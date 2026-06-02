# Task 1 — Perf Projection Explorer

**Live URL:** [https://cerebras-assessment-implementation.vercel.app/](https://cerebras-assessment-implementation.vercel.app/)

Next.js app that turns Cerebras perf projection `.xlsx` sweeps into two audience views:

- **Customer / PM** — workload summary, go/no-go vs configurable SLA (min gen speed, max TTFT), selectable concurrency (batch size), per-model boxes/cost proxy, multi-model comparison
- **Engineer** — full Summary config matrix with derived boxes & cost-per-Mtok, automated projection sanity-checks (throughput-vs-batch monotonicity, gen-speed cliffs, TTFT consistency, cache reconciliation), plus G_MSL heatmap & simulation tables when those optional sheets are present, and a cross-model footprint table

Parsing is driven by workbook shape, not a hardcoded model list (e.g. you can upload Model L).

## Prerequisites

- Node.js 18+
- npm

## Run locally

From this directory (`task-1-implementation`):

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **Models A–K** (77 sweeps) load automatically from `public/preloaded/`.
- Use **Choose files**, **Choose folder**, or drag-and-drop to add more sweeps.
- Toggle **Customer / PM** vs **Engineer**. Filter by profile when comparing multiple sweeps.

## Features

- Pre-loaded Models A–K on first visit
- Drag-and-drop, file, and folder upload
- Parse report (per-file errors and warnings)
- Customer view: configurable SLA, concurrency/batch selector, boxes (cost proxy) and full-response-time per model, reference-model % deltas
- Engineer view: derived boxes & cost-per-Mtok columns, and automated projection sanity-checks computed from the Summary sheet alone (so they work on the June single-sheet data, not just legacy workbooks)
- Comparison charts (gen speed, TTFT, throughput when 2+ models loaded)
- Export CSV and shareable URL (compressed state in the link)

## Production build

```bash
npm run build
npm start
```

## Deploy on Vercel

1. Import [cerebras-assessment-implementation](https://github.com/prabhakar1234pr/cerebras-assessment-implementation).
2. Set **Root Directory** to `task-1-implementation`.
3. Deploy (Next.js — default build settings).
4. Paste the deployment URL above and in the Cerebras submission form.

No environment variables required — `.xlsx` parsing runs in the browser.

## Data contract

Workbooks should include:

- `Summary` sheet (standard or June 2026 column headers)
- `G_MSL_table` sheet (optional)
- `sim_*` sheets (optional)

Paths like `Model_<X>_profile_<N>/Model <X> profile <N>.xlsx`.

## Regenerate preloaded manifest

If you replace files under `public/preloaded/`:

```bash
npm run sync:preloaded
```
