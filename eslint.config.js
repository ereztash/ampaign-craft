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
);
