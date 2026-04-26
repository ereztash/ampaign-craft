#!/usr/bin/env bash
# check-brand-locked.sh
# Warns if the three locked brand anchor values have changed.
# Called via: npm run check:brand
# Also used by the brand-lock-warn CI job on PRs.
# Exit 0 always — warn-only per design. CI hard-fail is intentionally absent.

set -euo pipefail

ANCHORS_FILE="src/styles/brand-locked-tokens.css"
INDEX_CSS="src/index.css"

EXPECTED_NAVY_LIGHT="216 68% 26%"
EXPECTED_GROWTH_LIGHT="152 58% 40%"
EXPECTED_CANVAS_LIGHT="210 22% 98%"
EXPECTED_NAVY_DARK="213 65% 65%"
EXPECTED_GROWTH_DARK="152 52% 52%"
EXPECTED_CANVAS_DARK="222 24%  7%"

VIOLATIONS=0

check_value() {
  local label="$1"
  local expected="$2"
  local file="$3"

  if ! grep -qF "$expected" "$file"; then
    echo "⚠  BRAND LOCK WARNING: '$label' value '$expected' not found in $file"
    echo "   These three colors are part of FunnelForge's Distinctive Brand Asset moat."
    echo "   If this is intentional, add [brand-amendment] to the PR body and link a design review."
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
}

check_value "--brand-navy-anchor-hsl (light)"  "$EXPECTED_NAVY_LIGHT"   "$ANCHORS_FILE"
check_value "--brand-growth-anchor-hsl (light)" "$EXPECTED_GROWTH_LIGHT" "$ANCHORS_FILE"
check_value "--brand-canvas-anchor-hsl (light)" "$EXPECTED_CANVAS_LIGHT" "$ANCHORS_FILE"
check_value "--brand-navy-anchor-hsl (dark)"   "$EXPECTED_NAVY_DARK"    "$ANCHORS_FILE"
check_value "--brand-growth-anchor-hsl (dark)" "$EXPECTED_GROWTH_DARK"  "$ANCHORS_FILE"
check_value "--brand-canvas-anchor-hsl (dark)" "$EXPECTED_CANVAS_DARK"  "$ANCHORS_FILE"

# Also check index.css primary/accent/background are aligned
check_value "--primary light (index.css)"    "$EXPECTED_NAVY_LIGHT"   "$INDEX_CSS"
check_value "--accent light (index.css)"     "$EXPECTED_GROWTH_LIGHT" "$INDEX_CSS"
check_value "--background light (index.css)" "$EXPECTED_CANVAS_LIGHT" "$INDEX_CSS"

if [ "$VIOLATIONS" -eq 0 ]; then
  echo "✓ Brand-locked tokens verified: --brand-navy, --brand-growth, --brand-canvas unchanged."
else
  echo ""
  echo "  $VIOLATIONS locked token(s) appear modified."
  echo "  See docs/knowledge-and-moat.md § Brand-Asset Moat for amendment process."
fi

exit 0
