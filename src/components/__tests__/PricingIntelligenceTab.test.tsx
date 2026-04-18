import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PricingIntelligenceTab from "../PricingIntelligenceTab";
import type { FunnelResult } from "@/types/funnel";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));
vi.mock("@/i18n/tx", () => ({
  tx: (_obj: Record<string, string>, lang: string) =>
    lang === "he" ? _obj.he : _obj.en,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

vi.mock("@/engine/userKnowledgeGraph", () => ({
  buildUserKnowledgeGraph: vi.fn(() => ({ derived: { coldStartMode: false } })),
}));

vi.mock("@/engine/pricingIntelligenceEngine", () => ({
  generatePricingIntelligence: vi.fn(() => ({
    pricingModel: {
      label: { he: "תמחור על בסיס ערך", en: "Value-based Pricing" },
      rationale: { he: "הרציונל", en: "Value-based rationale text" },
      valueMetric: { he: "מדד", en: "per user" },
      recommendedRange: { low: 500, high: 2000 },
      anchorPrice: 3000,
    },
    tierStructure: {
      tiers: [
        {
          name: { he: "בסיסי", en: "Basic" },
          price: 500,
          annualPrice: 4800,
          annualDiscount: 20,
          features: [{ he: "פיצ'ר 1", en: "Feature 1" }],
          targetSegment: { he: "עסקים קטנים", en: "Small businesses" },
          isPrimary: false,
          isDecoy: false,
        },
        {
          name: { he: "מקצועי", en: "Professional" },
          price: 1200,
          annualPrice: 11520,
          annualDiscount: 20,
          features: [{ he: "כל הפיצ'רים", en: "All features" }],
          targetSegment: { he: "עסקים בינוניים", en: "Medium businesses" },
          isPrimary: true,
          isDecoy: false,
        },
        {
          name: { he: "ארגוני", en: "Enterprise" },
          price: 3000,
          annualPrice: 28800,
          annualDiscount: 20,
          features: [{ he: "הכל + תמיכה", en: "All + support" }],
          targetSegment: { he: "ארגונים גדולים", en: "Large orgs" },
          isPrimary: false,
          isDecoy: false,
        },
      ],
      highlightedTierIndex: 1,
    },
    offerStack: {
      bonuses: [
        {
          name: { he: "בונוס", en: "Bonus" },
          description: { he: "תיאור", en: "Bonus description" },
          anchoredValue: 500,
          type: "bonus-1",
        },
      ],
      totalPerceivedValue: 5000,
      actualPrice: 1200,
      valueToPrice: 4.2,
      valueEquation: {
        dreamOutcome: 8,
        perceivedLikelihood: 7,
        timeDelay: 6,
        effortSacrifice: 7,
        totalScore: 7.2,
      },
    },
    guarantee: {
      label: { he: "ערבות להחזר כסף", en: "Money-back guarantee" },
      script: { he: "אנחנו מבטיחים", en: "We guarantee your satisfaction" },
      trustScore: 9,
    },
    priceFramingScripts: [
      {
        context: "landing_page",
        label: { he: "דף נחיתה", en: "Landing Page" },
        principle: "Anchoring",
        script: { he: "טקסט מסגור", en: "Price framing script text" },
      },
    ],
    subscriptionEconomics: null,
  })),
}));

const mockResult: FunnelResult = {
  id: "r1",
  formData: { businessField: "tech", audienceType: "b2b" } as any,
  funnelName: { he: "תוכנית", en: "Plan" },
  totalBudget: { min: 5000, max: 10000 },
  stages: [],
  kpis: [],
  overallTips: [],
  copyLab: null,
  personalBrand: null,
} as any;

describe("PricingIntelligenceTab", () => {
  it("renders without crashing", () => {
    expect(() => render(<PricingIntelligenceTab result={mockResult} />)).not.toThrow();
  });

  it("shows the pricing model label", () => {
    render(<PricingIntelligenceTab result={mockResult} />);
    expect(screen.getByText("Value-based Pricing")).toBeInTheDocument();
  });

  it("shows the Recommended Tier Structure heading", () => {
    render(<PricingIntelligenceTab result={mockResult} />);
    expect(screen.getByText("Recommended Tier Structure")).toBeInTheDocument();
  });

  it("shows all three tier names", () => {
    render(<PricingIntelligenceTab result={mockResult} />);
    expect(screen.getByText("Basic")).toBeInTheDocument();
    expect(screen.getByText("Professional")).toBeInTheDocument();
    expect(screen.getByText("Enterprise")).toBeInTheDocument();
  });

  it("shows Most Popular badge on primary tier", () => {
    render(<PricingIntelligenceTab result={mockResult} />);
    expect(screen.getByText("Most Popular")).toBeInTheDocument();
  });

  it("shows the guarantee label", () => {
    render(<PricingIntelligenceTab result={mockResult} />);
    expect(screen.getByText("Money-back guarantee")).toBeInTheDocument();
  });

  it("shows Price Framing Scripts heading", () => {
    render(<PricingIntelligenceTab result={mockResult} />);
    expect(screen.getByText("Price Framing Scripts")).toBeInTheDocument();
  });
});
