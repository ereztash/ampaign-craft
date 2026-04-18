import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Index from "../Index";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock("@/contexts/UserProfileContext", () => ({
  useUserProfile: () => ({
    profile: {
      lastFormData: null,
      savedPlanCount: 0,
      investment: { totalSessionsMinutes: 0, plansCreated: 0 },
      unifiedProfile: null,
    },
    persistFormData: vi.fn(),
    refreshSavedPlanCount: vi.fn(),
    setExperienceLevel: vi.fn(),
  }),
}));

vi.mock("@/hooks/useAdaptiveTheme", () => ({
  useAdaptiveTheme: () => undefined,
}));

vi.mock("@/components/Header", () => ({
  default: () => <div data-testid="header" />,
}));

vi.mock("@/components/LandingPage", () => ({
  default: ({ onStart }: { onStart: () => void }) => (
    <div data-testid="landing-page">
      <button onClick={onStart}>Start</button>
    </div>
  ),
}));

vi.mock("@/components/MultiStepForm", () => ({
  default: () => <div data-testid="multi-step-form" />,
}));

vi.mock("@/components/ProcessingScreen", () => ({
  default: () => <div data-testid="processing-screen" />,
}));

vi.mock("@/components/ResultsDashboard", () => ({
  default: () => <div data-testid="results-dashboard" />,
}));

vi.mock("@/components/SavedPlansPage", () => ({
  default: () => <div data-testid="saved-plans-page" />,
}));

vi.mock("@/components/OnboardingOverlay", () => ({
  default: () => <div data-testid="onboarding-overlay" />,
}));

vi.mock("@/engine/funnelEngine", () => ({
  generateFunnel: vi.fn(() => ({ id: "f1", stages: [], kpis: [], overallTips: [] })),
  personalizeResult: vi.fn((r: unknown) => r),
}));

vi.mock("@/engine/userKnowledgeGraph", () => ({
  buildUserKnowledgeGraph: vi.fn(() => ({})),
}));

describe("Index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });

  it("shows the main role element", () => {
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>,
    );
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders the LandingPage component by default", () => {
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("landing-page")).toBeInTheDocument();
  });

  it("does not render form or results by default", () => {
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId("multi-step-form")).not.toBeInTheDocument();
    expect(screen.queryByTestId("results-dashboard")).not.toBeInTheDocument();
  });
});
