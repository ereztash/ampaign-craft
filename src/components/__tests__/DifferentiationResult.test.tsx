import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DifferentiationResultView from "../DifferentiationResult";
import type { DifferentiationResult } from "@/types/differentiation";

const useLanguageMock = vi.fn(() => ({ language: "en" as const, t: (k: string) => k, isRTL: false }));
vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => useLanguageMock(),
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

// ─── Pareto: crash safety ─────────────────────────────────────────────────────

describe("DifferentiationResult — empty arrays (crash safety)", () => {
  it("renders without crashing when all result arrays are empty", () => {
    const emptyResult = {
      ...mockResult,
      gapAnalysis: [],
      competitorMap: [],
      committeeNarratives: [],
      tradeoffDeclarations: [],
      contraryMetrics: [],
      nextSteps: [],
    } as unknown as DifferentiationResult;
    expect(() =>
      render(<DifferentiationResultView result={emptyResult} onBack={vi.fn()} />)
    ).not.toThrow();
  });
});

describe("DifferentiationResult — Hebrew language", () => {
  beforeEach(() => {
    useLanguageMock.mockReturnValue({ language: "he" as const, t: (k: string) => k, isRTL: true });
  });
  afterEach(() => {
    useLanguageMock.mockReturnValue({ language: "en" as const, t: (k: string) => k, isRTL: false });
  });

  it("renders without crashing and shows Hebrew content", () => {
    const { container } = render(
      <DifferentiationResultView result={mockResult} onBack={vi.fn()} />
    );
    expect(container.firstChild).toBeTruthy();
    expect(screen.getByText("משפט בעברית")).toBeTruthy();
  });
});

describe("DifferentiationResult — primary tab navigation", () => {
  it("clicking through all primary tabs does not crash", () => {
    const { getAllByRole } = render(
      <DifferentiationResultView result={mockResult} onBack={vi.fn()} />
    );
    for (const tab of getAllByRole("tab")) {
      expect(() => fireEvent.click(tab)).not.toThrow();
    }
  });
});
