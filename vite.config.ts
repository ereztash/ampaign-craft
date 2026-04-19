import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    // "hidden" emits .map files for upload to error trackers but omits the
    // sourceMappingURL comment from the bundle, so the maps are not served
    // publicly. Flip to true in staging if you need in-browser DevTools maps.
    sourcemap: "hidden",
    rollupOptions: {
      output: {
        // Keep original source content out of the hosted maps.
        sourcemapExcludeSources: true,
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          charts: ["recharts"],
          pdf: ["jspdf", "html2canvas"],
          ui: [
            "framer-motion",
            "@radix-ui/react-dialog",
            "@radix-ui/react-tabs",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-popover",
            "@radix-ui/react-accordion",
          ],
          supabase: ["@supabase/supabase-js"],
          xlsx: ["xlsx"],
          tanstack: ["@tanstack/react-query"],
          icons: ["lucide-react"],
        },
      },
    },
  },
}));
