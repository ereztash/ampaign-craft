import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ResultsDashboard from "../ResultsDashboard";
import type { FunnelResult } from "@/types/funnel";

// ─── Mocks ───────────────────────────────────────
vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));
vi.mock("@/i18n/tx", () => ({
  tx: (_obj: Record<string, string>, lang: string) =>
    lang === "he" ? _obj.he : _obj.en,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" }, tier: "pro", isLocalAuth: false, setTier: vi.fn() }),
}));
vi.mock("@/contexts/ArchetypeContext", () => ({
  useArchetype: () => ({
    archetype: "Strategist",
    confidence: 0.9,
    effectiveArchetypeId: "optimizer",
    confidenceTier: "strong",
    uiConfig: { defaultTab: "strategy" },
  }),
}));
vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));
vi.mock("@/contexts/UserProfileContext", () => ({
  useUserProfile: () => ({ profile: { isReturningUser: true, visitCount: 3, userSegment: "power" } }),
}));
vi.mock("@/hooks/useMetaAuth", () => ({
  useMetaAuth: () => ({
    auth: null, accounts: [], loading: false, error: null,
    connect: vi.fn(), disconnect: vi.fn(), disabled: false,
  }),
}));
vi.mock("@/hooks/useModuleStatus", () => ({
  useModuleStatus: () => [],
}));
vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));
vi.mock("@/hooks/useSavedPlans", () => ({
  useSavedPlans: () => ({ savePlan: vi.fn(), plans: [] }),
}));
vi.mock("@/hooks/useAchievements", () => ({
  useAchievements: () => ({ unlock: vi.fn(), trackFeature: vi.fn() }),
}));
vi.mock("@/hooks/useFeatureGate", () => ({
  useFeatureGate: () => ({
    canUse: vi.fn(() => true),
    checkAccess: vi.fn(() => true),
    paywallOpen: false,
    setPaywallOpen: vi.fn(),
    paywallFeature: null,
    paywallTier: "pro",
  }),
}));
vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getString: vi.fn(() => null),
    setString: vi.fn(),
    getJSON: vi.fn(() => null),
    setJSON: vi.fn(),
  },
}));
vi.mock("@/engine/healthScoreEngine", () => ({
  calculateHealthScore: vi.fn(() => ({
    total: 75,
    breakdown: [{ category: "channels", score: 15, maxScore: 20, label: { he: "ערוצים", en: "Channels" } }],
    retentionReadiness: { score: 70 },
  })),
  getHealthScoreColor: vi.fn(() => "#22c55e"),
}));
vi.mock("@/engine/costOfInactionEngine", () => ({
  calculateCostOfInaction: vi.fn(() => ({
    lossFramedMessage: { he: "הפסד", en: "Loss framed message" },
    comparisonMessage: { he: "השוואה", en: "Comparison message" },
    compoundingLoss: { threeMonth: 3000, sixMonth: 6000, twelveMonth: 12000 },
    competitorGapMessage: { he: "פער", en: "Competitor gap message" },
    urgencyMessage: { he: "דחיפות", en: "Urgency message" },
  })),
}));
vi.mock("@/lib/israeliMarketCalendar", () => ({
  getEventsForField: vi.fn(() => []),
}));
vi.mock("@/engine/clgEngine", () => ({
  generateCLGStrategy: vi.fn(() => ({ suitable: false })),
}));
vi.mock("@/engine/retentionFlywheelEngine", () => ({
  generateRetentionFlywheel: vi.fn(() => ({
    typeLabel: { he: "פלייוויל", en: "Flywheel" },
    churnReduction: 20,
    steps: [],
  })),
}));
vi.mock("@/lib/socialProofData", () => ({
  getSocialProof: vi.fn(() => ({
    usersCount: 1200,
    topMetric: { he: "שיפור", en: "improvement" },
    topMetricValue: "37%",
  })),
}));
vi.mock("@/lib/roiCalculator", () => ({
  calculateRoi: vi.fn(() => ({ monthlyImpact: 5000, improvementPercent: 10, potentialSaving: { he: "₪5000", en: "₪5000" } })),
}));
vi.mock("@/engine/funnelEngine", () => ({
  personalizeResult: vi.fn((result: any) => result),
}));
vi.mock("@/engine/userKnowledgeGraph", () => ({
  buildUserKnowledgeGraph: vi.fn(() => ({ derived: { coldStartMode: false } })),
  loadChatInsights: vi.fn(() => []),
  loadImportedDataSignals: vi.fn(() => []),
  loadMetaSignals: vi.fn(() => null),
}));
vi.mock("@/engine/hormoziValueEngine", () => ({
  calculateValueScore: vi.fn(() => ({
    score: 7.2,
    dreamOutcome: 8,
    perceivedLikelihood: 7,
    timeDelay: 6,
    effortSacrifice: 7,
    label: { he: "ציון ערך", en: "Value Score" },
    interpretation: { he: "טוב", en: "Good" },
    tactics: [],
  })),
}));
vi.mock("@/lib/toolRecommendations", () => ({
  getIsraeliToolsSummary: vi.fn(() => []),
  getToolsForChannel: vi.fn(() => []),
}));
vi.mock("@/lib/industryBenchmarks", () => ({
  getIndustryBenchmarks: vi.fn(() => []),
}));
vi.mock("@/lib/adaptiveTabRules", () => ({
  getTabConfig: vi.fn(() => [
    { id: "strategy", label: { he: "אסטרטגיה", en: "Strategy" }, simplifiedMode: false },
  ]),
}));
vi.mock("@/lib/colorSemantics", () => ({
  funnelStageColors: {},
  chartColorPalette: ["#3b82f6"],
}));
vi.mock("@/engine/optimization/reflectiveAction", () => ({
  generateReflectiveAction: vi.fn(() => ({})),
}));
vi.mock("@/components/BackToHub", () => ({
  default: () => <div data-testid="back-to-hub" />,
}));
vi.mock("@/components/AdaptiveTabNav", () => ({
  default: ({ tabs }: any) => (
    <div data-testid="tab-nav">
      {tabs.map((t: any) => <button key={t.id}>{t.label?.en || t.id}</button>)}
    </div>
  ),
}));
vi.mock("@/components/PeerBenchmark", () => ({
  PeerBenchmark: () => <div data-testid="peer-benchmark" />,
}));
vi.mock("@/components/PaywallModal", () => ({
  default: () => null,
}));
vi.mock("@/components/HormoziValueCard", () => ({
  HormoziValueCard: () => <div data-testid="hormozi-card" />,
}));
vi.mock("@/components/reflective/ReflectiveCard", () => ({
  default: () => null,
}));
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockResult: FunnelResult = {
  id: "result-1",
  formData: {
    businessField: "tech",
    audienceType: "b2c",
    mainGoal: "leads",
    budgetRange: "medium",
    experienceLevel: "intermediate",
  } as any,
  funnelName: { he: "תוכנית טכנולוגיה", en: "Tech Plan" },
  totalBudget: { min: 5000, max: 10000 },
  stages: [
    {
      id: "awareness",
      name: { he: "מודעות", en: "Awareness" },
      description: { he: "שלב מודעות", en: "Awareness stage" },
      budgetPercent: 30,
      channels: [
        {
          channel: "instagram",
          name: { he: "אינסטגרם", en: "Instagram" },
          budgetPercent: 50,
          tips: [{ he: "טיפ", en: "Tip" }],
        },
      ],
    },
  ],
  kpis: [{ name: { he: "ROI", en: "ROI" }, target: "3x" }],
  overallTips: [{ he: "טיפ כללי", en: "General tip" }],
  copyLab: null,
  personalBrand: null,
} as any;

describe("ResultsDashboard", () => {
  const defaultProps = {
    result: mockResult,
    onEdit: vi.fn(),
    onNewPlan: vi.fn(),
  };

  it("renders without crashing", () => {
    expect(() =>
      render(
        <MemoryRouter>
          <ResultsDashboard {...defaultProps} />
        </MemoryRouter>,
      ),
    ).not.toThrow();
  });

  it("shows the resultsTitle translation key", () => {
    render(
      <MemoryRouter>
        <ResultsDashboard {...defaultProps} />
      </MemoryRouter>,
    );
    expect(screen.getByText("resultsTitle")).toBeInTheDocument();
  });

  it("shows the funnel name", () => {
    render(
      <MemoryRouter>
        <ResultsDashboard {...defaultProps} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Tech Plan")).toBeInTheDocument();
  });

  it("shows the cost of inaction loss message", () => {
    render(
      <MemoryRouter>
        <ResultsDashboard {...defaultProps} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Loss framed message")).toBeInTheDocument();
  });

  it("shows the peer benchmark component", () => {
    render(
      <MemoryRouter>
        <ResultsDashboard {...defaultProps} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("peer-benchmark")).toBeInTheDocument();
  });
});
