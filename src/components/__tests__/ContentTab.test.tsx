import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ContentTab from "../ContentTab";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn().mockReturnValue(null),
    setJSON: vi.fn(),
  },
}));

vi.mock("@/engine/copyQAEngine", () => ({
  analyzeCopy: vi.fn().mockReturnValue({
    score: 75,
    risks: [],
    aiDetection: { humanScore: 80, verdict: "human", burstiness: 2.1, perplexity: 3.5 },
  }),
}));

vi.mock("@/lib/hebrewCopyOptimizer", () => ({
  scoreHebrewCopy: vi.fn().mockReturnValue({ total: 70, breakdown: [] }),
  getHebrewCopyRules: vi.fn().mockReturnValue([]),
}));

vi.mock("@/components/CopyLabTab", () => ({
  default: () => <div data-testid="copy-lab-tab">CopyLabTab</div>,
}));

vi.mock("@/components/NeuroStorytellingTab", () => ({
  default: () => <div data-testid="neuro-tab">NeuroStorytellingTab</div>,
}));

vi.mock("@/components/AICopyGenerator", () => ({
  AICopyGenerator: () => <div data-testid="ai-copy-generator">AICopyGenerator</div>,
}));

vi.mock("@/components/UVPSynthesisTab", () => ({
  default: () => <div data-testid="uvp-tab">UVPSynthesisTab</div>,
}));

vi.mock("@/lib/colorSemantics", () => ({
  neuroVectorColors: {},
}));

const mockResult = {
  formData: {
    productDescription: "Test product",
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
  hookTips: [
    {
      lawName: { he: "חוק 1", en: "Law 1" },
      formula: { he: "נוסחה", en: "Hook formula" },
      example: { he: "דוגמה", en: "Hook example" },
      channels: ["email", "social"],
    },
  ],
  copyLab: {
    formulas: [
      {
        name: { he: "PAS", en: "PAS Formula" },
        structure: { he: "מבנה", en: "Problem - Agitate - Solve" },
        example: { he: "דוגמה", en: "Example copy" },
        conversionLift: "+12%",
        origin: "Direct response",
        bestFor: ["email"],
      },
    ],
    readerProfile: {
      level: 1,
      name: { he: "פרופיל", en: "Profile Name" },
      description: { he: "תיאור", en: "Profile description" },
      copyArchitecture: { he: "ארכיטקטורה", en: "Copy architecture" },
      principles: [{ he: "עיקרון", en: "Principle one" }],
    },
    writingTechniques: [],
  },
  kpis: [],
  neuroStorytelling: null,
} as any;

describe("ContentTab", () => {
  it("renders without crashing", () => {
    render(<ContentTab result={mockResult} isSimplified={false} />);
    expect(screen.getByText("contentSubNavHooks")).toBeInTheDocument();
  });

  it("shows all tab triggers", () => {
    render(<ContentTab result={mockResult} isSimplified={false} />);
    expect(screen.getByText("contentSubNavCopyLab")).toBeInTheDocument();
    expect(screen.getByText("Copy QA")).toBeInTheDocument();
    expect(screen.getByText("AI Copy")).toBeInTheDocument();
  });

  it("shows hook tips in hooks tab", () => {
    render(<ContentTab result={mockResult} isSimplified={false} />);
    expect(screen.getByText("Law 1")).toBeInTheDocument();
  });

  it("shows full view for non-simplified mode", () => {
    render(<ContentTab result={mockResult} isSimplified={false} />);
    expect(screen.queryByText("unlockFullView")).not.toBeInTheDocument();
  });

  it("shows simplified view for simplified mode", () => {
    render(<ContentTab result={mockResult} isSimplified={true} />);
    expect(screen.getByText("beginnerHooksTitle")).toBeInTheDocument();
  });

  it("does not show neurostory tab when neuroStorytelling is null", () => {
    render(<ContentTab result={mockResult} isSimplified={false} />);
    expect(screen.queryByText("contentSubNavNeuro")).not.toBeInTheDocument();
  });
});
