import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StrategyCanvas from "../StrategyCanvas";
import { safeStorage } from "@/lib/safeStorage";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ planId: undefined, focus: undefined }),
  };
});

vi.mock("@/contexts/UserProfileContext", () => ({
  useUserProfile: () => ({
    profile: {
      lastFormData: null,
      investment: { totalSessionsMinutes: 0, plansCreated: 0 },
      unifiedProfile: null,
    },
  }),
}));

vi.mock("@/hooks/useAchievements", () => ({
  useAchievements: () => ({
    streak: { currentStreak: 0, lastVisit: null },
    masteryFeatures: [],
    unlock: vi.fn(),
  }),
}));

vi.mock("@/hooks/useModuleStatus", () => ({
  useModuleStatus: () => [],
}));

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn(() => []),
    setJSON: vi.fn(),
    getString: vi.fn(() => ""),
  },
}));

vi.mock("@/engine/bottleneckEngine", () => ({
  detectBottlenecks: vi.fn(() => []),
}));

vi.mock("@/engine/healthScoreEngine", () => ({
  calculateHealthScore: vi.fn(() => ({ total: 60 })),
}));

vi.mock("@/engine/costOfInactionEngine", () => ({
  calculateCostOfInaction: vi.fn(() => ({ monthlyLoss: 0 })),
}));

vi.mock("@/engine/gapEngine", () => ({
  computeGaps: vi.fn(() => []),
}));

vi.mock("@/engine/researchOrchestrator", () => ({
  runResearch: vi.fn(() => Promise.resolve({})),
}));

vi.mock("@/engine/discProfileEngine", () => ({
  inferDISCProfile: vi.fn(() => null),
}));

vi.mock("@/engine/userKnowledgeGraph", () => ({
  buildUserKnowledgeGraph: vi.fn(() => ({ discProfile: null })),
}));

vi.mock("@/engine/behavioralActionEngine", () => ({
  computeMotivationState: vi.fn(() => ({ nudge: null })),
}));

vi.mock("@/components/NudgeBanner", () => ({
  NudgeBanner: () => null,
}));

vi.mock("@/components/ModuleNextStep", () => ({
  ModuleNextStep: () => <div data-testid="module-next-step" />,
}));

vi.mock("@/components/ExportReportButton", () => ({
  ExportReportButton: () => <div data-testid="export-report-button" />,
}));

vi.mock("@/components/ResultsDashboard", () => ({
  default: () => <div data-testid="results-dashboard" />,
}));

vi.mock("@/components/StrategyMap", () => ({
  default: () => <div data-testid="strategy-map" />,
}));

describe("StrategyCanvas — no plans, no planId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <StrategyCanvas />
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });

  it("shows main content area", () => {
    render(
      <MemoryRouter>
        <StrategyCanvas />
      </MemoryRouter>,
    );
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("shows empty state message when no plans exist and no planId", () => {
    render(
      <MemoryRouter>
        <StrategyCanvas />
      </MemoryRouter>,
    );
    expect(screen.getByText(/no plan for the strategy canvas yet/i)).toBeInTheDocument();
  });

  it("shows New plan button in empty state", () => {
    render(
      <MemoryRouter>
        <StrategyCanvas />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /new plan/i })).toBeInTheDocument();
  });
});

const mockedSafeStorage = vi.mocked(safeStorage);
const mockPlans = [
  {
    id: "plan-1",
    name: "My Strategy",
    savedAt: new Date().toISOString(),
    result: { formData: { businessField: "tech" }, stages: [], kpis: [] },
  },
];

describe("StrategyCanvas — plans exist but no planId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSafeStorage.getJSON.mockReturnValue(mockPlans as never);
  });

  it("shows Choose a plan list when plans exist but no specific planId", () => {
    render(
      <MemoryRouter>
        <StrategyCanvas />
      </MemoryRouter>,
    );
    expect(screen.getByText(/choose a plan/i)).toBeInTheDocument();
    expect(screen.getByText("My Strategy")).toBeInTheDocument();
  });
});
