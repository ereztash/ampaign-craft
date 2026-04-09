#!/usr/bin/env bash
# ═══════════════════════════════════════════════
# sync-from-corsys.sh — Pull growth module from COR-SYS into ampaign-craft
# COR-SYS is the source of truth. This script translates import paths
# from Next.js format back to Vite/CampaignCraft format for Lovable.
# ═══════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CC_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CS_ROOT="${CORSYS_PATH:-$(cd "$CC_ROOT/../COR-SYS" && pwd)}"

echo "🔄 Syncing from COR-SYS → ampaign-craft"
echo "   COR-SYS:       $CS_ROOT"
echo "   ampaign-craft:  $CC_ROOT"

# ─── Clean target directories ───
echo "   Cleaning src/..."
rm -rf "$CC_ROOT/src/engine" "$CC_ROOT/src/services" "$CC_ROOT/src/hooks" \
       "$CC_ROOT/src/contexts" "$CC_ROOT/src/components" "$CC_ROOT/src/types" \
       "$CC_ROOT/src/lib" "$CC_ROOT/src/i18n" "$CC_ROOT/src/pages" \
       "$CC_ROOT/src/integrations" "$CC_ROOT/src/test"

# ─── Copy from COR-SYS ───
echo "   Copying engine files..."
cp -r "$CS_ROOT/src/lib/engines/growth" "$CC_ROOT/src/engine"

echo "   Copying services..."
cp -r "$CS_ROOT/src/services/growth" "$CC_ROOT/src/services"

echo "   Copying hooks..."
cp -r "$CS_ROOT/src/hooks/growth" "$CC_ROOT/src/hooks"

echo "   Copying contexts..."
cp -r "$CS_ROOT/src/contexts/growth" "$CC_ROOT/src/contexts"

echo "   Copying types..."
cp -r "$CS_ROOT/src/types/growth" "$CC_ROOT/src/types"

echo "   Copying lib..."
cp -r "$CS_ROOT/src/lib/growth" "$CC_ROOT/src/lib"
# Also copy utils.ts
cp "$CS_ROOT/src/lib/utils.ts" "$CC_ROOT/src/lib/utils.ts"

echo "   Copying i18n..."
cp -r "$CS_ROOT/src/i18n" "$CC_ROOT/src/i18n"

