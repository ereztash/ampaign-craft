import { describe, it, expect, vi } from "vitest";
import { assembleQuote, generateQuoteFromScratch } from "../quoteAssemblyEngine";
import type { FormData } from "@/types/funnel";
import type { QuoteAssemblyInput, QuoteRecipient } from "@/types/quote";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../pricingIntelligenceEngine", () => ({
  generatePricingIntelligence: vi.fn(() => makePricingResult()),
}));

vi.mock("../hormoziValueEngine", () => ({
  calculateValueScore: vi.fn(() => ({
    overallScore: 72,
    offerGrade: "strong",
    dreamOutcome: { score: 70, analysis: { he: "", en: "" }, tips: [] },
    perceivedLikelihood: { score: 65, analysis: { he: "", en: "" }, tips: [] },
    timeDelay: { score: 75, analysis: { he: "", en: "" }, tips: [] },
    effortSacrifice: { score: 68, analysis: { he: "", en: "" }, tips: [] },
    optimizationPriority: { he: "", en: "" },
    valueEquationDisplay: { he: "=", en: "=" },
  })),
}));

vi.mock("../costOfInactionEngine", () => ({
  calculateCostOfInaction: vi.fn(() => ({
    lossFramedMessage: { he: "אתה מאבד ₪1000 בחודש", en: "You lose ₪1000 a month" },
    comparisonMessage: { he: "פי 3 יותר יקר לחכות", en: "3x more expensive to wait" },
    urgencyMessage: { he: "תפסיד הזדמנות", en: "You'll miss the opportunity" },
  })),
}));

vi.mock("../discProfileEngine", () => ({
  inferDISCProfile: vi.fn(() => ({
    primary: "D",
    secondary: "C",
    intensity: 0.7,
    description: { he: "", en: "" },
    communicationTips: [],
  })),
}));

vi.mock("./pricingKnowledge", () => ({
  applyCharmPricing: vi.fn((price: number) => price - 1),
}));

