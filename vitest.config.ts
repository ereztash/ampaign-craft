import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  define: {
    // Placeholder env for Supabase client instantiation during tests.
    // Tests that exercise Supabase must mock @/integrations/supabase/client;
    // these values only prevent the module-load `createClient` validator from throwing.
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://test.supabase.co"),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("test_anon_key"),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.{test,spec}.{ts,tsx}", "src/test/**"],
      // Global ratchet: trailing actual −1%. Tighten quarterly.
      // Actual (2026-04-18): stmt 36.02%, branch 72.33%, fn 53.19%, lines 36.02%
      thresholds: {
        statements: 35,
        branches: 71,
        functions: 52,
        lines: 35,
        // Critical-engine overrides — enforced via scripts/check-coverage-critical.sh
        // costOfInactionEngine, churnPredictionEngine, copyQAEngine, discProfileEngine,
        // behavioralHeuristicEngine all now ≥80% branches and 100% functions.
        // pricingWizardEngine.ts · hormoziValueEngine.ts · archetypeClassifier.ts at 95%+.
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
