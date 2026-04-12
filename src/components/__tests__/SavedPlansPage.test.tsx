import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SavedPlansPage from "../SavedPlansPage";

// Mock the language context (Hebrew by default; each test can override by
// remounting after changing the mock return value).
vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({
    language: "en",
    isRTL: false,
    t: (key: string) => {
      const labels: Record<string, string> = {
        savedPlans: "Saved Plans",
        noSavedPlans: "No saved plans yet",
        perMonth: "/mo",
        keyMetrics: "Key metrics",
        comparePlans: "Compare plans",
        planDeleted: "Plan deleted",
      };
      return labels[key] ?? key;
    },
  }),
}));

// Reduced motion disables framer-motion initial transforms so assertions
// don't need to wait on animations.
vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

const savedPlansMock = vi.fn();
vi.mock("@/hooks/useSavedPlans", () => ({
  useSavedPlans: () => savedPlansMock(),
}));

describe("SavedPlansPage — empty state", () => {
  it("renders the CTA card when no plans exist", () => {
    savedPlansMock.mockReturnValue({
      plans: [],
      deletePlan: vi.fn(),
      savePlan: vi.fn(),
    });

    const onBack = vi.fn();
    const onLoadPlan = vi.fn();
    render(<SavedPlansPage onBack={onBack} onLoadPlan={onLoadPlan} />);

    // The empty-state headline comes from the noSavedPlans translation.
    expect(screen.getByText("No saved plans yet")).toBeInTheDocument();

    // The explanatory copy targets first-time visitors directly.
    expect(
      screen.getByText(
        /You haven't saved any plans yet\. Create your first one/i,
      ),
    ).toBeInTheDocument();

    // The primary CTA (Create first plan) is visible — clicking it
    // delegates to onBack so the parent can route to the wizard.
    const cta = screen.getByRole("button", { name: /create first plan/i });
    expect(cta).toBeInTheDocument();
  });

  it("shows the header button with accessible label in empty state", () => {
    savedPlansMock.mockReturnValue({
      plans: [],
      deletePlan: vi.fn(),
      savePlan: vi.fn(),
    });

    render(<SavedPlansPage onBack={() => {}} onLoadPlan={() => {}} />);

    // The back button has an accessible label for screen readers.
    const backButton = screen.getByRole("button", { name: /back/i });
    expect(backButton).toBeInTheDocument();
  });
});
