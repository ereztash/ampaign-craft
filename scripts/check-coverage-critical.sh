#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# check-coverage-critical.sh
#
# Enforces a minimum 50% statement coverage on the three engines that contain
# the most business-critical behavioral-science logic.  Run after vitest
# --coverage so that coverage/coverage-summary.json exists.
#
# Usage (CI):
#   npx vitest run --coverage && bash scripts/check-coverage-critical.sh
#
# Exit codes:  0 = all files pass  |  1 = one or more files below threshold
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SUMMARY="coverage/coverage-summary.json"
THRESHOLD=85

CRITICAL_FILES=(
  "src/engine/pricingWizardEngine.ts"
  "src/engine/hormoziValueEngine.ts"
  "src/engine/archetypeClassifier.ts"
)

if [[ ! -f "$SUMMARY" ]]; then
  echo "❌  $SUMMARY not found. Run vitest with --coverage first."
  exit 1
fi

FAILED=0

for FILE in "${CRITICAL_FILES[@]}"; do
  # coverage-summary.json uses absolute paths as keys; we match by suffix
  PCT=$(node -e "
    const fs = require('fs');
    const summary = JSON.parse(fs.readFileSync('$SUMMARY', 'utf8'));
    const key = Object.keys(summary).find(k => k.endsWith('$FILE'));
    if (!key) { console.log('NOT_FOUND'); process.exit(0); }
    console.log(summary[key].statements.pct);
  ")

  if [[ "$PCT" == "NOT_FOUND" ]]; then
    echo "⚠️   $FILE — not found in coverage report (not yet exercised by tests)"
    FAILED=1
    continue
  fi

  # Compare as integers (truncate decimals)
  INT_PCT=${PCT%.*}
  if (( INT_PCT < THRESHOLD )); then
    echo "❌  $FILE — statements: ${PCT}% (required: ${THRESHOLD}%)"
    FAILED=1
  else
    echo "✅  $FILE — statements: ${PCT}%"
  fi
done

if (( FAILED )); then
  echo ""
  echo "One or more critical engines are below the ${THRESHOLD}% statement-coverage threshold."
  echo "Add tests before merging. See docs: vitest.config.ts → coverage.thresholds"
  exit 1
fi

echo ""
echo "All critical-engine coverage checks passed (≥${THRESHOLD}%)."
