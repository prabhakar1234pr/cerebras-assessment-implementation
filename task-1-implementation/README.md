# Task 1 — Perf Projection Explorer

<!-- LIVE_URL: Deploy to Vercel and paste your URL here before submission -->

**Live URL:** _(deploy with steps below — required for submission)_

Next.js app that turns Cerebras perf projection `.xlsx` sweeps into two audience views:

- **Customer / PM** — workload summary, go/no-go vs configurable SLA (min gen speed, max TTFT), multi-model comparison
- **Engineer** — full Summary config matrix, G_MSL heatmap, simulation variance flags, cross-model table

Upload works for **any** model id (e.g. Model L) — parsing is driven by file shape, not a hardcoded model list.

## Prerequisites

- Node.js 18+
- npm

## Install & run locally

```bash
cd "task-1 implementation"
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

1. On open, **Models A–K are pre-loaded** (77 sweeps) — no upload needed.  
2. **Choose files** / **Choose folder** / drag-and-drop — add Model L or other sweeps from `../perf_data/`.

Toggle **Customer / PM** vs **Engineer**. Use profile filter when comparing multiple sweeps.

### Sync shipped perf data into the app

After `git pull` updates `../perf_data/`:

```bash
npm run sync:preloaded
```

Copies the latest zip extract into `public/preloaded/` and regenerates the manifest.

### Features

- **Pre-loaded Models A–K** on first visit (per June 2026 reviewer requirement)
- **Drag-and-drop** upload zone (plus file/folder pickers)
- **Parse report** — per-file errors and warnings (missing sheets, bad columns, etc.)
- **Reference model** — pick a baseline; tables show % delta vs reference
- **Comparison charts** — gen speed, TTFT, throughput (when 2+ models loaded)
- **Export CSV** — download comparison table
- **Share link** — copies URL with compressed sweep data + settings (recipient opens same view)

## Build for production

```bash
npm run build
npm start
```

## Deploy to Vercel (free)

1. Push this folder (or monorepo) to a **private** GitHub repo.
2. [vercel.com](https://vercel.com) → New Project → import repo.
3. Set **Root Directory** to `task-1 implementation` if the repo is the challenge monorepo.
4. Framework: Next.js (auto-detected). Build: `npm run build`, output default.
5. Deploy → copy URL into this README and the Cerebras submission form.

No server secrets required — `.xlsx` parsing runs in the browser.

## Data contract

Expects workbooks with:

- `Summary` sheet (standard column headers)
- `G_MSL_table` sheet (optional)
- `sim_*` sheets (optional)

Filename or path like `Model_<X>_profile_<N>/Model <X> profile <N>.xlsx`.

## Video walkthrough

Record ≤5 min covering Task 1 questions in `../Task1_Performance.md` (audiences, framework choice, assumptions, model/profile interpretations).
