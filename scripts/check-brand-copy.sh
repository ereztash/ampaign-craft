#!/usr/bin/env bash
# Warn-only check for banned hype words in user-facing copy.
# Does not block CI (exit 0 always). Results logged for review.
set -euo pipefail

BANNED_HE="מדהים|מהפכני|טרנספורמטיבי|משנה חיים"
BANNED_EN="amazing|revolutionary|game-changing|transformative"

violations=$(grep -rn -E "($BANNED_HE|$BANNED_EN)" src/ \
  --include="*.ts" --include="*.tsx" \
  | grep -v "__tests__" \
  | grep -v "\.test\." \
  | grep -v "\.spec\." \
  | grep -v "englishCopyOptimizer" \
  || true)

if [ -n "$violations" ]; then
  echo "⚠️  Brand copy warning: banned hype words found (warn-only, not blocking)"
  echo "$violations"
else
  echo "✅ Brand copy: no hype words found"
fi

# Warn on Hebrew strings ending with '!' (brand rule: no exclamation marks)
exclaim=$(grep -rn '"[^"]*[א-ת][^"]*!"' src/ \
  --include="*.ts" --include="*.tsx" \
  | grep -v "__tests__" \
  | grep -v "\.test\." \
  | grep -v "\.spec\." \
  || true)

exclaim_count=$(echo "$exclaim" | grep -c . || true)
if [ -n "$exclaim" ]; then
  echo "⚠️  Brand copy warning: ${exclaim_count} Hebrew string(s) end with '!' (warn-only)"
  echo "$exclaim"
fi

exit 0
