import "@testing-library/jest-dom";
import { configureAxe, toHaveNoViolations } from "jest-axe";

// Vitest test setup
// Provides global mocks for browser APIs used in tests

// Extend vitest expect with jest-axe matcher so tests can write:
//   expect(await axe(container)).toHaveNoViolations()
expect.extend(toHaveNoViolations);

// Configure axe-core for WCAG 2.1 AA compliance checks.
// Exported for use in src/components/__tests__/a11y.test.tsx.
export const axe = configureAxe({
  rules: {
    // colour-contrast is best validated visually / in a real browser;
    // skip here to avoid false positives caused by jsdom's colour model.
    "color-contrast": { enabled: false },
  },
});

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((key) => delete store[key]); },
  get length() { return Object.keys(store).length; },
  key: (index: number) => Object.keys(store)[index] ?? null,
};

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// Mock matchMedia
Object.defineProperty(globalThis, "matchMedia", {
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver (used by Radix UI components, not available in jsdom)
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
