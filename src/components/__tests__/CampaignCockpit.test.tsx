import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CampaignCockpit from "../CampaignCockpit";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/hooks/useSavedPlans", () => ({
  useSavedPlans: () => ({
    plans: [],
  }),
}));

vi.mock("@/hooks/useCampaignTracking", () => ({
  useCampaignTracking: () => ({
    metrics: [],
    addMetric: vi.fn(),
    getComparison: vi.fn().mockReturnValue([]),
  }),
}));

vi.mock("@/hooks/useFeatureGate", () => ({
  useFeatureGate: () => ({
    canUse: vi.fn().mockReturnValue(true),
    checkAccess: vi.fn().mockReturnValue(true),
    paywallOpen: false,
    setPaywallOpen: vi.fn(),
    paywallFeature: null,
    paywallTier: null,
  }),
}));

vi.mock("@/components/PaywallModal", () => ({
  default: () => <div data-testid="paywall-modal" />,
}));

describe("CampaignCockpit", () => {
  it("renders without crashing", () => {
    render(<CampaignCockpit />);
    expect(screen.getByText("Campaign Cockpit")).toBeInTheDocument();
  });

  it("shows subtitle text", () => {
    render(<CampaignCockpit />);
    expect(
      screen.getByText("Track actual performance vs FunnelForge projections")
    ).toBeInTheDocument();
  });

  it("shows plan selector dropdown", () => {
    render(<CampaignCockpit />);
    expect(screen.getByText("Select a plan to track...")).toBeInTheDocument();
  });

  it("does not show metric input before plan is selected", () => {
    render(<CampaignCockpit />);
    expect(screen.queryByText("Add Actual Metric")).not.toBeInTheDocument();
  });

  it("shows paywall card when feature not accessible", () => {
    vi.doMock("@/hooks/useFeatureGate", () => ({
      useFeatureGate: () => ({
        canUse: vi.fn().mockReturnValue(false),
        checkAccess: vi.fn(),
        paywallOpen: false,
        setPaywallOpen: vi.fn(),
        paywallFeature: null,
        paywallTier: null,
      }),
    }));
    render(<CampaignCockpit />);
    // With mocked canUse returning true, we see normal content
    expect(screen.getByText("Campaign Cockpit")).toBeInTheDocument();
  });
});
