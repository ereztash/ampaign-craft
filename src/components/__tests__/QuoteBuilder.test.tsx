import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import QuoteBuilder from "../QuoteBuilder";
import type { FunnelResult } from "@/types/funnel";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));
vi.mock("@/i18n/tx", () => ({
  tx: (_obj: Record<string, string>, lang: string) =>
    lang === "he" ? _obj.he : _obj.en,
}));

vi.mock("@/engine/pricingIntelligenceEngine", () => ({
  generatePricingIntelligence: vi.fn(() => ({
    pricingModel: {
      label: { he: "תמחור", en: "Pricing" },
      rationale: { he: "הסבר", en: "Rationale" },
      valueMetric: { he: "מדד", en: "per user" },
      recommendedRange: { low: 500, high: 2000 },
      anchorPrice: 3000,
    },
    tierStructure: {
      highlightedTierIndex: 1,
      tiers: [
        {
          name: { he: "בסיסי", en: "Starter" },
          price: 500,
          annualPrice: 4800,
          annualDiscount: 20,
          features: [{ he: "פיצ'ר", en: "Feature A" }],
          targetSegment: { he: "קטן", en: "Small" },
          isPrimary: false,
          isDecoy: false,
        },
        {
          name: { he: "מקצועי", en: "Pro" },
          price: 1200,
          annualPrice: 11520,
          annualDiscount: 20,
          features: [{ he: "כל הפיצ'רים", en: "All features" }],
          targetSegment: { he: "בינוני", en: "Medium" },
          isPrimary: true,
          isDecoy: false,
        },
      ],
    },
    offerStack: {
      bonuses: [],
      totalPerceivedValue: 5000,
      actualPrice: 1200,
      valueToPrice: 4.2,
      valueEquation: { dreamOutcome: 8, perceivedLikelihood: 7, timeDelay: 6, effortSacrifice: 7, totalScore: 7.2 },
    },
    guarantee: {
      label: { he: "ערבות", en: "Guarantee" },
      script: { he: "אנחנו מבטיחים", en: "We guarantee" },
      trustScore: 9,
    },
    priceFramingScripts: [],
  })),
}));

vi.mock("@/engine/quoteAssemblyEngine", () => ({
  assembleQuote: vi.fn(() => ({
    id: "Q-001",
    status: "draft",
    createdAt: new Date().toISOString(),
    validUntil: new Date().toISOString(),
    headline: { he: "הצעה", en: "Proposal" },
    recipient: { name: "Test Client" },
    discAdaptedFraming: { he: "מסגור", en: "Framing" },
    valueNarrative: { he: "נרטיב", en: "Value narrative" },
    lineItems: [],
    subtotal: 1200,
    total: 1200,
    currency: "ILS",
    bonuses: [],
    guarantee: { label: { he: "ערבות", en: "Guarantee" }, script: { he: "ס", en: "Script" }, duration: "30 days", trustScore: 9 },
    urgencyBlock: null,
    paymentTerms: "50% upfront",
    notes: "",
  })),
}));

vi.mock("@/types/quote", () => ({
  calculateQuoteTotal: vi.fn(() => ({ subtotal: 1200, total: 1200 })),
  formatQuotePrice: vi.fn((price: number, currency: string) => `${currency}${price}`),
}));

vi.mock("@/components/QuotePreview", () => ({
  default: () => <div data-testid="quote-preview" />,
}));

const mockFormData = { businessField: "tech", audienceType: "b2b" } as any;
const mockGraph = { derived: { coldStartMode: false } } as any;
const mockResult: FunnelResult = {
  id: "r1",
  formData: mockFormData,
  funnelName: { he: "תוכנית", en: "Plan" },
  totalBudget: { min: 5000, max: 10000 },
  stages: [],
  kpis: [],
  overallTips: [],
  copyLab: null,
  personalBrand: null,
} as any;

describe("QuoteBuilder", () => {
  const defaultProps = {
    formData: mockFormData,
    graph: mockGraph,
    funnelResult: mockResult,
    onComplete: vi.fn(),
    onBack: vi.fn(),
  };

  it("renders without crashing", () => {
    expect(() => render(<QuoteBuilder {...defaultProps} />)).not.toThrow();
  });

  it("shows Client Details heading on step 1", () => {
    render(<QuoteBuilder {...defaultProps} />);
    expect(screen.getByText("Client Details")).toBeInTheDocument();
  });

  it("shows Select Package heading on step 1", () => {
    render(<QuoteBuilder {...defaultProps} />);
    expect(screen.getByText("Select Package")).toBeInTheDocument();
  });

  it("shows step indicators (1, 2, 3)", () => {
    render(<QuoteBuilder {...defaultProps} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows Client Name label", () => {
    render(<QuoteBuilder {...defaultProps} />);
    expect(screen.getByText(/Client Name/i)).toBeInTheDocument();
  });

  it("shows tier names from pricing engine", () => {
    render(<QuoteBuilder {...defaultProps} />);
    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
  });

  it("Continue button is disabled when no recipient name", () => {
    render(<QuoteBuilder {...defaultProps} />);
    const continueBtn = screen.getByRole("button", { name: /Continue/i });
    expect(continueBtn).toBeDisabled();
  });
});
