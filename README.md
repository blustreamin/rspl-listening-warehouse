# RSPL Listening Warehouse

A social listening intelligence platform built with React, TypeScript, and Vite. Powered by Google Gemini AI for data synthesis and report generation.

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS (CDN)
- **AI**: Google Gemini API (`@google/genai`)
- **Data**: SheetJS (xlsx) for spreadsheet parsing

## Local Development

```bash
npm install
cp .env.example .env.local
# Edit .env.local and add your Gemini API key
npm run dev
```

The app runs at `http://localhost:3000`.

## Deploy to Vercel via GitHub

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/rspl-listening-warehouse.git
git branch -M main
git push -u origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Import the GitHub repository
4. Vercel will auto-detect **Vite** — no config changes needed
5. **Add Environment Variable** before deploying:
   - Key: `GEMINI_API_KEY`
   - Value: Your Google Gemini API key
6. Click **Deploy**

### 3. Environment Variables (Required)

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key for AI-powered synthesis |

> **Important**: The API key is embedded at build time via `vite.config.ts`. After adding/changing the env var in Vercel, trigger a **redeploy** for it to take effect.

## Build

```bash
npm run build    # Output in ./dist
npm run preview  # Preview production build locally
```

---

## v2 Architecture — Multi-provider backend + Supabase persistence

The app no longer calls LLMs from the browser or bakes any key into the bundle.
A thin **Vercel API tier** (`/api/*`) holds all secrets and does persistence:

```
Browser (Vite SPA — zero secrets)
   │  fetch /api/*
   ▼
Vercel API routes ── service-role key ──▶  Supabase (Postgres + Storage)
   └───────────── provider keys ────────▶  Gemini · Anthropic · OpenAI
```

### LLM providers
All synthesis routes through `POST /api/llm`, which selects a provider adapter
(`api/_lib/providers/`). Configure any subset of `GEMINI_API_KEY`,
`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`. The in-app sidebar selector lets you pick
which configured provider runs synthesis (handy for comparing output). With **no**
key set, the app runs in deterministic **seed mode** and still renders fully.
Models are env-overridable (`GEMINI_MODEL`, `ANTHROPIC_MODEL`, `OPENAI_MODEL`).
> Note: Google-Search grounding is Gemini-only; Claude/GPT synthesise without it
> (seed-merge covers thin evidence).

### Persistence (Supabase project `skzkkwvafociwfggwzce`)
Four tables, all server-only (RLS on, no anon policies; the service role bypasses
RLS): `datasets` (metadata; raw rows in the private `warehouse-datasets` Storage
bucket), `evidence_graphs`, `section_outputs` (the synthesis **cache**, keyed on
`project_id + section_id + evidence_hash + provider`), and `runs`. The bucket is
created automatically by the API on first upload. If the Supabase env vars are
absent, every persistence call degrades to a silent no-op.

### Local development
`vite dev` alone serves the client but **not** `/api`. For the full stack locally:

```bash
npm i -g vercel
vercel dev        # or: npm run dev:full
```

Set the env vars from `.env.example` in the Vercel project (or a local `.env`).
Alternatively, run `vite dev` and point it at a deployed backend with
`VITE_API_BASE=https://your-app.vercel.app`.

### Build / typecheck
```bash
npm run build       # vite — client only; server SDKs never enter the bundle
npm run typecheck   # tsc --noEmit across client + /api
```

> Heads-up: `api/llm.ts` is configured for `maxDuration: 60` in `vercel.json`,
> which requires a Vercel **Pro** plan. On Hobby (10s cap) heavy synthesis with
> high thinking budgets may time out.