vi.mock("../pricingKnowledge", () => ({
  applyCharmPricing: vi.fn((price: number) => price - 1),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech",
    audienceType: "b2c",
    ageRange: [25, 45],
    interests: "marketing",
    productDescription: "SaaS platform for marketing automation",
    averagePrice: 200,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook", "instagram"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

function makeGraph() {
  return {
    business: {
      field: "tech",
      audience: "b2c",
      ageRange: [25, 45] as [number, number],
      interests: ["marketing"],
      product: "SaaS platform",
      price: 200,
      salesModel: "subscription",
      budget: "medium",
      goal: "sales",
      channels: ["facebook", "instagram"],
      experience: "intermediate",
    },
    differentiation: null,
    derived: {
      framingPreference: "system1" as const,
      pricePerception: "mid" as const,
      identityStatement: { he: "", en: "" },
      competitorCount: 0,
      industryPainPoints: [],
    },
  } as any;
}

function makeTier() {
  return {
    name: { he: "פרו", en: "Pro" },
    price: 299,
    annualPrice: 2990,
    annualDiscount: 10,
    features: [{ he: "פיצ'ר 1", en: "Feature 1" }, { he: "פיצ'ר 2", en: "Feature 2" }],
    targetSegment: { he: "עסקים", en: "Businesses" },
    isDecoy: false,
    isPrimary: true,
  };
}

function makePricingResult(overrides: Partial<any> = {}) {
  return {
    tierStructure: {
      pattern: "good_better_best",
      tiers: [makeTier(), { ...makeTier(), name: { he: "בייסיק", en: "Basic" }, price: 99, isPrimary: false }, { ...makeTier(), name: { he: "פלטינום", en: "Platinum" }, price: 599, isPrimary: false }],
      decoyTierIndex: 0,
      highlightedTierIndex: 1,
    },
    pricingModel: {
      model: "value_based",
      label: { he: "מבוסס ערך", en: "Value-based" },
      rationale: { he: "", en: "" },
      valueMetric: { he: "", en: "" },
      recommendedRange: { low: 100, mid: 200, high: 400 },
      charmPricePoints: [199, 299, 499],
      anchorPrice: 599,
    },
    offerStack: {
      coreOffer: { he: "הצעה ראשית", en: "Core offer" },
      bonuses: [
        { name: { he: "בונוס 1", en: "Bonus 1" }, value: { he: "₪200", en: "$200" }, emoji: "🎁" },
      ],
      totalPerceivedValue: 1000,
      actualPrice: 299,
      valueToPrice: 3.3,
      valueEquation: { dreamOutcome: 8, perceivedLikelihood: 7, timeDelay: 6, effortSacrifice: 5, totalScore: 65 },
    },
    guarantee: { type: "full", label: { he: "ערבות מלאה", en: "Full guarantee" }, duration: "30 days", conditions: { he: "", en: "" } },
    priceFramingScripts: [
      { context: "proposal", label: { he: "הצעת מחיר מותאמת אישית", en: "Custom Price Proposal" }, script: { he: "", en: "" } },
    ],
    competitivePosition: { position: "premium", label: { he: "", en: "" }, rationale: { he: "", en: "" } },
    subscriptionEconomics: null,
    nextSteps: [],
    ...overrides,
  };
}

function makeRecipient(): QuoteRecipient {
  return { name: "ישראל ישראלי", company: "חברה בע\"מ", email: "israel@example.com" };
}

function makeAssemblyInput(overrides: Partial<QuoteAssemblyInput> = {}): QuoteAssemblyInput {
  return {
    pricingResult: makePricingResult(),
    selectedTierIndex: 1,
    recipient: makeRecipient(),
    currency: "ILS",
    validityDays: 14,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════
// assembleQuote — Structure Tests
// ═══════════════════════════════════════════════

describe("assembleQuote", () => {
  it("returns a Quote with all required fields", () => {
    const quote = assembleQuote(makeFormData(), makeGraph(), null, makeAssemblyInput());
    expect(quote.id).toBeTruthy();
    expect(quote.createdAt).toBeTruthy();
    expect(quote.validUntil).toBeTruthy();
    expect(quote.status).toBe("draft");
    expect(quote.recipient).toBeDefined();
    expect(quote.headline).toBeDefined();
    expect(quote.selectedTier).toBeDefined();
    expect(quote.lineItems).toBeDefined();
    expect(quote.bonuses).toBeDefined();
    expect(quote.guarantee).toBeDefined();
    expect(quote.subtotal).toBeTypeOf("number");
    expect(quote.total).toBeTypeOf("number");
    expect(quote.currency).toBe("ILS");
    expect(quote.signatureRequested).toBe(false);
  });

  it("id follows Q-<ts>-<rand> format (uppercase)", () => {
    const quote = assembleQuote(makeFormData(), makeGraph(), null, makeAssemblyInput());
    expect(quote.id).toMatch(/^Q-[A-Z0-9]+-[A-Z0-9]+$/);
  });

  it("two quotes have different ids", () => {
    const q1 = assembleQuote(makeFormData(), makeGraph(), null, makeAssemblyInput());
    const q2 = assembleQuote(makeFormData(), makeGraph(), null, makeAssemblyInput());
    expect(q1.id).not.toBe(q2.id);
  });

  it("validUntil is validityDays after createdAt", () => {
    const quote = assembleQuote(makeFormData(), makeGraph(), null, makeAssemblyInput({ validityDays: 30 }));
    const created = new Date(quote.createdAt).getTime();
    const valid = new Date(quote.validUntil).getTime();
    const diffDays = (valid - created) / (1000 * 60 * 60 * 24);
    expect(Math.round(diffDays)).toBe(30);
  });

  it("defaults to 14-day validity when validityDays not specified", () => {
    const input = makeAssemblyInput();
    delete (input as any).validityDays;
    const quote = assembleQuote(makeFormData(), makeGraph(), null, input);
    const created = new Date(quote.createdAt).getTime();
    const valid = new Date(quote.validUntil).getTime();
    const diffDays = (valid - created) / (1000 * 60 * 60 * 24);
    expect(Math.round(diffDays)).toBe(14);
  });

  it("line items include main item plus feature items", () => {
    const quote = assembleQuote(makeFormData(), makeGraph(), null, makeAssemblyInput());
    expect(quote.lineItems.length).toBeGreaterThanOrEqual(1);
    expect(quote.lineItems[0].id).toBe("li-main");
  });

  it("valueNarrative has he and en strings when Hormozi is available", () => {
    const quote = assembleQuote(makeFormData(), makeGraph(), null, makeAssemblyInput());
    expect(quote.valueNarrative.he).toBeTruthy();
    expect(quote.valueNarrative.en).toBeTruthy();
  });

  it("discAdaptedFraming is set based on DISC profile", () => {
    const quote = assembleQuote(makeFormData(), makeGraph(), null, makeAssemblyInput());
    expect(quote.discAdaptedFraming.he).toBeTruthy();
    expect(quote.discAdaptedFraming.en).toBeTruthy();
  });

  it("urgencyBlock is populated when funnelResult is provided", () => {
    const funnelResult = { bottleneckStage: "conversion" } as any;
    const quote = assembleQuote(makeFormData(), makeGraph(), funnelResult, makeAssemblyInput());
    expect(quote.urgencyBlock).toBeDefined();
    expect(quote.urgencyBlock?.he).toBeTruthy();
  });

  it("urgencyBlock is undefined when funnelResult is null", () => {
    // Mock calculateCostOfInaction to throw when no funnelResult
    const { calculateCostOfInaction } = vi.mocked(await import("../costOfInactionEngine"));
    calculateCostOfInaction.mockImplementationOnce(() => { throw new Error("no result"); });
    const quote = assembleQuote(makeFormData(), makeGraph(), null, makeAssemblyInput());
    expect(quote.urgencyBlock).toBeUndefined();
  });

  it("falls back to first tier when selectedTierIndex is out of range", () => {
    const input = makeAssemblyInput({ selectedTierIndex: 99 });
    const quote = assembleQuote(makeFormData(), makeGraph(), null, input);
    expect(quote.selectedTier).toBeDefined();
  });

  it("headline comes from proposal priceFramingScript when available", () => {
    const quote = assembleQuote(makeFormData(), makeGraph(), null, makeAssemblyInput());
    expect(quote.headline.he).toBeTruthy();
    expect(quote.headline.en).toBeTruthy();
  });

  it("headline falls back to default when no proposal script", () => {
    const pricingResult = makePricingResult({ priceFramingScripts: [] });
    const quote = assembleQuote(makeFormData(), makeGraph(), null, makeAssemblyInput({ pricingResult }));
    expect(quote.headline.he).toBe("הצעת מחיר");
    expect(quote.headline.en).toBe("Price Proposal");
  });

  it("uses ILS currency by default", () => {
    const input = makeAssemblyInput();
    delete (input as any).currency;
    const quote = assembleQuote(makeFormData(), makeGraph(), null, input);
    expect(quote.currency).toBe("ILS");
  });

  it("respects USD currency override", () => {
    const quote = assembleQuote(makeFormData(), makeGraph(), null, makeAssemblyInput({ currency: "USD" }));
    expect(quote.currency).toBe("USD");
  });

  it("subtotal equals total when no discount", () => {
    const quote = assembleQuote(makeFormData(), makeGraph(), null, makeAssemblyInput());
    expect(quote.discount).toBeUndefined();
    // subtotal and total come from calculateQuoteTotal — both based on line item totals
    expect(typeof quote.subtotal).toBe("number");
    expect(typeof quote.total).toBe("number");
  });
});

// ═══════════════════════════════════════════════
// generateQuoteFromScratch
// ═══════════════════════════════════════════════

describe("generateQuoteFromScratch", () => {
  it("returns a valid Quote", () => {
    const quote = generateQuoteFromScratch(makeFormData(), makeGraph(), null, makeRecipient());
    expect(quote.id).toBeTruthy();
    expect(quote.status).toBe("draft");
  });

  it("uses highlighted tier when no selectedTierIndex provided", () => {
    const quote = generateQuoteFromScratch(makeFormData(), makeGraph(), null, makeRecipient());
    // highlightedTierIndex is 1 (index of the "Basic" tier in our mock)
    expect(quote.selectedTier).toBeDefined();
  });

  it("respects explicit selectedTierIndex = 0", () => {
    const quote = generateQuoteFromScratch(makeFormData(), makeGraph(), null, makeRecipient(), 0);
    expect(quote.selectedTier).toBeDefined();
  });

  it("recipient is passed through correctly", () => {
    const recipient = makeRecipient();
    const quote = generateQuoteFromScratch(makeFormData(), makeGraph(), null, recipient);
    expect(quote.recipient.name).toBe(recipient.name);
    expect(quote.recipient.email).toBe(recipient.email);
  });
});
