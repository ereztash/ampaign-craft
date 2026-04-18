import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
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
      // Global ratchet: current baseline −2%. Tighten quarterly.
      thresholds: {
        statements: 31,
        branches: 67,
        functions: 49,
        lines: 31,
        // Critical-engine overrides — must hit 50% (enforced via scripts/check-coverage-critical.sh)
        // Targets: pricingWizardEngine.ts · hormoziValueEngine.ts · archetypeClassifier.ts
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
