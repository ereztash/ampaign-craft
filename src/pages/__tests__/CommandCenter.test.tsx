import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CommandCenter from "../CommandCenter";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, tier: "free", isLocalAuth: false }),
}));

const defaultMilestones = {
  formCompleted: false,
  firstPlanSaved: false,
  dataSourceConnected: false,
  stylomeAnalyzed: false,
  coachUsed: false,
};

const defaultProfile = {
  profile: {
    lastFormData: null,
    savedPlanCount: 0,
    investment: { totalSessionsMinutes: 0, plansCreated: 0 },
    unifiedProfile: null,
    milestones: defaultMilestones,
    visitCount: 1,
  },
  completeMilestone: vi.fn(),
};
vi.mock("@/contexts/UserProfileContext", () => ({
  useUserProfile: vi.fn(() => defaultProfile),
}));

vi.mock("@/contexts/DataSourceContext", () => ({
  useDataSources: () => ({
    sources: [],
    refreshFromProfile: vi.fn(),
  }),
}));

vi.mock("@/contexts/ArchetypeContext", () => ({
  useArchetype: () => ({
    effectiveArchetypeId: "optimizer",
    confidenceTier: "none",
    uiConfig: { label: { en: "Optimizer", he: "אופטימייזר" } },
    adaptationsEnabled: false,
    setAdaptationsEnabled: vi.fn(),
    setOverride: vi.fn(),
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

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));

vi.mock("@/lib/socialProofData", () => ({
  getTotalUsers: () => 1000,
}));

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn(() => []),
    setJSON: vi.fn(),
    getString: vi.fn(() => ""),
  },
}));

vi.mock("@/engine/userKnowledgeGraph", () => ({
  buildUserKnowledgeGraph: vi.fn(() => ({
    derived: { identityStatement: { en: "Test Identity", he: "זהות בדיקה" } },
    discProfile: null,
  })),
}));

vi.mock("@/engine/healthScoreEngine", () => ({
  calculateHealthScore: vi.fn(() => ({ total: 60 })),
}));

vi.mock("@/engine/costOfInactionEngine", () => ({
  calculateCostOfInaction: vi.fn(() => ({ monthlyLoss: 0 })),
}));

vi.mock("@/engine/pulseEngine", () => ({
  generateWeeklyPulse: vi.fn(() => null),
}));

vi.mock("@/engine/bottleneckEngine", () => ({
  detectBottlenecks: vi.fn(() => []),
}));

vi.mock("@/engine/gapEngine", () => ({
  computeGaps: vi.fn(() => []),
}));

vi.mock("@/engine/guidanceEngine", () => ({
  generateGuidance: vi.fn(() => []),
}));

vi.mock("@/engine/predictiveEngine", () => ({
  predictSuccess: vi.fn(() => null),
}));

vi.mock("@/engine/campaignAnalyticsEngine", () => ({
  generateBenchmarks: vi.fn(() => ({ benchmarks: [], industryInsights: [] })),
}));

vi.mock("@/engine/abTestEngine", () => ({
  createABExperiment: vi.fn(() => ({ id: "test", variants: [] })),
  assignVariant: vi.fn(() => ({ id: "control", label: "control" })),
}));

vi.mock("@/engine/discProfileEngine", () => ({
  inferDISCProfile: vi.fn(() => null),
}));

vi.mock("@/engine/behavioralActionEngine", () => ({
  computeMotivationState: vi.fn(() => ({ nudge: null })),
}));

vi.mock("@/engine/behavioralHeuristicEngine", () => ({
  getPrimaryCtaVerbs: vi.fn(() => ["Start", "Build"]),
}));

vi.mock("@/engine/outcomeLoopEngine", () => ({
  snapshotEngineOutputs: vi.fn(),
  captureContentSnapshot: vi.fn(),
}));

vi.mock("@/components/BusinessPulseBar", () => ({
  default: () => <div data-testid="business-pulse-bar" />,
}));

vi.mock("@/components/WeeklyActionCard", () => ({
  default: () => <div data-testid="weekly-action-card" />,
}));

vi.mock("@/components/IdentityStrip", () => ({
  default: () => <div data-testid="identity-strip" />,
}));

vi.mock("@/components/InsightFeed", () => ({
  default: () => <div data-testid="insight-feed" />,
}));

vi.mock("@/components/NudgeBanner", () => ({
  NudgeBanner: () => null,
}));

vi.mock("@/components/ProgressMomentum", () => ({
  ProgressMomentum: () => <div data-testid="progress-momentum" />,
}));

vi.mock("@/components/ExpressWizard", () => ({
  default: () => <div data-testid="express-wizard" />,
}));

vi.mock("@/components/InsightsCard", () => ({
  InsightsCard: () => <div data-testid="insights-card" />,
}));

vi.mock("@/components/AnalyticsConnectCard", () => ({
  AnalyticsConnectCard: () => <div data-testid="analytics-connect-card" />,
}));

vi.mock("@/components/ArchetypePipelineGuide", () => ({
  default: () => <div data-testid="archetype-pipeline-guide" />,
}));

vi.mock("@/components/NextStepCard", () => ({
  NextStepCard: () => <div data-testid="next-step-card" />,
}));

vi.mock("@/components/AchievementShelf", () => ({
  AchievementShelf: () => <div data-testid="achievement-shelf" />,
}));

describe("CommandCenter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <CommandCenter />
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });

  it("shows main content area", () => {
    render(
      <MemoryRouter>
        <CommandCenter />
      </MemoryRouter>,
    );
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders the hero heading for new users", () => {
    render(
      <MemoryRouter>
        <CommandCenter />
      </MemoryRouter>,
    );
    // new user branch renders either "Let's start" or "Your next move"
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders the weekly action card once the user is out of focused-start mode", async () => {
    const { useUserProfile } = await import("@/contexts/UserProfileContext");
    vi.mocked(useUserProfile).mockReturnValueOnce({
      profile: {
        lastFormData: { businessField: "tech" },
        savedPlanCount: 1,
        investment: { totalSessionsMinutes: 5, plansCreated: 1 },
        unifiedProfile: null,
        milestones: { formCompleted: true, firstPlanSaved: true, dataSourceConnected: true, stylomeAnalyzed: false, coachUsed: false },
        visitCount: 2,
      },
      completeMilestone: vi.fn(),
    } as unknown as ReturnType<typeof useUserProfile>);

    render(
      <MemoryRouter>
        <CommandCenter />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("weekly-action-card")).toBeInTheDocument();
  });
});
