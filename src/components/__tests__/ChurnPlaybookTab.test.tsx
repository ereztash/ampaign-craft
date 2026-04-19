import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ChurnPlaybookTab from "../ChurnPlaybookTab";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
  }),
}));

vi.mock("@/engine/userKnowledgeGraph", () => ({
  buildUserKnowledgeGraph: vi.fn().mockReturnValue({
    business: { field: "tech", product: "SaaS", price: "100", audience: "SMBs", budget: "medium", goal: "growth", experience: "intermediate", salesModel: "direct", channels: ["email"] },
    derived: { identityStatement: { he: "", en: "" }, topPainPoint: { he: "", en: "" }, industryPainPoints: [], framingPreference: "value", complexityLevel: "medium" },
    behavior: { stageOfChange: "action" },
    differentiation: null,
    voice: null,
  }),
}));

vi.mock("@/engine/churnPlaybookEngine", () => ({
  buildChurnPlaybook: vi.fn().mockReturnValue({
    riskTier: "watch",
    riskScore: 45,
    riskTierLabel: { he: "מעקב", en: "Watch" },
    nrrBaseline: 95,
    nrrTarget: 110,
    quickWin: { he: "פעולה מיידית", en: "Immediate action to take" },
    weeklyActions: [
      {
        week: 1,
        weekLabel: { he: "שבוע 1", en: "Week 1" },
        channel: "email",
        focus: { he: "מיקוד", en: "Retention focus" },
        actions: [{ he: "פעולה", en: "Action item one" }],
        kpi: { he: "KPI", en: "NPS > 8" },
        template: { he: "תבנית", en: "Hi {{name}}, how are you?" },
      },
    ],
    phase6090: [
      {
        timeframe: "Days 0-60",
        label: { he: "שלב 1", en: "Phase 1" },
        objective: { he: "מטרה", en: "Stabilize retention" },
        keyActions: [{ he: "פעולה", en: "Run health checks" }],
      },
      {
        timeframe: "Days 61-90",
        label: { he: "שלב 2", en: "Phase 2" },
        objective: { he: "מטרה", en: "Drive expansion" },
        keyActions: [{ he: "פעולה", en: "Upsell premium" }],
      },
    ],
    nudgeSchedule: [
      {
        triggerDays: 7,
        channel: "email",
        message: { he: "הודעה", en: "Check-in message" },
        goal: { he: "מטרה", en: "Prevent churn" },
      },
    ],
    leadingIndicators: [
      {
        name: { he: "מדד", en: "Login frequency" },
        threshold: "< 2x/week",
        checkFrequency: "weekly",
        interpretation: { he: "פירוש", en: "Low engagement signal" },
      },
    ],
  }),
}));

const mockResult = {
  formData: {
    productDescription: "Test",
    businessField: "tech",
    targetAudience: "SMBs",
    salesModel: "direct",
    budgetRange: "medium",
    mainGoal: "growth",
    experienceLevel: "intermediate",
    averagePrice: "100",
    audienceType: "b2b",
    existingChannels: ["email"],
  },
  hookTips: [],
  copyLab: { formulas: [], readerProfile: { level: 1, name: { he: "", en: "" }, description: { he: "", en: "" }, copyArchitecture: { he: "", en: "" }, principles: [] }, writingTechniques: [] },
  kpis: [],
  neuroStorytelling: null,
} as any;

describe("ChurnPlaybookTab", () => {
  it("renders without crashing", () => {
    const { container } = render(<ChurnPlaybookTab result={mockResult} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows the risk tier label", () => {
    render(<ChurnPlaybookTab result={mockResult} />);
    expect(document.body.textContent).toContain("Watch");
  });

  it("shows quick win action", () => {
    render(<ChurnPlaybookTab result={mockResult} />);
    expect(screen.getByText("Immediate action to take")).toBeInTheDocument();
  });

  it("shows 4-week plan heading", () => {
    render(<ChurnPlaybookTab result={mockResult} />);
    expect(screen.getByText("4-Week Win-Back Plan")).toBeInTheDocument();
  });

  it("shows 60/90 day plan heading", () => {
    render(<ChurnPlaybookTab result={mockResult} />);
    expect(screen.getByText("60/90 Day Plan")).toBeInTheDocument();
  });

  it("shows nudge schedule heading", () => {
    render(<ChurnPlaybookTab result={mockResult} />);
    expect(screen.getByText("Automated Nudge Schedule")).toBeInTheDocument();
  });

  it("shows leading indicators heading", () => {
    render(<ChurnPlaybookTab result={mockResult} />);
    expect(screen.getByText("Leading Indicators to Watch")).toBeInTheDocument();
  });

  it("shows NRR baseline and target", () => {
    render(<ChurnPlaybookTab result={mockResult} />);
    expect(screen.getByText(/95%/)).toBeInTheDocument();
    expect(screen.getByText(/110%/)).toBeInTheDocument();
  });
});
