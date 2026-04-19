import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AnalyticsTab from "../AnalyticsTab";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/components/MetaConnect", () => ({
  default: () => <div data-testid="meta-connect">MetaConnect</div>,
}));

vi.mock("@/components/MetaMonitor", () => ({
  default: () => <div data-testid="meta-monitor">MetaMonitor</div>,
}));

vi.mock("@/components/DataAnalysisTab", () => ({
  default: () => <div data-testid="data-analysis-tab">DataAnalysisTab</div>,
}));

vi.mock("@/components/CampaignCockpit", () => ({
  default: () => <div data-testid="campaign-cockpit">CampaignCockpit</div>,
}));

vi.mock("@/components/CompetitiveIntelligenceDashboard", () => ({
  default: () => <div data-testid="competitive-dashboard">CompetitiveDashboard</div>,
}));

vi.mock("@/components/IntelligenceSynthesisDashboard", () => ({
  default: () => <div data-testid="intelligence-synthesis">IntelligenceSynthesis</div>,
}));

vi.mock("@/engine/brandVectorEngine", () => ({
  analyzeBrandVector: vi.fn().mockReturnValue({}),
}));

vi.mock("@/engine/discProfileEngine", () => ({
  inferDISCProfile: vi.fn().mockReturnValue({
    primary: "D",
    secondary: "I",
    distribution: { D: 40, I: 30, S: 20, C: 10 },
    communicationTone: { he: "ישיר", en: "Direct" },
    messagingStrategy: { emphasize: [], avoid: [] },
    ctaStyle: { he: "ישיר", en: "Direct" },
    funnelEmphasis: "top",
  }),
}));

vi.mock("@/engine/emotionalPerformanceEngine", () => ({
  calculateEPS: vi.fn().mockReturnValue({ score: 75 }),
}));

vi.mock("@/engine/crossDomainBenchmarkEngine", () => ({
  generateCrossDomainInsights: vi.fn().mockReturnValue({ insights: [] }),
}));

vi.mock("@/engine/behavioralCohortEngine", () => ({
  assignToCohort: vi.fn().mockReturnValue({ cohortId: "c1", label: { he: "קבוצה", en: "Cohort" } }),
}));

const mockMeta = {
  connected: false,
  loading: false,
  error: null,
  accounts: [],
  selectedAccountId: null,
  onConnect: vi.fn(),
  onDisconnect: vi.fn(),
  onSelectAccount: vi.fn(),
};

const mockResult = {
  formData: {
    productDescription: "Test",
    businessField: "tech",
    targetAudience: "developers",
    salesModel: "direct",
    budgetRange: "medium",
    mainGoal: "growth",
    experienceLevel: "intermediate",
    averagePrice: "100",
    audienceType: "b2b",
    existingChannels: ["email"],
  },
  hookTips: [],
  copyLab: {
    formulas: [],
    readerProfile: {
      level: 1,
      name: { he: "", en: "" },
      description: { he: "", en: "" },
      copyArchitecture: { he: "", en: "" },
      principles: [],
    },
    writingTechniques: [],
  },
  kpis: [],
  neuroStorytelling: null,
} as any;

describe("AnalyticsTab", () => {
  it("renders without crashing", () => {
    render(<AnalyticsTab meta={mockMeta} auth={null} result={mockResult} isSimplified={false} />);
    expect(screen.getByTestId("meta-connect")).toBeInTheDocument();
  });

  it("shows MetaConnect component", () => {
    render(<AnalyticsTab meta={mockMeta} auth={null} result={mockResult} isSimplified={false} />);
    expect(screen.getByText("MetaConnect")).toBeInTheDocument();
  });

  it("shows DataAnalysisTab component", () => {
    render(<AnalyticsTab meta={mockMeta} auth={null} result={mockResult} isSimplified={false} />);
    expect(screen.getByTestId("data-analysis-tab")).toBeInTheDocument();
  });

  it("shows CampaignCockpit component", () => {
    render(<AnalyticsTab meta={mockMeta} auth={null} result={mockResult} isSimplified={false} />);
    expect(screen.getByTestId("campaign-cockpit")).toBeInTheDocument();
  });

  it("renders simplified view without intelligence sections", () => {
    render(<AnalyticsTab meta={mockMeta} auth={null} result={mockResult} isSimplified={true} />);
    expect(screen.queryByTestId("intelligence-synthesis")).not.toBeInTheDocument();
    expect(screen.queryByTestId("competitive-dashboard")).not.toBeInTheDocument();
  });

  it("renders full view with competitive dashboard", () => {
    render(<AnalyticsTab meta={mockMeta} auth={null} result={mockResult} isSimplified={false} />);
    expect(screen.getByTestId("competitive-dashboard")).toBeInTheDocument();
  });

  it("section headings are present (via translation keys)", () => {
    render(<AnalyticsTab meta={mockMeta} auth={null} result={mockResult} isSimplified={false} />);
    expect(screen.getByText("analyticsMonitorSection")).toBeInTheDocument();
    expect(screen.getByText("analyticsDataSection")).toBeInTheDocument();
  });
});
