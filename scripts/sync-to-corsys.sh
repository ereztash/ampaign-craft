#!/usr/bin/env bash
# ═══════════════════════════════════════════════
# sync-to-corsys.sh — Push changes from ampaign-craft to COR-SYS
# Use this after editing in Lovable to apply changes to the source of truth.
# Translates Vite/CC import paths to Next.js/COR-SYS format.
# ═══════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CC_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CS_ROOT="${CORSYS_PATH:-$(cd "$CC_ROOT/../COR-SYS" && pwd)}"

echo "🔄 Syncing from ampaign-craft → COR-SYS"
echo "   ampaign-craft:  $CC_ROOT"
echo "   COR-SYS:        $CS_ROOT"

# ─── Sync engine ───
echo "   Syncing engine → lib/engines/growth..."
rsync -a --delete "$CC_ROOT/src/engine/" "$CS_ROOT/src/lib/engines/growth/"

echo "   Syncing services..."
rsync -a --delete "$CC_ROOT/src/services/" "$CS_ROOT/src/services/growth/"

echo "   Syncing hooks..."
rsync -a --delete "$CC_ROOT/src/hooks/" "$CS_ROOT/src/hooks/growth/"

echo "   Syncing contexts..."
rsync -a --delete "$CC_ROOT/src/contexts/" "$CS_ROOT/src/contexts/growth/"

echo "   Syncing types..."
rsync -a --delete --exclude='database.ts' "$CC_ROOT/src/types/" "$CS_ROOT/src/types/growth/"

echo "   Syncing lib (excluding utils.ts)..."
rsync -a --delete --exclude='utils.ts' "$CC_ROOT/src/lib/" "$CS_ROOT/src/lib/growth/"

echo "   Syncing i18n..."
rsync -a --delete "$CC_ROOT/src/i18n/" "$CS_ROOT/src/i18n/"

echo "   Syncing components (custom)..."
rsync -a --delete --exclude='ui/' "$CC_ROOT/src/components/" "$CS_ROOT/src/components/growth/"

echo "   Syncing UI components..."
for f in "$CC_ROOT"/src/components/ui/*.tsx "$CC_ROOT"/src/components/ui/*.ts; do
  [ -f "$f" ] && cp "$f" "$CS_ROOT/src/components/ui/$(basename "$f")"
done

# ─── Forward import path translations ───
echo "   Translating import paths (Vite → Next.js)..."
DIRS="$CS_ROOT/src/lib/engines/growth $CS_ROOT/src/services/growth $CS_ROOT/src/hooks/growth $CS_ROOT/src/contexts/growth $CS_ROOT/src/components/growth $CS_ROOT/src/lib/growth $CS_ROOT/src/i18n"

find $DIRS -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  -e 's|@/engine/|@/lib/engines/growth/|g' \
  -e 's|@/services/\([^g]\)|@/services/growth/\1|g' \
  -e 's|@/hooks/\([^g]\)|@/hooks/growth/\1|g' \
  -e 's|@/contexts/\([^g]\)|@/contexts/growth/\1|g' \
  -e 's|@/types/\([^gd]\)|@/types/growth/\1|g' \
  -e 's|@/lib/\([^geus]\)|@/lib/growth/\1|g' \
  -e 's|@/components/\([^gu]\)|@/components/growth/\1|g' \
  -e 's|@/integrations/supabase/client|@/lib/supabase/client|g' \
  -e 's|@/integrations/supabase/types|@/types/growth/supabase-types|g' \
  {} +

# ─── Forward env var translations ───
echo "   Translating env vars (import.meta.env → process.env)..."
find $DIRS -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  -e 's|import\.meta\.env\.VITE_SUPABASE_URL|process.env.NEXT_PUBLIC_SUPABASE_URL|g' \
  -e 's|import\.meta\.env\.VITE_SUPABASE_PUBLISHABLE_KEY|process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY|g' \
  -e 's|import\.meta\.env\.VITE_META_APP_ID|process.env.NEXT_PUBLIC_META_APP_ID|g' \
  -e 's|import\.meta\.env\.VITE_SUPABASE_PROJECT_ID|process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID|g' \
  {} +

# ─── Fix supabase singleton → createClient pattern ───
echo "   Fixing Supabase client pattern..."
find $DIRS -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  -e 's|import { supabase } from "@/lib/supabase/client";|import { createClient } from "@/lib/supabase/client";\nconst supabase = createClient();|g' \
  {} +

# ─── Add @ts-nocheck to all synced files ───
echo "   Adding @ts-nocheck..."
find $DIRS -type f \( -name "*.ts" -o -name "*.tsx" \) | while read f; do
  if ! head -1 "$f" | grep -q "ts-nocheck"; then
    sed -i '1i // @ts-nocheck' "$f"
  fi
done

echo ""
echo "✅ Sync to COR-SYS complete!"
echo ""
echo "Next steps:"
echo "  1. cd $CS_ROOT && npm run build   (verify build passes)"
echo "  2. git add -A && git commit -m 'sync: pull from Lovable edits'"
