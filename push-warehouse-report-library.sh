#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Preflight + push: rspl-listening-warehouse
# Ship: Baby Diapers Category Report — static bundle + Report Library tab
# Run from the repo root in Antigravity's terminal, AFTER audit sign-off.
# ============================================================

REPO_NAME="rspl-listening-warehouse"
REPORT_DIR="public/reports/baby-diapers"
EXPECTED_HTML_COUNT=22   # cover + 21 sections

FILES_TO_STAGE=(
  "scripts/prepare-report.py"
  "App.tsx"
  "components/ReportsLibrary.tsx"
  "constants/reports.ts"
)

COMMIT_MSG="Add Baby Diapers Category Report bundle + Report Library tab

- scripts/prepare-report.py: scrub + rename pipeline (prototype HTMLs ->
  client-safe category report; 0 scaffold markers, 0 broken links verified)
- public/reports/baby-diapers/: 22 static files (cover index.html + 21
  sections), canonical numbered scheme, shared rpt-top/rpt-foot chrome,
  graceful onerror on 4 absent hero images (A01/A02/A04/A10)
- Report Library: new Workspaces tab in App.tsx -> ReportsLibrary card,
  fed by static manifest constants/reports.ts; opens cover in new tab
- No DB changes. No migrations. Source prototypes not committed; the
  script is the durable record of the transformation.
"

# 0. Which machine am I on? (ShareMouse guard)
echo "============================================"
echo "  HOST: $(hostname)"
echo "  DIR:  $PWD"
echo "============================================"
echo "Confirm this is the right Mac and the right folder before proceeding."
echo ""

# 1. Confirm directory
if [[ "$(basename "$PWD")" != "$REPO_NAME" ]]; then
  echo "ERROR: Run this from the $REPO_NAME repo root. Currently in: $PWD"
  exit 1
fi
if [[ ! -f package.json ]]; then
  echo "ERROR: No package.json here. Wrong directory?"
  exit 1
fi

# 2. Report bundle sanity — exactly 22 HTML files, nothing else, cover present
if [[ ! -d "$REPORT_DIR" ]]; then
  echo "ERROR: $REPORT_DIR does not exist. Did prepare-report.py run?"
  exit 1
fi
HTML_COUNT=$(find "$REPORT_DIR" -maxdepth 1 -name "*.html" | wc -l | tr -d ' ')
NON_HTML=$(find "$REPORT_DIR" -type f ! -name "*.html" | wc -l | tr -d ' ')
if [[ "$HTML_COUNT" -ne "$EXPECTED_HTML_COUNT" ]]; then
  echo "ERROR: expected $EXPECTED_HTML_COUNT HTML files in $REPORT_DIR, found $HTML_COUNT."
  exit 1
fi
if [[ "$NON_HTML" -ne 0 ]]; then
  echo "ERROR: $NON_HTML non-HTML file(s) in $REPORT_DIR — inspect before shipping:"
  find "$REPORT_DIR" -type f ! -name "*.html"
  exit 1
fi
if [[ ! -f "$REPORT_DIR/index.html" ]]; then
  echo "ERROR: $REPORT_DIR/index.html (cover) missing."
  exit 1
fi
# Scaffold-leak tripwire (belt and braces on top of the audit)
if grep -rlE 'LOCKED|Nikita|Phase 1|nikita' "$REPORT_DIR" >/dev/null 2>&1; then
  echo "ERROR: scaffold markers still present in bundle:"
  grep -rlE 'LOCKED|Nikita|Phase 1|nikita' "$REPORT_DIR"
  exit 1
fi
echo "✓ report bundle sane ($HTML_COUNT HTML files, 0 scaffold markers)"

# 3. Real build (the only valid green light — not tsc)
echo "→ Running npm run build..."
if ! npm run build; then
  echo "ERROR: build failed. Fix and re-run."
  exit 1
fi
# Confirm the bundle made it into dist
DIST_COUNT=$(find dist/reports/baby-diapers -maxdepth 1 -name "*.html" 2>/dev/null | wc -l | tr -d ' ')
if [[ "$DIST_COUNT" -ne "$EXPECTED_HTML_COUNT" ]]; then
  echo "ERROR: dist/reports/baby-diapers has $DIST_COUNT HTML files (expected $EXPECTED_HTML_COUNT)."
  exit 1
fi
echo "✓ build green, bundle present in dist ($DIST_COUNT files)"

# 4. Show diff
echo ""
echo "=== CHANGES TO COMMIT ==="
git status --short
echo ""
git diff --stat
echo "========================="

if [[ -z "$(git status --porcelain)" ]]; then
  echo "Nothing to commit. Exiting clean."
  exit 0
fi

# 5. Countdown
echo ""
echo "Committing in 5 seconds. Ctrl+C to abort."
for i in 5 4 3 2 1; do echo -n "$i "; sleep 1; done
echo ""

# 6. Stage named files only — never git add .
for f in "${FILES_TO_STAGE[@]}"; do
  if [[ ! -e "$f" ]]; then
    echo "ERROR: file not found: $f"
    exit 1
  fi
  git add "$f"
done
# Stage the 22 bundle files individually (counted + verified above)
find "$REPORT_DIR" -maxdepth 1 -name "*.html" -print0 | while IFS= read -r -d '' f; do
  git add "$f"
done

git commit -m "$COMMIT_MSG"
git push origin main

# 7. Print SHA + URL
SHA=$(git rev-parse HEAD)
REPO_SLUG=$(git config --get remote.origin.url | sed -E 's#.*github\.com[:/](.+)(\.git)?#\1#' | sed 's#\.git$##')
echo ""
echo "✓ Pushed: $SHA"
echo "→ https://github.com/$REPO_SLUG/commit/$SHA"
echo "→ Vercel will auto-deploy. Verify at:"
echo "  https://rspl-listening-warehouse.vercel.app/reports/baby-diapers/index.html"