echo "   Copying growth components..."
cp -r "$CS_ROOT/src/components/growth" "$CC_ROOT/src/components_tmp"
# Move to components/ root level
mkdir -p "$CC_ROOT/src/components"
mv "$CC_ROOT/src/components_tmp"/* "$CC_ROOT/src/components/"
rm -rf "$CC_ROOT/src/components_tmp"

echo "   Copying UI components..."
mkdir -p "$CC_ROOT/src/components/ui"
for f in "$CS_ROOT"/src/components/ui/*.tsx "$CS_ROOT"/src/components/ui/*.ts; do
  fname=$(basename "$f")
  first_char="${fname:0:1}"
  # Only copy lowercase files (shadcn/CC components), skip COR-SYS PascalCase
  if [[ "$first_char" =~ [a-z] ]]; then
    cp "$f" "$CC_ROOT/src/components/ui/$fname"
  fi
done

echo "   Copying pages (from Next.js App Router to Vite pages)..."
mkdir -p "$CC_ROOT/src/pages"
declare -A PAGE_MAP=(
  ["hub"]="ModuleHub"
  ["dashboard"]="Dashboard"
  ["wizard"]="Wizard"
  ["differentiate"]="Differentiate"
  ["sales"]="SalesEntry"
  ["pricing"]="PricingEntry"
  ["retention"]="RetentionEntry"
  ["profile"]="Profile"
  ["landing"]="Landing"
  ["legacy"]="Index"
)
for dir in "${!PAGE_MAP[@]}"; do
  src="$CS_ROOT/src/app/(growth)/$dir/page.tsx"
  dst="$CC_ROOT/src/pages/${PAGE_MAP[$dir]}.tsx"
  if [ -f "$src" ]; then
    cp "$src" "$dst"
  fi
done
# Plans pages
cp "$CS_ROOT/src/app/(growth)/plans/page.tsx" "$CC_ROOT/src/pages/Plans.tsx" 2>/dev/null || true
cp "$CS_ROOT/src/app/(growth)/plans/[planId]/page.tsx" "$CC_ROOT/src/pages/PlanView.tsx" 2>/dev/null || true

echo "   Copying Supabase integration stub..."
mkdir -p "$CC_ROOT/src/integrations/supabase"
cp "$CS_ROOT/src/types/growth/supabase-types.ts" "$CC_ROOT/src/integrations/supabase/types.ts"

echo "   Copying test setup..."
mkdir -p "$CC_ROOT/src/test"
[ -f "$CS_ROOT/src/test/setup.ts" ] && cp "$CS_ROOT/src/test/setup.ts" "$CC_ROOT/src/test/setup.ts" || true

# ─── Reverse import path translations ───
echo "   Translating import paths (Next.js → Vite)..."
find "$CC_ROOT/src" -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  -e 's|@/lib/engines/growth/|@/engine/|g' \
  -e 's|@/services/growth/|@/services/|g' \
  -e 's|@/hooks/growth/|@/hooks/|g' \
  -e 's|@/contexts/growth/|@/contexts/|g' \
  -e 's|@/types/growth/|@/types/|g' \
  -e 's|@/lib/growth/|@/lib/|g' \
  -e 's|@/components/growth/|@/components/|g' \
  -e 's|@/types/supabase-types|@/integrations/supabase/types|g' \
  {} +

# ─── Reverse env var translations ───
echo "   Translating env vars (process.env → import.meta.env)..."
find "$CC_ROOT/src" -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  -e 's|process\.env\.NEXT_PUBLIC_SUPABASE_URL|import.meta.env.VITE_SUPABASE_URL|g' \
  -e 's|process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY|import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY|g' \
  -e 's|process\.env\.NEXT_PUBLIC_META_APP_ID|import.meta.env.VITE_META_APP_ID|g' \
  -e 's|process\.env\.NEXT_PUBLIC_SUPABASE_PROJECT_ID|import.meta.env.VITE_SUPABASE_PROJECT_ID|g' \
  {} +

# ─── Fix Supabase client imports ───
echo "   Fixing Supabase client imports..."
find "$CC_ROOT/src" -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  -e 's|@/lib/supabase/client|@/integrations/supabase/client|g' \
  -e 's|import { createClient } from "@/integrations/supabase/client";|import { supabase } from "@/integrations/supabase/client";|g' \
  -e 's|const { createClient: _createClient } = await import("@/integrations/supabase/client");|const { supabase } = await import("@/integrations/supabase/client");|g' \
  -e 's|const { createClient } = await import("@/integrations/supabase/client");|const { supabase } = await import("@/integrations/supabase/client");|g' \
  -e '/^const supabase = createClient();$/d' \
  -e '/^const supabase = _createClient();$/d' \
  {} +

# ─── Remove @ts-nocheck ───
echo "   Removing @ts-nocheck directives..."
find "$CC_ROOT/src" -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '/^\/\/ @ts-nocheck$/d' {} +

# ─── Remove Next.js-specific directives ───
echo "   Removing Next.js-specific directives..."
find "$CC_ROOT/src" -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  -e '/^export const dynamic = /d' \
  -e '/^"use client";$/d' \
  {} +

# ─── Reverse routing (Next.js → React Router) in ALL files ───
echo "   Translating router calls (next/navigation → react-router-dom)..."
find "$CC_ROOT/src" -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  -e 's|import { useRouter } from "next/navigation";|import { useNavigate } from "react-router-dom";|g' \
  -e 's|import { useRouter, usePathname } from "next/navigation";|import { useNavigate, useLocation } from "react-router-dom";|g' \
  -e 's|import { useRouter, useParams } from "next/navigation";|import { useNavigate, useParams } from "react-router-dom";|g' \
  -e 's|import Link from "next/link";|import { Link } from "react-router-dom";|g' \
  -e 's|const router = useRouter();|const navigate = useNavigate();|g' \
  -e 's|const router = useRouter()|const navigate = useNavigate()|g' \
  -e 's|const pathname = usePathname();|const { pathname } = useLocation();|g' \
  -e 's|router\.push("/growth/|navigate("/|g' \
  -e 's|router\.push(|navigate(|g' \
  -e 's|router\.replace(|navigate(|g' \
  -e 's|router\.back()|navigate(-1)|g' \
  -e 's|<Link href=|<Link to=|g' \
  -e 's|export default function Page()|const PageComponent = ()|g' \
  {} +

# Add default exports at end of page files
for f in "$CC_ROOT"/src/pages/*.tsx; do
  comp=$(basename "$f" .tsx)
  if ! grep -q "export default" "$f"; then
    echo -e "\nexport default PageComponent;" >> "$f"
  fi
done

# ─── Recreate Supabase client ───
echo "   Creating Supabase client..."
cat > "$CC_ROOT/src/integrations/supabase/client.ts" << 'CLIENTEOF'
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  }
});
CLIENTEOF

# ─── Fix supabase imports that reference createClient pattern ───
echo "   Fixing Supabase client imports..."
find "$CC_ROOT/src" -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  -e 's|import { createClient } from "@/lib/supabase/client";|import { supabase } from "@/integrations/supabase/client";|g' \
  -e '/^const supabase = createClient();$/d' \
  {} +

echo ""
echo "✅ Sync complete! $(find "$CC_ROOT/src" -type f | wc -l) files synced."
echo ""
echo "Next steps:"
echo "  1. cd $CC_ROOT && npm install"
echo "  2. npm run dev   (to test locally)"
echo "  3. git add -A && git commit -m 'sync: pull from COR-SYS'"
