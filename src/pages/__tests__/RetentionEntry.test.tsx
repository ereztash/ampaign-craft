import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RetentionEntry from "../RetentionEntry";
import { getLatestPlanResult } from "@/lib/minimalFormDefaults";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock("@/lib/minimalFormDefaults", () => ({
  getLatestPlanResult: vi.fn(() => null),
}));

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn(() => null),
    setJSON: vi.fn(),
    getString: vi.fn(() => ""),
  },
}));

vi.mock("@/engine/userKnowledgeGraph", () => ({
  buildUserKnowledgeGraph: vi.fn(() => ({ discProfile: null })),
}));

vi.mock("@/engine/retentionGrowthEngine", () => ({
  generateRetentionStrategy: vi.fn(() => ({
    onboarding: { type: "high-touch", steps: [{ id: "1", action: "Welcome" }] },
    triggerMap: [],
  })),
}));

vi.mock("@/engine/retentionPersonalizationContext", () => ({
  buildRetentionContext: vi.fn(() => ({})),
  PRICING_WIZARD_STORAGE_KEY: "funnelforge-pricing-wizard",
  DIFF_RESULT_STORAGE_KEY: "funnelforge-differentiation-result",
}));

vi.mock("@/components/BackToHub", () => ({
  default: () => <div data-testid="back-to-hub" />,
}));

vi.mock("@/components/RetentionGrowthTab", () => ({
  default: () => <div data-testid="retention-growth-tab" />,
}));

vi.mock("@/components/ModuleNextStep", () => ({
  ModuleNextStep: () => <div data-testid="module-next-step" />,
}));

vi.mock("@/components/DidThisHelp", () => ({
  DidThisHelp: () => <div data-testid="did-this-help" />,
}));

vi.mock("@/components/ui/illustration", () => ({
  default: () => <div data-testid="illustration" />,
}));

describe("RetentionEntry — no plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <RetentionEntry />
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });

  it("shows main content area", () => {
    render(
      <MemoryRouter>
        <RetentionEntry />
      </MemoryRouter>,
    );
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("shows the gate state when no plan exists", () => {
    render(
      <MemoryRouter>
        <RetentionEntry />
      </MemoryRouter>,
    );
    expect(screen.getByText(/retention & growth/i)).toBeInTheDocument();
    expect(screen.getByText(/first build a marketing plan/i)).toBeInTheDocument();
  });

  it("shows Build Plan button when no plan", () => {
    render(
      <MemoryRouter>
        <RetentionEntry />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /build plan/i })).toBeInTheDocument();
  });
});

const mockedGetLatestPlanResult = vi.mocked(getLatestPlanResult);

describe("RetentionEntry — with plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetLatestPlanResult.mockReturnValue({
      formData: { businessField: "tech", audienceType: "b2c" },
      stages: [],
      kpis: [],
    } as never);
  });

  it("renders the retention growth tab when plan exists", () => {
    render(
      <MemoryRouter>
        <RetentionEntry />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("retention-growth-tab")).toBeInTheDocument();
  });
});
