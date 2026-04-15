import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Dashboard from "../Dashboard";

// Provide a stable mock language context in English so assertions match
// literal strings without RTL branching.
vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({
    language: "en",
    isRTL: false,
    t: (key: string) => key,
  }),
}));

// Router navigate is a no-op — we only assert which UI is rendered.
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

// Stub the UserProfile context with a fresh profile that has no form data
// so the component hits the first-time-user branch.
vi.mock("@/contexts/UserProfileContext", () => ({
  useUserProfile: () => ({
    profile: {
      lastFormData: null,
      savedPlanCount: 0,
      visitCount: 1,
      isReturningUser: false,
      userSegment: "explorer",
      investment: {
        totalSessionsMinutes: 5,
        totalPlansGenerated: 0,
        totalDifferentiationCompletions: 0,
      },
    },
    updateFormData: vi.fn(),
    updateInvestment: vi.fn(),
  }),
}));

// Achievements: return minimal streak + mastery so the welcome card
// header doesn't explode.
vi.mock("@/hooks/useAchievements", () => ({
  useAchievements: () => ({
    streak: { currentStreak: 0, lastVisit: null },
    mastery: 0,
    unlock: vi.fn(),
    trackFeature: vi.fn(),
  }),
}));

// Empty module status — first-time user has no progress.
vi.mock("@/hooks/useModuleStatus", () => ({
  useModuleStatus: () => [],
}));

// Stub archetype context — Dashboard destructures effectiveArchetypeId + confidenceTier.
vi.mock("@/contexts/ArchetypeContext", () => ({
  useArchetype: () => ({
    effectiveArchetypeId: "optimizer",
    confidenceTier: "none",
    archetype: null,
    isLoading: false,
  }),
}));

// Stub archetype pipeline hook.
vi.mock("@/hooks/useArchetypePipeline", () => ({
  useArchetypePipeline: () => ({
    nextStep: null,
    isActive: false,
  }),
}));

// Stub heavy child components so Dashboard renders without pulling
// their dependency graphs.
vi.mock("@/components/BackToHub", () => ({
  default: () => null,
}));
vi.mock("@/components/NudgeBanner", () => ({
  NudgeBanner: () => null,
}));
vi.mock("@/components/PeerBenchmark", () => ({
  PeerBenchmark: () => null,
}));
vi.mock("@/components/ArchetypeProfileCard", () => ({
  default: () => null,
}));
vi.mock("@/components/BlindSpotNudge", () => ({
  BlindSpotNudge: () => null,
  default: () => null,
}));

// Stub the heavy engine entry points so we can render the returning-user
// branch without forging an entire FunnelResult shape. Each stub returns
// just enough data for the Dashboard's `useMemo` computations.
vi.mock("@/engine/healthScoreEngine", () => ({
  calculateHealthScore: () => ({
    total: 72,
    tier: "Strong",
    breakdown: [
      { category: "funnel", label: { he: "משפך", en: "Funnel" }, score: 18, maxScore: 25 },
    ],
    retentionReadiness: null,
  }),
  getHealthScoreColor: () => "hsl(150, 60%, 50%)",
}));
vi.mock("@/engine/costOfInactionEngine", () => ({
  calculateCostOfInaction: () => ({
    monthlyLoss: 0,
    lossFramedMessage: { he: "", en: "" },
    comparisonMessage: { he: "", en: "" },
    compoundingLoss: { threeMonth: 0, sixMonth: 0, twelveMonth: 0 },
  }),
}));
vi.mock("@/engine/pulseEngine", () => ({
  generateWeeklyPulse: () => null,
}));
vi.mock("@/engine/campaignAnalyticsEngine", () => ({
  generateBenchmarks: () => ({ industryInsights: [], benchmarks: [] }),
}));
vi.mock("@/engine/visualExportEngine", () => ({
  structureForAllPlatforms: () => [],
}));

describe("Dashboard — first-time-user empty state", () => {
  beforeEach(() => {
    // Ensure localStorage is clean so savedPlans and diff-result are empty.
    window.localStorage.clear();
  });

  it("renders the welcome card when there are no plans, no diff, no form data", () => {
    render(<Dashboard />);

    // The welcome headline is the signal that the first-time branch was hit.
    expect(screen.getByText("Welcome to FunnelForge")).toBeInTheDocument();

    // Both primary CTAs should be present — Start plan + Discover diff.
    expect(
      screen.getByRole("button", { name: /start marketing plan/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /discover differentiation/i }),
    ).toBeInTheDocument();

    // The reassurance copy appears.
    expect(
      screen.getByText(/no credit card needed/i),
    ).toBeInTheDocument();

    // The module-progress strip from the returning-user layout should NOT
    // be rendered in the empty state.
    expect(screen.queryByText(/marketing health score/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /module progress/i })).not.toBeInTheDocument();
  });

  it("falls through to the full dashboard when a saved plan exists", () => {
    // Seed localStorage with one saved plan — the empty-state branch
    // should NOT be taken. The formData has to carry the shape the
    // downstream engines expect (existingChannels, businessField, etc.)
    // because healthScoreEngine and friends dereference them directly.
    window.localStorage.setItem(
      "funnelforge-plans",
      JSON.stringify([
        {
          id: "plan-1",
          name: "Test Plan",
          savedAt: new Date().toISOString(),
          result: {
            formData: {
              businessField: "tech",
              audienceType: "b2b",
              existingChannels: [],
              budgetRange: "medium",
              experienceLevel: "intermediate",
              mainGoal: "leads",
              productDescription: "Test product",
              salesModel: "subscription",
            },
            funnelName: { he: "משפך", en: "Funnel" },
            totalBudget: { min: 1000, max: 5000 },
            stages: [],
            kpis: [],
            overallTips: [],
          },
        },
      ]),
    );

    render(<Dashboard />);

    // The first-time welcome headline should NOT appear.
    expect(screen.queryByText("Welcome to FunnelForge")).not.toBeInTheDocument();
  });
});
