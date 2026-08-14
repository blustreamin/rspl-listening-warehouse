#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Preflight + push: rspl-listening-warehouse
# Ship v2: Baby Diapers report — images, navigation, footer
#          logos, print/PDF route, immersion layer
# Run from the repo root AFTER audit sign-off + diff review.
# ============================================================

REPO_NAME="rspl-listening-warehouse"
BUNDLE="public/reports/baby-diapers"
EXPECTED_HTML_COUNT=23        # cover + 21 sections + print.html
ASSET_BUDGET_KB=8192          # emitted assets/ <= 8MB
MAX_SINGLE_ASSET_KB=500       # no un-optimized stragglers

# Code + pipeline files (add/remove per final git status)
FILES_TO_STAGE=(
  "scripts/prepare-report.py"
  "scripts/prepare-assets.py"
  "scripts/report_media.py"
  "scripts/report_nav.py"
  "scripts/report_print.py"
  "scripts/report_immersion.py"
  "scripts/assets-map.json"
)
# Directories staged file-by-file after gates pass
DIRS_TO_STAGE=(
  "scripts/report-assets"
  "$BUNDLE"
)

COMMIT_MSG="Report v2: hero/persona imagery, navigation, footer logos, print-PDF, immersion

- Pipeline refactor: prepare-report.py is a thin orchestrator; per-concern
  modules (media/nav/print/immersion) own their stages
- Assets: 37 source PNGs (71MB) optimized to WebP via Pillow, mapped to
  sections via inventory; emitted assets/ within 8MB budget; raw PNGs
  never enter the repo (optimized derivatives committed under
  scripts/report-assets/ so the pipeline re-runs standalone)
- Chrome: sticky prev/next nav + TOC overlay + progress bar + keyboard nav;
  rebuilt footer with Blustream + RSPL logos (white variants, real files)
- PDF: generated print.html (cover + 21 sections, print CSS, text-selectable
  via browser Save-as-PDF) + Download PDF button — no html2canvas raster
- Immersion: reduced-motion-safe scroll reveals, visual TOC grid cover
  (15 hero thumbnails + 6 placeholders), print-safe
- No DB changes. No migrations.
"

# 0. Which machine am I on? (ShareMouse guard)
echo "============================================"
echo "  HOST: $(hostname)"
echo "  DIR:  $PWD"
echo "============================================"
echo "Confirm right Mac + right folder before proceeding."
echo ""

# 1. Confirm directory
if [[ "$(basename "$PWD")" != "$REPO_NAME" ]]; then
  echo "ERROR: Run from the $REPO_NAME repo root. Currently in: $PWD"; exit 1
fi
[[ -f package.json ]] || { echo "ERROR: No package.json here."; exit 1; }

# 2. Bundle gates
[[ -d "$BUNDLE" ]] || { echo "ERROR: $BUNDLE missing."; exit 1; }
HTML_COUNT=$(find "$BUNDLE" -maxdepth 1 -name "*.html" | wc -l | tr -d ' ')
if [[ "$HTML_COUNT" -ne "$EXPECTED_HTML_COUNT" ]]; then
  echo "ERROR: expected $EXPECTED_HTML_COUNT HTML in $BUNDLE, found $HTML_COUNT."; exit 1
fi
for f in index.html print.html; do
  [[ -f "$BUNDLE/$f" ]] || { echo "ERROR: $BUNDLE/$f missing."; exit 1; }
done
# Raw-PNG tripwire: nothing over MAX_SINGLE_ASSET_KB anywhere in the bundle
BIG=$(find "$BUNDLE" -type f -size +"${MAX_SINGLE_ASSET_KB}"k || true)
if [[ -n "$BIG" ]]; then
  echo "ERROR: oversized file(s) in bundle (un-optimized?):"; echo "$BIG"; exit 1
fi
# Asset budget
if [[ -d "$BUNDLE/assets" ]]; then
  ASSET_KB=$(du -sk "$BUNDLE/assets" | cut -f1)
  if [[ "$ASSET_KB" -gt "$ASSET_BUDGET_KB" ]]; then
    echo "ERROR: $BUNDLE/assets is ${ASSET_KB}KB (> ${ASSET_BUDGET_KB}KB budget)."; exit 1
  fi
  echo "✓ assets ${ASSET_KB}KB (budget ${ASSET_BUDGET_KB}KB)"
else
  echo "ERROR: $BUNDLE/assets missing."; exit 1
fi
# Scaffold-leak tripwire
if grep -rlE 'LOCKED|Nikita|Phase 1|nikita' "$BUNDLE" >/dev/null 2>&1; then
  echo "ERROR: scaffold markers present:"; grep -rlE 'LOCKED|Nikita|Phase 1|nikita' "$BUNDLE"; exit 1
fi
# Source/emitted asset drift check (stale-copy bug class)
if [[ -d "scripts/report-assets/assets" ]]; then
  if ! diff -rq "scripts/report-assets/assets" "$BUNDLE/assets" >/dev/null 2>&1; then
    echo "ERROR: scripts/report-assets/assets and $BUNDLE/assets differ — re-run pipeline."; exit 1
  fi
  echo "✓ source and emitted assets byte-identical"
fi
echo "✓ bundle gates passed ($HTML_COUNT HTML, 0 scaffold markers)"

# 3. Real build
echo "→ Running npm run build..."
npm run build || { echo "ERROR: build failed."; exit 1; }
DIST_COUNT=$(find dist/reports/baby-diapers -maxdepth 1 -name "*.html" 2>/dev/null | wc -l | tr -d ' ')
if [[ "$DIST_COUNT" -ne "$EXPECTED_HTML_COUNT" ]]; then
  echo "ERROR: dist has $DIST_COUNT HTML (expected $EXPECTED_HTML_COUNT)."; exit 1
fi
echo "✓ build green, bundle in dist ($DIST_COUNT files)"

# 4. Show diff
echo ""; echo "=== CHANGES TO COMMIT ==="
git status --short
echo ""; git diff --stat
echo "========================="
[[ -n "$(git status --porcelain)" ]] || { echo "Nothing to commit."; exit 0; }

# 5. Countdown
echo ""; echo "Committing in 5 seconds. Ctrl+C to abort."
for i in 5 4 3 2 1; do echo -n "$i "; sleep 1; done; echo ""

# 6. Stage named files, then gated directories file-by-file. Never git add .
for f in "${FILES_TO_STAGE[@]}"; do
  [[ -e "$f" ]] || { echo "ERROR: file not found: $f"; exit 1; }
  git add "$f"
done
for d in "${DIRS_TO_STAGE[@]}"; do
  [[ -d "$d" ]] || { echo "ERROR: dir not found: $d"; exit 1; }
  find "$d" -type f -print0 | while IFS= read -r -d '' f; do git add "$f"; done
done

git commit -m "$COMMIT_MSG"
git push origin main

# 7. SHA + URL
SHA=$(git rev-parse HEAD)
REPO_SLUG=$(git config --get remote.origin.url | sed -E 's#.*github\.com[:/](.+)$#\1#' | sed 's#\.git$##')
echo ""; echo "✓ Pushed: $SHA"
echo "→ https://github.com/$REPO_SLUG/commit/$SHA"
echo "→ Verify live:"
echo "  https://rspl-listening-warehouse.vercel.app/reports/baby-diapers/index.html"
echo "  (click through nav, open Download PDF, spot-check §06 personas)"
