import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DifferentiationResultView from "../DifferentiationResult";
import type { DifferentiationResult } from "@/types/differentiation";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

const mockResult: DifferentiationResult = {
  differentiationStrength: 75,
  claimVerificationScore: 60,
  executiveSummary: { he: "סיכום בעברית", en: "Executive summary in English" },
  formData: {
    businessName: "TestCorp",
    industry: "SaaS",
    currentPositioning: "",
    topCompetitors: [],
    competitorArchetypes: [],
    buyingCommitteeMap: [],
    claimExamples: [],
    hiddenValues: [],
    primaryDifferentiator: "",
    uniqueProcess: "",
    proofPoints: "",
    targetEnemy: "",
    antiCustomer: "",
    desiredPerception: "",
  } as unknown as DifferentiationResult["formData"],
  mechanismStatement: {
    oneLiner: { he: "משפט בעברית", en: "One liner in English" },
    mechanism: "Our proprietary method",
    proof: "10x results",
    antiStatement: "Not for everyone",
  },
  hybridCategory: {
    name: { he: "קטגוריה", en: "Hybrid Category" },
    description: { he: "תיאור", en: "Category description" },
    whitespace: "Blue ocean opportunity",
  },
  gapAnalysis: [
    {
      claim: "We are the fastest",
      status: "verified",
      recommendation: { he: "המשך", en: "Keep it up" },
    },
    {
      claim: "Best quality",
      status: "weak",
      recommendation: { he: "הוסף ראיה", en: "Add evidence" },
    },
  ],
  competitorMap: [
    {
      name: "CompetitorA",
      archetype: "disruptor",
      threat_level: "high",
      counter_strategy: "Focus on reliability",
    },
  ],
  committeeNarratives: [
    {
      role: "CFO",
      primaryConcern: "ROI",
      narrative: "Saves money",
    },
  ],
  tradeoffDeclarations: [
    {
      weakness: "Higher price",
      reframe: "Premium quality",
      beneficiary: "Enterprise clients",
    },
  ],
  contraryMetrics: [
    {
      name: { he: "מדד", en: "Metric" },
      target: "< 2 hours",
      description: { he: "תיאור", en: "Response time" },
      whyContrary: "Slower = more thorough",
    },
  ],
  nextSteps: [
    {
      priority: "high",
      action: { he: "פעולה", en: "Take action" },
      timeframe: "2 weeks",
    },
  ],
} as unknown as DifferentiationResult;

describe("DifferentiationResult", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <DifferentiationResultView result={mockResult} onBack={vi.fn()} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("shows differentiation strength score", () => {
    render(<DifferentiationResultView result={mockResult} onBack={vi.fn()} />);
    expect(screen.getByText("75")).toBeTruthy();
  });

  it("shows business name", () => {
    render(<DifferentiationResultView result={mockResult} onBack={vi.fn()} />);
    expect(screen.getByText("TestCorp")).toBeTruthy();
  });

  it("shows executive summary", () => {
    render(<DifferentiationResultView result={mockResult} onBack={vi.fn()} />);
    expect(screen.getByText("Executive summary in English")).toBeTruthy();
  });

  it("shows tabs for different sections", () => {
    render(<DifferentiationResultView result={mockResult} onBack={vi.fn()} />);
    expect(screen.getByRole("tab", { name: /mechanism/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /claims/i })).toBeTruthy();
  });

  it("calls onBack when Back button is clicked", () => {
    const onBack = vi.fn();
    render(<DifferentiationResultView result={mockResult} onBack={onBack} />);
    fireEvent.click(screen.getByText(/back to start/i));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("shows mechanism one-liner in default tab", () => {
    render(<DifferentiationResultView result={mockResult} onBack={vi.fn()} />);
    expect(screen.getByText("One liner in English")).toBeTruthy();
  });

  it("shows continue to marketing plan CTA", () => {
    render(<DifferentiationResultView result={mockResult} onBack={vi.fn()} />);
    expect(screen.getByText(/continue to marketing plan/i)).toBeTruthy();
  });
});
