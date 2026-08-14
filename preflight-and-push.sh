#!/usr/bin/env bash
# preflight-and-push.sh — RSPL Listening Warehouse landing (5-agent overhaul)
# Generic Blustream preflight+push (this repo is NOT atlas/website, so
# blustream-deploy doesn't govern — but every gate does).
#
# What it does, in order: assert repo root → npm install (package.json changed)
# → REAL build (npm run build, NOT tsc) → show the diff → 5s abort window →
# stage NAMED files only (never git add .) → one commit → one push.
#
# It does NOT run migrations (none — DB work was MCP), does NOT touch Supabase,
# does NOT run the final assemble (that's an announced manual step AFTER deploy).
#
# Run from the repo root:  bash preflight-and-push.sh
set -euo pipefail

echo "──────────────────────────────────────────────────────────────"
echo " RSPL Warehouse — preflight + push"
echo "──────────────────────────────────────────────────────────────"

# 1. Repo root sanity (the wrong-directory trip)
if [ ! -f package.json ] || [ ! -d .git ]; then
  echo "✗ Not at repo root (need package.json + .git). cd into rspl-listening-warehouse first."
  exit 1
fi
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" != "main" ]; then
  echo "✗ On branch '$BRANCH', expected 'main'. Stopping."
  exit 1
fi
echo "✓ Repo root, branch main"

# 2. Deps (package.json changed: E's qa:report script + any dep)
echo ""
echo "▶ npm install (package.json changed this session)…"
npm install

# 3. THE gate — real production build. tsc alone is NOT sufficient.
echo ""
echo "▶ npm run build (the only valid green light)…"
if ! npm run build; then
  echo "✗ BUILD FAILED. Nothing staged, nothing pushed. Fix in Antigravity and re-run."
  exit 1
fi
echo "✓ Build green"

# 4. Show exactly what will ship
echo ""
echo "▶ Working tree:"
git status --short
echo ""
echo "▶ Diff stat:"
git diff --stat
echo ""
echo "▶ Untracked files that WILL be added (new agent files):"
printf '   %s\n' \
  "api/_lib/assemble.ts" \
  "api/_lib/indiaGate.ts" \
  "services/graphAssembly.ts" \
  "services/analyses/ (analysisTypes, classifiers, babyDiapersAnalyses, register, README)" \
  "scripts/repro-assemble.ts" \
  "scripts/analyses-smoke.ts" \
  "scripts/qa/ (harness + baseline json)" \
echo ""
echo "   NOTE: *-PHASE-A-REPORT.md, *-PHASE-B-REPORT.md, AGENT-*-MAP.md,"
echo "   BLOCKED-DECISIONS.md and scratchpad/ are agent scaffolding —"
echo "   confirm .gitignore excludes them (Agent A/E added ignore lines)."

# 5. Abort window
echo ""
echo "──────────────────────────────────────────────────────────────"
echo " Review the diff above. Staging in 5s — Ctrl+C to abort."
echo "──────────────────────────────────────────────────────────────"
for i in 5 4 3 2 1; do printf " %s…" "$i"; sleep 1; done
echo ""

# 6. Stage NAMED files only — never `git add .`
echo "▶ Staging named files…"
git add \
  App.tsx \
  api/evidence.ts \
  api/_lib/assemble.ts \
  api/_lib/indiaGate.ts \
  components/DataStudio.tsx \
  components/ReportView.tsx \
  components/report/LovingleSections.tsx \
  components/report/blocks/BookletBlocks.tsx \
  lib/persistence.ts \
  package.json \
  package-lock.json \
  services/fileStore.ts \
  services/graphAssembly.ts \
  services/ingestion/babyDiapersIngestion.ts \
  services/mappingService.ts \
  services/babyDiapersSynthesis.ts \
  templates/baby_diapers_template.ts \
  utils/verbatimProvenance.ts \
  styles/booklet.css \
  styles/lovingle.css \
  types.ts \
  vercel.json \
  .gitignore \
  services/analyses \
  scripts/repro-assemble.ts \
  scripts/analyses-smoke.ts \
  scripts/qa \

echo ""
echo "▶ Final staged set:"
git status --short

# 7. One commit, one push
echo ""
echo "▶ Commit + push…"
git commit -m "RSPL warehouse: server-side assembly + India gate, prompt overhaul, new analyses, UI/PDF pass, QA harness

Assembly (A): server-side atomic assemble (api/_lib/assemble.ts), India-only
geo gate + 36-month window (indiaGate.ts), maxDuration 300, structural
linkless-graph veto, score->rating mapping removed. Fixes the browser-PUT
silent-persist failure and the bundle-only wrong-corpus vector.

Prompts (B): GLOBAL_STYLE_CONTRACT (one inherited block), Indic-language
voice admitted (capsule + provenance), translation law w/ original_text,
DO_NOT_RESTATE register, six-stage lifestage, coverage_declaration, per-section
deltas (N-05/07/09/13/14/15/16/17/19/29/42/45/47/50/51/52/53/54/56).

Analyses (C): assemble-time analyses layer over post-gate raw rows
(services/analyses/*), insufficient-signal law, versioned by graph id.

UI/PDF (D): battery meters, chart footnotes, brand logo slots + SOV/stars
upfront, inline-SVG icons, persona 2x2, S20 panels, N-18 export label fix,
V-03 footnote leak fixed.

QA (E): npm run qa:report export gate (scripts/qa/), keyed to register IDs.

DB cleanup + India gate applied out-of-band via Supabase MCP. No migrations
in this commit."

git push origin main

SHA="$(git rev-parse HEAD)"
echo ""
echo "──────────────────────────────────────────────────────────────"
echo " ✓ Pushed. SHA: $SHA"
echo "   https://github.com/blustreamin/rspl-listening-warehouse/commit/$SHA"
echo ""
echo " NEXT (do NOT skip, in order):"
echo "  1. Watch Vercel → deployment READY (not just queued)."
echo "  2. Tell Claude: deploy is READY."
echo "  3. Claude verifies live GET /api/evidence still 200 (report unbroken)."
echo "  4. THEN the announced final act: POST mode:assemble for baby-diapers."
echo "  Do not click Run or ingest in Data Studio until after the final act."
echo "──────────────────────────────────────────────────────────────"
