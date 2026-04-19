import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PricingEntry from "../PricingEntry";
import { getLatestPlanResult } from "@/lib/minimalFormDefaults";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn(() => []),
    setJSON: vi.fn(),
    getString: vi.fn(() => ""),
  },
}));

vi.mock("@/lib/minimalFormDefaults", () => ({
  getLatestPlanResult: vi.fn(() => null),
}));

vi.mock("@/engine/userKnowledgeGraph", () => ({
  buildUserKnowledgeGraph: vi.fn(() => ({ discProfile: null })),
}));

vi.mock("@/engine/pricingIntelligenceEngine", () => ({
  generatePricingIntelligence: vi.fn(() => null),
}));

vi.mock("@/engine/clgEngine", () => ({
  generateCLGStrategy: vi.fn(() => null),
}));

vi.mock("@/engine/pricingWizardEngine", () => ({
  computePricingWizardRecommendation: vi.fn(() => ({
    methodology: { en: "Van Westendorp", he: "ואן וסטנדורפ" },
    optimalPrice: 199,
    tiers: [],
  })),
  PRICING_WIZARD_STORAGE_KEY: "funnelforge-pricing-wizard",
}));

vi.mock("@/engine/retentionPersonalizationContext", () => ({
  PRICING_WIZARD_STORAGE_KEY: "funnelforge-pricing-wizard",
}));

vi.mock("@/components/PricingWizard", () => ({
  default: () => <div data-testid="pricing-wizard" />,
}));

vi.mock("@/components/PricingIntelligenceTab", () => ({
  default: () => <div data-testid="pricing-intelligence-tab" />,
}));

vi.mock("@/components/PricingWizardResults", () => ({
  default: () => <div data-testid="pricing-wizard-results" />,
}));

vi.mock("@/components/BackToHub", () => ({
  default: () => <div data-testid="back-to-hub" />,
}));

vi.mock("@/components/ModuleNextStep", () => ({
  ModuleNextStep: () => <div data-testid="module-next-step" />,
}));

vi.mock("@/components/ui/illustration", () => ({
  default: () => <div data-testid="illustration" />,
}));

describe("PricingEntry — no plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <PricingEntry />
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });

  it("shows main content area", () => {
    render(
      <MemoryRouter>
        <PricingEntry />
      </MemoryRouter>,
    );
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("shows gate message when no plan exists", () => {
    render(
      <MemoryRouter>
        <PricingEntry />
      </MemoryRouter>,
    );
    expect(screen.getByText(/pricing intelligence/i)).toBeInTheDocument();
    expect(screen.getByText(/first build a marketing plan/i)).toBeInTheDocument();
  });

  it("shows Build Plan button when no plan", () => {
    render(
      <MemoryRouter>
        <PricingEntry />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /build plan/i })).toBeInTheDocument();
  });
});

const mockedGetLatestPlanResult = vi.mocked(getLatestPlanResult);

describe("PricingEntry — with plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetLatestPlanResult.mockReturnValue({
      formData: { businessField: "tech", audienceType: "b2c", averagePrice: 0, salesModel: "oneTime" },
      stages: [],
      kpis: [],
    } as never);
  });

  it("shows the Pricing Wizard heading when plan exists but no price set", () => {
    render(
      <MemoryRouter>
        <PricingEntry />
      </MemoryRouter>,
    );
    expect(screen.getByText(/pricing wizard/i)).toBeInTheDocument();
  });
});
