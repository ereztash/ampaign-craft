#!/usr/bin/env bash
# Checks for em dashes (—) in user-facing JSX string literals.
# Excludes: comments, standalone visual dashes, range displays, test files.
set -euo pipefail

matches=$(grep -rn "—" src/ \
  --include="*.tsx" --include="*.html" \
  | grep -v "^\S*:.*//.*—" \
  | grep -v "^\S*:.*{/\*" \
  | grep -v "^\S*:.*\*.*—" \
  | grep -v '"—"' \
  | grep -v "'—'" \
  | grep -v ">—<" \
  | grep -v "__tests__" \
  | grep -v "\.test\." \
  || true)

if [ -n "$matches" ]; then
  echo "EM DASH found in user-facing source. Brand rule violation."
  echo "$matches"
  exit 1
fi
