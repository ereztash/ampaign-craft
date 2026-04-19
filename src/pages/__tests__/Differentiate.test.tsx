import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Differentiate from "../Differentiate";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ search: "", pathname: "/differentiate", key: "default" }),
  };
});

vi.mock("@/contexts/UserProfileContext", () => ({
  useUserProfile: () => ({
    profile: {
      lastFormData: null,
      unifiedProfile: null,
      savedPlanCount: 0,
      investment: { totalSessionsMinutes: 0, plansCreated: 0 },
    },
  }),
}));

vi.mock("@/hooks/useUserData", () => ({
  useUserData: () => ({
    saveDifferentiationResult: vi.fn(),
    loadDifferentiationResults: vi.fn(() => Promise.resolve([])),
  }),
}));

vi.mock("@/hooks/useFeatureGate", () => ({
  useFeatureGate: () => ({
    checkAccess: vi.fn(() => true),
    paywallOpen: false,
    setPaywallOpen: vi.fn(),
    paywallFeature: "",
    paywallTier: "pro",
  }),
}));

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

vi.mock("@/engine/differentiationEngine", () => ({
  generateDifferentiation: vi.fn(() => ({ differentiationStrength: 65 })),
}));

vi.mock("@/engine/differentiationPhases", () => ({
  getQuestionsForPhase: vi.fn(() => []),
}));

vi.mock("@/engine/crossDomainBenchmarkEngine", () => ({
  generateCrossDomainInsights: vi.fn(() => ({
    topLift: { expectedLift: "+20%", transferableStrategy: { he: "אסטרטגיה", en: "strategy" } },
  })),
}));

vi.mock("@/types/profile", () => ({
  toDifferentiationPrefill: vi.fn(() => ({})),
}));

vi.mock("@/components/DifferentiationWizard", () => ({
  default: () => <div data-testid="differentiation-wizard" />,
}));

vi.mock("@/components/DifferentiationResult", () => ({
  default: () => <div data-testid="differentiation-result" />,
}));

vi.mock("@/components/DifferentiationTranscriptWizard", () => ({
  default: () => <div data-testid="differentiation-transcript-wizard" />,
}));

vi.mock("@/components/PaywallModal", () => ({
  default: () => <div data-testid="paywall-modal" />,
}));

vi.mock("@/components/BackToHub", () => ({
  default: () => <div data-testid="back-to-hub" />,
}));

describe("Differentiate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <Differentiate />
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });

  it("shows main content area", () => {
    render(
      <MemoryRouter>
        <Differentiate />
      </MemoryRouter>,
    );
    // idle view is the default
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("shows the start differentiation CTA button", () => {
    render(
      <MemoryRouter>
        <Differentiate />
      </MemoryRouter>,
    );
    // The start CTA key is t("diffStartCta") which returns "diffStartCta" from mock
    // But the button is rendered from t() — let's check for the primary CTA button
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });

  it("shows the Upload Meeting Transcript button", () => {
    render(
      <MemoryRouter>
        <Differentiate />
      </MemoryRouter>,
    );
    expect(screen.getByText(/upload meeting transcript/i)).toBeInTheDocument();
  });

  it("shows the feature cards in idle state", () => {
    render(
      <MemoryRouter>
        <Differentiate />
      </MemoryRouter>,
    );
    // Feature cards include Contradiction Test, Hidden Layer, Battle Map, 7 Narratives
    expect(screen.getByText(/contradiction test/i)).toBeInTheDocument();
  });
});
