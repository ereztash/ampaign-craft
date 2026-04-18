import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ExecutiveBriefTab from "../ExecutiveBriefTab";
import type { FunnelResult } from "@/types/funnel";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/engine/userKnowledgeGraph", () => ({
  buildUserKnowledgeGraph: vi.fn(() => ({})),
}));

vi.mock("@/engine/executiveBriefEngine", () => ({
  buildExecutiveBrief: vi.fn(() => ({
    healthScore: 72,
    healthLight: "green",
    healthTier: "Good",
    executiveSummary: { he: "סיכום", en: "Summary text" },
    topRisks: [
      {
        id: "r1",
        severity: "amber",
        title: { he: "סיכון", en: "Risk title" },
        timeHorizon: "30 days",
        description: { he: "תיאור", en: "Risk description" },
        mitigationAction: { he: "פעולה", en: "Mitigation" },
      },
    ],
    nrrScenarios: [
      { label: { he: "גרוע", en: "Bear" }, nrr: 85, delta: -15, color: "red", description: { he: "תיאור", en: "Bear scenario" } },
      { label: { he: "בסיס", en: "Base" }, nrr: 100, delta: 0, color: "amber", description: { he: "תיאור", en: "Base scenario" } },
      { label: { he: "טוב", en: "Bull" }, nrr: 120, delta: 20, color: "green", description: { he: "תיאור", en: "Bull scenario" } },
    ],
    actionChecklist: [
      {
        priority: 1,
        action: { he: "פעולה", en: "Take this action" },
        timeframe: "1 week",
        owner: { he: "מנהל", en: "Manager" },
        expectedImpact: { he: "השפעה", en: "High impact" },
      },
    ],
    generatedAt: new Date("2026-01-01").toISOString(),
  })),
}));

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

const mockResult = {
  formData: {
    businessField: "tech",
    productDescription: "SaaS product",
    averagePrice: "99",
    audienceType: "B2B",
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "leads",
  },
  stages: [],
  kpis: [],
  hookTips: [],
} as unknown as FunnelResult;

describe("ExecutiveBriefTab", () => {
  it("renders without crashing", () => {
    const { container } = render(<ExecutiveBriefTab result={mockResult} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows health score", () => {
    render(<ExecutiveBriefTab result={mockResult} />);
    expect(screen.getByText("72")).toBeTruthy();
  });

  it("shows executive summary section", () => {
    render(<ExecutiveBriefTab result={mockResult} />);
    expect(screen.getByText(/executive summary/i)).toBeTruthy();
  });

  it("shows executive summary text", () => {
    render(<ExecutiveBriefTab result={mockResult} />);
    expect(screen.getByText("Summary text")).toBeTruthy();
  });

  it("shows Top 3 Risks section", () => {
    render(<ExecutiveBriefTab result={mockResult} />);
    expect(screen.getByText(/top 3 risks/i)).toBeTruthy();
  });

  it("shows risk card content", () => {
    render(<ExecutiveBriefTab result={mockResult} />);
    expect(screen.getByText("Risk title")).toBeTruthy();
  });

  it("shows NRR Scenarios section", () => {
    render(<ExecutiveBriefTab result={mockResult} />);
    expect(screen.getByText(/nrr scenarios/i)).toBeTruthy();
  });

  it("shows Action Checklist section", () => {
    render(<ExecutiveBriefTab result={mockResult} />);
    expect(screen.getByText(/action checklist/i)).toBeTruthy();
  });
});
