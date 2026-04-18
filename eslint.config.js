import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Shadcn/ui generated files and context/hook files legitimately export
  // both components and utilities from the same file — suppress the Fast
  // Refresh warning for these directories.
  {
    files: [
      "src/components/ui/**/*.{ts,tsx}",
      "src/contexts/**/*.{ts,tsx}",
      "src/i18n/**/*.{ts,tsx}",
      "src/components/ConsentBanner.tsx",
      "src/components/TutorialFlow.tsx",
      "src/pages/Dashboard.tsx",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },

  // ─── Storage boundary enforcement ────────────────────────────────────────
  // Direct localStorage / sessionStorage usage is banned outside the approved
  // adapter (safeStorage). All files below that are NOT in the approved or
  // test groups are the PR-2 debt registry — migrate them to safeStorage.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "localStorage",   message: "Use safeStorage from @/lib/safeStorage instead of raw localStorage." },
        { name: "sessionStorage",  message: "Use safeStorage from @/lib/safeStorage instead of raw sessionStorage." },
      ],
    },
  },
  // Approved: the adapter itself, Supabase auth client (owns its own session
  // key), and the test bootstrap that clears storage between runs.
  {
    files: [
      "src/lib/safeStorage.ts",
      "src/integrations/supabase/client.ts",
      "src/test/setup.ts",
      "src/**/__tests__/**/*.{ts,tsx}",
      "src/**/*.{test,spec}.{ts,tsx}",
    ],
    rules: { "no-restricted-globals": "off" },
  },
  // PR-2 storage debt cleared 2026-04-18 — all raw localStorage / sessionStorage
  // calls now go through @/lib/safeStorage. No debt allowlist needed.

  // ─── Logging boundary enforcement ────────────────────────────────────────
  // Direct console.* usage is banned in src; use logger from @/lib/logger
  // which forwards errors/warnings to Sentry in production.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-console": "error",
    },
  },
  // Approved: logger.ts is the one file that wraps console, plus test files
  // where console output aids debugging.
  {
    files: [
      "src/lib/logger.ts",
      "src/**/__tests__/**/*.{ts,tsx}",
      "src/**/*.{test,spec}.{ts,tsx}",
    ],
    rules: { "no-console": "off" },
  },
  // PR-3 debt — existing console.* calls tolerated until migrated to logger.
  // Do NOT add new files here; fix them instead.
  {
    files: [
      "src/components/ExportReportButton.tsx",
      "src/components/LandingPage.tsx",
      "src/engine/blackboard/blackboardStore.ts",
      "src/engine/blackboard/contract.ts",
      "src/engine/trainingDataEngine.ts",
      "src/hooks/useTemplateMarketplace.ts",
      "src/hooks/useUserData.ts",
      "src/lib/agentOrchestrator.ts",
      "src/lib/analytics.ts",
      "src/lib/archetypeAnalytics.ts",
      "src/pages/AARRRDashboard.tsx",
      "src/pages/AiCoachPage.tsx",
      "src/pages/Differentiate.tsx",
      "src/services/blackboardPersistence.ts",
    ],
    rules: { "no-console": "off" },
  },
);
