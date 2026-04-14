/**
 * a11y.test.tsx — WCAG 2.1 AA regression suite
 *
 * Runs axe-core against the most critical interactive components.
 * Any violation that axe can detect in jsdom (landmarks, roles,
 * label associations, etc.) will fail a test here, preventing
 * accessibility regressions from shipping silently.
 *
 * colour-contrast is disabled globally (see src/test/setup.ts) because
 * jsdom does not compute CSS custom-property colours correctly.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "../../test/setup";

// ─────────────────────────────────────────────────────────────────────────────
// Shared mocks
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({
    language: "en",
    isRTL: false,
    t: (key: string) => {
      const labels: Record<string, string> = {
        back: "Back",
        next: "Next",
        skip: "Skip",
        generateFunnel: "Generate",
        processingTitle: "Building your plan",
        processingStep1: "Analysing your market...",
        processingStep2: "Building strategy...",
        processingStep3: "Tailoring recommendations...",
        processingStep4: "Generating your plan!",
        fieldFashion: "Fashion",
        fieldTech: "Tech",
        fieldFood: "Food",
        fieldServices: "Services",
        fieldEducation: "Education",
        fieldHealth: "Health",
        fieldRealEstate: "Real Estate",
        fieldTourism: "Tourism",
        fieldPersonalBrand: "Personal brand",
        fieldOther: "Other",
      };
      return labels[key] ?? key;
    },
  }),
}));

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true, // always render the static branch in tests
}));

// framer-motion: render children immediately without animation wrappers
vi.mock("framer-motion", async () => {
  const React = await import("react");
  return {
    motion: new Proxy({}, {
      get: (_t, tag: string) =>
        React.forwardRef(({ children, ...props }: React.PropsWithChildren<React.HTMLAttributes<HTMLElement>>, ref: React.Ref<HTMLElement>) =>
          React.createElement(tag, { ...props, ref }, children)
        ),
    }),
    AnimatePresence: ({ children }: React.PropsWithChildren) => children,
    MotionConfig: ({ children }: React.PropsWithChildren) => children,
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// ProcessingScreen
// ─────────────────────────────────────────────────────────────────────────────

describe("ProcessingScreen — WCAG 2.1 AA (axe)", () => {
  // Stub setInterval so the progress timer doesn't fire async state
  // updates during the synchronous render + axe scan cycle.
  beforeEach(() => { vi.stubGlobal("setInterval", () => 0); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("has no violations in the progress state (reducedMotion)", async () => {
    const { default: ProcessingScreen } = await import("../ProcessingScreen");
    const { container } = render(<ProcessingScreen onComplete={vi.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no violations with contextual formData", async () => {
    const { default: ProcessingScreen } = await import("../ProcessingScreen");
    const { container } = render(
      <ProcessingScreen
        onComplete={vi.fn()}
        formData={{
          businessField: "tech",
          experienceLevel: "intermediate",
          budgetRange: "₪5,000–₪15,000",
          mainGoal: "leads",
          audienceType: "b2b",
          productDescription: "SaaS analytics platform",
          channels: ["social"],
          salesModel: "subscription",
        }}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BusinessDNACard — SVG radar chart with text alternative
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_DIMENSION_LABELS = {
  priceComplexity:        { he: "מחיר", en: "Price" },
  salesCycleLength:       { he: "מחזור מכירה", en: "Sales Cycle" },
  competitiveIntensity:   { he: "תחרות", en: "Competition" },
  customerLifetimeValue:  { he: "CLV", en: "CLV" },
  acquisitionComplexity:  { he: "רכישה", en: "Acquisition" },
  brandDependency:        { he: "מותג", en: "Brand" },
};

const MOCK_ARCHETYPE_LABELS = {
  general:                  { he: "כללי", en: "General" },
  "b2b-enterprise":         { he: "B2B ארגוני", en: "B2B Enterprise" },
  "premium-b2b-saas":       { he: "SaaS", en: "Premium B2B SaaS" },
  "b2b-professional-services": { he: "שירותי B2B", en: "B2B Services" },
  "b2c-ecommerce":          { he: "איקומרס", en: "B2C eCommerce" },
  "b2c-subscription":       { he: "מנוי B2C", en: "B2C Subscription" },
  "high-ticket-b2c":        { he: "B2C יוקרה", en: "High-Ticket B2C" },
  "local-b2c-service":      { he: "שירות מקומי", en: "Local B2C" },
  "creator-economy":        { he: "יוצרים", en: "Creator Economy" },
};

vi.mock("@/engine/businessFingerprintEngine", () => ({
  DIMENSION_LABELS: MOCK_DIMENSION_LABELS,
  ARCHETYPE_LABELS: MOCK_ARCHETYPE_LABELS,
}));

const MOCK_FINGERPRINT = {
  archetype: "b2b-enterprise" as const,
  marketMode: "b2b" as const,
  growthStage: "growth" as const,
  dimensions: {
    priceComplexity:       0.7,
    salesCycleLength:      0.6,
    competitiveIntensity:  0.8,
    customerLifetimeValue: 0.9,
    acquisitionComplexity: 0.5,
    brandDependency:       0.4,
  },
  ux: {
    terminology: "b2b" as const,
    complexity: "standard" as const,
    framingPreference: "balanced" as const,
    emphasisTabs: [],
    simplifiedTabs: [],
  },
};

describe("BusinessDNACard — WCAG 2.1 AA (axe)", () => {
  it("has no violations in full (radar chart) mode", async () => {
    const { default: BusinessDNACard } = await import("../BusinessDNACard");
    const { container } = render(
      <BusinessDNACard fingerprint={MOCK_FINGERPRINT} compact={false} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no violations in compact (data grid) mode", async () => {
    const { default: BusinessDNACard } = await import("../BusinessDNACard");
    const { container } = render(
      <BusinessDNACard fingerprint={MOCK_FINGERPRINT} compact={true} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("SVG radar has role=img and aria-label", async () => {
    const { default: BusinessDNACard } = await import("../BusinessDNACard");
    const { container } = render(
      <BusinessDNACard fingerprint={MOCK_FINGERPRINT} compact={false} />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("role", "img");
    expect(svg).toHaveAttribute("aria-label");
  });

  it("includes a sr-only data table as text alternative for the chart", async () => {
    const { default: BusinessDNACard } = await import("../BusinessDNACard");
    const { container } = render(
      <BusinessDNACard fingerprint={MOCK_FINGERPRINT} compact={false} />,
    );
    const table = container.querySelector("table.sr-only");
    expect(table).toBeInTheDocument();
    // Six dimension rows + header row
    const rows = table!.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(6);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MultiStepForm — progress bar, radiogroup, label associations
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("@/contexts/UserProfileContext", () => ({
  useUserProfile: () => ({
    profile: { lastFormData: null, isReturningUser: false },
    updateFormData: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

describe("MultiStepForm — WCAG 2.1 AA (axe)", () => {
  it("has no violations on initial render (step 1)", async () => {
    const { default: MultiStepForm } = await import("../MultiStepForm");
    const { container } = render(
      <MultiStepForm onComplete={vi.fn()} onBack={vi.fn()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("progress bar has role=progressbar with valuenow/min/max", async () => {
    const { default: MultiStepForm } = await import("../MultiStepForm");
    const { container } = render(
      <MultiStepForm onComplete={vi.fn()} onBack={vi.fn()} />,
    );
    const bar = container.querySelector("[role='progressbar']");
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuenow");
  });

  it("step option group has role=radiogroup", async () => {
    const { default: MultiStepForm } = await import("../MultiStepForm");
    const { container } = render(
      <MultiStepForm onComplete={vi.fn()} onBack={vi.fn()} />,
    );
    const group = container.querySelector("[role='radiogroup']");
    expect(group).toBeInTheDocument();
  });
});
