import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import AiCoachChat from "../AiCoachChat";

// jsdom does not implement scrollTo on HTMLElement
beforeAll(() => {
  window.HTMLElement.prototype.scrollTo = vi.fn();
});

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: null } })) },
  },
}));

vi.mock("@/hooks/useFeatureGate", () => ({
  useFeatureGate: () => ({
    checkAccess: vi.fn().mockReturnValue(true),
    paywallOpen: false,
    setPaywallOpen: vi.fn(),
    paywallFeature: null,
    paywallTier: null,
    canUse: vi.fn().mockReturnValue(true),
  }),
}));

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn().mockReturnValue([]),
    setJSON: vi.fn(),
  },
}));

vi.mock("@/engine/userKnowledgeGraph", () => ({
  buildUserKnowledgeGraph: vi.fn().mockReturnValue({
    business: {
      field: "tech",
      product: "SaaS tool",
      price: "100",
      audience: "SMBs",
      budget: "medium",
      goal: "growth",
      experience: "intermediate",
      salesModel: "direct",
      channels: ["email", "social"],
    },
    derived: {
      identityStatement: { he: "זהות", en: "Identity" },
      topPainPoint: { he: "כאב", en: "Pain" },
      industryPainPoints: [],
      framingPreference: "value",
      complexityLevel: "medium",
      realMetrics: { avgCPL: null, avgCTR: null, avgCVR: null, trendDirection: null },
      dataConfidence: "no_data",
    },
    behavior: { stageOfChange: "action" },
    differentiation: null,
    voice: null,
  }),
  loadImportedDataSignals: vi.fn().mockReturnValue(null),
}));

vi.mock("@/components/PaywallModal", () => ({
  default: () => <div data-testid="paywall-modal" />,
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

describe("AiCoachChat", () => {
  it("renders without crashing", () => {
    render(<AiCoachChat result={mockResult} />);
    expect(screen.getByText("AI Marketing Coach")).toBeInTheDocument();
  });

  it("shows the coach subtitle text", () => {
    render(<AiCoachChat result={mockResult} />);
    expect(
      screen.getByText("Knows your business, style, and plans. Ask anything.")
    ).toBeInTheDocument();
  });

  it("shows quick prompt buttons when no messages", () => {
    render(<AiCoachChat result={mockResult} />);
    expect(
      screen.getByText("Ask me anything about your marketing:")
    ).toBeInTheDocument();
  });

  it("shows send button", () => {
    render(<AiCoachChat result={mockResult} />);
    const sendButton = document.querySelector("button[class*='shrink-0']");
    expect(sendButton).toBeInTheDocument();
  });

  it("shows textarea for input", () => {
    render(<AiCoachChat result={mockResult} />);
    expect(screen.getByPlaceholderText("Ask your coach...")).toBeInTheDocument();
  });

  it("renders with healthScore prop", () => {
    render(<AiCoachChat result={mockResult} healthScore={85} />);
    expect(screen.getByText("AI Marketing Coach")).toBeInTheDocument();
  });

  it("renders with stylomePrompt prop", () => {
    render(<AiCoachChat result={mockResult} stylomePrompt="Be concise" />);
    expect(screen.getByText("AI Marketing Coach")).toBeInTheDocument();
  });
});
