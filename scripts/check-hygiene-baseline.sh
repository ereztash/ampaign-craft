#!/usr/bin/env bash
# check-hygiene-baseline.sh
# Regression guard: ensures hygiene counters never increase above their
# committed baseline. Run in CI after lint. Exit 1 if any counter regresses.

set -euo pipefail

BASELINE="$(dirname "$0")/hygiene-baseline.json"
SRC="src"
FAIL=0

# ─── helpers ──────────────────────────────────────────────────────────────────
read_baseline() {
  python3 -c "import json,sys; print(json.load(open('$BASELINE'))['$1'])"
}

count_matches() {
  # Count grep matches in non-test src files; return 0 if nothing found
  grep -rn "$1" "$SRC/" --include='*.ts' --include='*.tsx' \
    | grep -v '__tests__\|\.test\.\|\.spec\.\|/test/' \
    | wc -l | tr -d ' ' || echo 0
}

check() {
  local label="$1"
  local actual="$2"
  local baseline
  baseline=$(read_baseline "$3")

  if [ "$actual" -gt "$baseline" ]; then
    echo "FAIL  $label: $actual > baseline $baseline  (+$((actual - baseline)) regressions)"
    FAIL=1
  else
    echo "OK    $label: $actual  (baseline $baseline)"
  fi
}

# ─── counters ─────────────────────────────────────────────────────────────────
RAW_STORAGE=$(count_matches 'localStorage\|sessionStorage')
CONSOLE_CALLS=$(count_matches 'console\.\(log\|warn\|error\|info\|debug\)')
SUPABASE_CAST=$(count_matches 'as unknown as SupabaseClient')
EXPLICIT_ANY=$(count_matches ': any\b\|as any\b')
EXHAUSTIVE=$(count_matches 'react-hooks/exhaustive-deps')

# ─── comparisons ──────────────────────────────────────────────────────────────
echo "=== Hygiene baseline check ($(date +%Y-%m-%d)) ==="
check "raw_storage_calls"             "$RAW_STORAGE"    "raw_storage_calls"
check "console_calls"                 "$CONSOLE_CALLS"  "console_calls"
check "supabase_any_cast"             "$SUPABASE_CAST"  "supabase_any_cast"
check "explicit_any"                  "$EXPLICIT_ANY"   "explicit_any"
check "exhaustive_deps_suppressions"  "$EXHAUSTIVE"     "exhaustive_deps_suppressions"

if [ $FAIL -ne 0 ]; then
  echo ""
  echo "Hygiene regression detected. Fix new violations or update the baseline"
  echo "in scripts/hygiene-baseline.json with a PR that explains the tradeoff."
  exit 1
fi

echo "All hygiene counters within baseline."
