import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildRetentionContext,
  PRICING_WIZARD_STORAGE_KEY,
  DIFF_RESULT_STORAGE_KEY,
} from "../retentionPersonalizationContext";
import type { FormData } from "@/types/funnel";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/safeStorage", () => {
  const store = new Map<string, unknown>();
  return {
    safeStorage: {
      getJSON: vi.fn(<T>(key: string, fallback: T): T => {
        return store.has(key) ? (store.get(key) as T) : fallback;
      }),
      setJSON: vi.fn((key: string, value: unknown) => { store.set(key, value); }),
      remove: vi.fn((key: string) => { store.delete(key); }),
      _store: store,
    },
  };
});

vi.mock("../pricingWizardEngine", () => ({
  computePricingWizardRecommendation: vi.fn((input: any) => ({
    hormoziScore: 6,
    charmPrice: input.tooChcapPrice ? Math.round((input.tooChcapPrice + input.stretchPrice) / 2) : 200,
    ltv: 2400,
    optimalPrice: 200,
    acceptableRange: { low: 150, high: 300 },
    anchorPrice: 600,
    differentiationPremium: 0.2,
    psmOPP: 200,
    tiers: [],
    primaryFrame: { he: "", en: "" },
    dailyBreakdown: { he: "", en: "" },
    costOfInactionFrame: { he: "", en: "" },
    recommendedCAC: 60,
    customersNeeded: 10,
    rationale: { he: "", en: "" },
    methodology: { he: "", en: "" },
  })),
  DIFFERENTIATOR_OPTIONS: [],
}));

import { safeStorage } from "@/lib/safeStorage";
import { computePricingWizardRecommendation } from "../pricingWizardEngine";

const mockStorage = safeStorage as unknown as {
  getJSON: ReturnType<typeof vi.fn>;
  _store: Map<string, unknown>;
};
const mockCompute = computePricingWizardRecommendation as ReturnType<typeof vi.fn>;

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech",
    audienceType: "b2c",
    ageRange: [25, 45],
    interests: "marketing",
    productDescription: "SaaS platform for marketing automation with AI",
    averagePrice: 200,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

function makeDiscProfile(primary: "D" | "I" | "S" | "C" = "D"): any {
  return { primary, secondary: "C", intensity: 0.7, description: { he: "", en: "" }, communicationTips: [] };
}

function makePricingWizardInput(overrides: Partial<any> = {}): any {
  return {
    dreamOutcome: "significant",
    timeToValue: "fast",
    tooChcapPrice: 100,
    stretchPrice: 400,
    effortLevel: "medium",
    socialProof: "strong",
    differentiators: ["proven_results"],
    salesModel: "subscription",
    avgRetentionMonths: 12,
    revenueGoalMonthly: 5000,
    audienceIsB2B: false,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════
// buildRetentionContext — Structure
// ═══════════════════════════════════════════════

describe("buildRetentionContext — result structure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage._store.clear();
    mockStorage.getJSON.mockImplementation(<T>(key: string, fallback: T): T => {
      return mockStorage._store.has(key) ? (mockStorage._store.get(key) as T) : fallback;
    });
  });

  it("returns all required context fields", () => {
    const ctx = buildRetentionContext(makeFormData(), null);
    expect(ctx.productName).toBeTruthy();
    expect(ctx.ahaAction).toBeDefined();
    expect(typeof ctx.onboardingDays).toBe("number");
    expect(typeof ctx.offerFixNeeded).toBe("boolean");
    expect(typeof ctx.hormoziScore).toBe("number");
    expect(ctx.referralReward).toBeDefined();
    expect(typeof ctx.referralReward.amount).toBe("number");
    expect(typeof ctx.referralReward.pct).toBe("number");
    expect(typeof ctx.churnRiskFactor).toBe("number");
    expect(ctx.winBackFrame).toBeDefined();
    expect(ctx.coreBenefit).toBeDefined();
    expect(ctx.communicationStyle).toBeTruthy();
    expect(typeof ctx.hasSocialProof).toBe("boolean");
    expect(typeof ctx.charmPrice).toBe("number");
  });
});

// ═══════════════════════════════════════════════
// productName derivation
// ═══════════════════════════════════════════════

describe("buildRetentionContext — productName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.getJSON.mockReturnValue(null);
  });

  it("uses first sentence of productDescription when available", () => {
    const ctx = buildRetentionContext(makeFormData({ productDescription: "My Awesome Product. More details here." }), null);
    expect(ctx.productName).toContain("My Awesome Product");
  });

  it("truncates productName to 40 chars + ellipsis for long descriptions", () => {
    const ctx = buildRetentionContext(makeFormData({ productDescription: "A".repeat(50) }), null);
    expect(ctx.productName).toContain("…");
    expect(ctx.productName.length).toBeLessThanOrEqual(44); // 40 + "…" + possible leading chars
  });

  it("falls back to 'המוצר שלך' for empty productDescription", () => {
    const ctx = buildRetentionContext(makeFormData({ productDescription: "" }), null);
    expect(ctx.productName).toBe("המוצר שלך");
  });

  it("falls back to 'המוצר שלך' for very short productDescription (<=2 chars)", () => {
    const ctx = buildRetentionContext(makeFormData({ productDescription: "AB" }), null);
    expect(ctx.productName).toBe("המוצר שלך");
  });
});

// ═══════════════════════════════════════════════
// DISC communication style
// ═══════════════════════════════════════════════

describe("buildRetentionContext — communicationStyle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.getJSON.mockReturnValue(null);
  });

  it("D profile → direct style", () => {
    const ctx = buildRetentionContext(makeFormData(), makeDiscProfile("D"));
    expect(ctx.communicationStyle).toBe("direct");
  });

  it("I profile → enthusiastic style", () => {
    const ctx = buildRetentionContext(makeFormData(), makeDiscProfile("I"));
    expect(ctx.communicationStyle).toBe("enthusiastic");
  });

  it("S profile → empathic style", () => {
    const ctx = buildRetentionContext(makeFormData(), makeDiscProfile("S"));
    expect(ctx.communicationStyle).toBe("empathic");
  });

  it("C profile → analytical style", () => {
    const ctx = buildRetentionContext(makeFormData(), makeDiscProfile("C"));
    expect(ctx.communicationStyle).toBe("analytical");
  });

  it("null DISC profile → empathic style (default)", () => {
    const ctx = buildRetentionContext(makeFormData(), null);
    expect(ctx.communicationStyle).toBe("empathic");
  });
});

// ═══════════════════════════════════════════════
// Churn risk factor from effort level
// ═══════════════════════════════════════════════

describe("buildRetentionContext — churnRiskFactor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("zero effort → 0.05 risk", () => {
    mockStorage.getJSON.mockReturnValue(makePricingWizardInput({ effortLevel: "zero" }));
    const ctx = buildRetentionContext(makeFormData(), null);
    expect(ctx.churnRiskFactor).toBe(0.05);
  });

  it("low effort → 0.15 risk", () => {
    mockStorage.getJSON.mockReturnValue(makePricingWizardInput({ effortLevel: "low" }));
    const ctx = buildRetentionContext(makeFormData(), null);
    expect(ctx.churnRiskFactor).toBe(0.15);
  });

  it("medium effort → 0.35 risk", () => {
    mockStorage.getJSON.mockReturnValue(makePricingWizardInput({ effortLevel: "medium" }));
    const ctx = buildRetentionContext(makeFormData(), null);
    expect(ctx.churnRiskFactor).toBe(0.35);
  });

  it("high effort → 0.60 risk", () => {
    mockStorage.getJSON.mockReturnValue(makePricingWizardInput({ effortLevel: "high" }));
    const ctx = buildRetentionContext(makeFormData(), null);
    expect(ctx.churnRiskFactor).toBe(0.60);
  });

  it("defaults to medium (0.35) when no pricing input", () => {
    mockStorage.getJSON.mockReturnValue(null);
    const ctx = buildRetentionContext(makeFormData(), null);
    expect(ctx.churnRiskFactor).toBe(0.35);
  });
});

// ═══════════════════════════════════════════════
// Onboarding days from time-to-value
// ═══════════════════════════════════════════════

describe("buildRetentionContext — onboardingDays", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("immediate → 1 day", () => {
    mockStorage.getJSON.mockReturnValue(makePricingWizardInput({ timeToValue: "immediate" }));
    const ctx = buildRetentionContext(makeFormData(), null);
    expect(ctx.onboardingDays).toBe(1);
  });

  it("fast → 3 days", () => {
    mockStorage.getJSON.mockReturnValue(makePricingWizardInput({ timeToValue: "fast" }));
    const ctx = buildRetentionContext(makeFormData(), null);
    expect(ctx.onboardingDays).toBe(3);
  });

  it("moderate → 7 days", () => {
    mockStorage.getJSON.mockReturnValue(makePricingWizardInput({ timeToValue: "moderate" }));
    const ctx = buildRetentionContext(makeFormData(), null);
    expect(ctx.onboardingDays).toBe(7);
  });

  it("slow → 14 days", () => {
    mockStorage.getJSON.mockReturnValue(makePricingWizardInput({ timeToValue: "slow" }));
    const ctx = buildRetentionContext(makeFormData(), null);
    expect(ctx.onboardingDays).toBe(14);
  });

  it("defaults to moderate (7) when no pricing input", () => {
    mockStorage.getJSON.mockReturnValue(null);
    const ctx = buildRetentionContext(makeFormData(), null);
    expect(ctx.onboardingDays).toBe(7);
  });
});

// ═══════════════════════════════════════════════
// Referral reward calculation
// ═══════════════════════════════════════════════

describe("buildRetentionContext — referralReward", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.getJSON.mockReturnValue(null);
  });

  it("reward amount is at least ₪20 (floor)", () => {
    // With a very low price, the floor should kick in
    const ctx = buildRetentionContext(makeFormData({ averagePrice: 10 }), null);
    expect(ctx.referralReward.amount).toBeGreaterThanOrEqual(20);
  });

  it("reward percentage is a positive integer", () => {
    const ctx = buildRetentionContext(makeFormData(), null);
    expect(ctx.referralReward.pct).toBeGreaterThan(0);
    expect(Number.isInteger(ctx.referralReward.pct)).toBe(true);
  });

  it("higher price yields higher or equal reward amount", () => {
    const low = buildRetentionContext(makeFormData({ averagePrice: 50 }), null);
    const high = buildRetentionContext(makeFormData({ averagePrice: 500 }), null);
    expect(high.referralReward.amount).toBeGreaterThanOrEqual(low.referralReward.amount);
  });
});

// ═══════════════════════════════════════════════
// Social proof flag
// ═══════════════════════════════════════════════

describe("buildRetentionContext — hasSocialProof", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exceptional social proof → hasSocialProof true", () => {
    mockStorage.getJSON.mockReturnValue(makePricingWizardInput({ socialProof: "exceptional" }));
    const ctx = buildRetentionContext(makeFormData(), null);
    expect(ctx.hasSocialProof).toBe(true);
  });

  it("strong social proof → hasSocialProof true", () => {
    mockStorage.getJSON.mockReturnValue(makePricingWizardInput({ socialProof: "strong" }));
    const ctx = buildRetentionContext(makeFormData(), null);
    expect(ctx.hasSocialProof).toBe(true);
  });

  it("some social proof → hasSocialProof false", () => {
    mockStorage.getJSON.mockReturnValue(makePricingWizardInput({ socialProof: "some" }));
    const ctx = buildRetentionContext(makeFormData(), null);
    expect(ctx.hasSocialProof).toBe(false);
  });

  it("no social proof → hasSocialProof false", () => {
    mockStorage.getJSON.mockReturnValue(makePricingWizardInput({ socialProof: "none" }));
    const ctx = buildRetentionContext(makeFormData(), null);
    expect(ctx.hasSocialProof).toBe(false);
  });

  it("no pricing input → hasSocialProof defaults to false", () => {
    mockStorage.getJSON.mockReturnValue(null);
    const ctx = buildRetentionContext(makeFormData(), null);
    expect(ctx.hasSocialProof).toBe(false);
  });
});

// ═══════════════════════════════════════════════
// offerFixNeeded
// ═══════════════════════════════════════════════

describe("buildRetentionContext — offerFixNeeded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("offerFixNeeded is true when hormoziScore < 4", () => {
    mockCompute.mockReturnValue({ hormoziScore: 3, charmPrice: 200, ltv: 2400 });
    mockStorage.getJSON.mockReturnValue(makePricingWizardInput());
    const ctx = buildRetentionContext(makeFormData(), null);
    expect(ctx.offerFixNeeded).toBe(true);
  });

  it("offerFixNeeded is false when hormoziScore >= 4", () => {
    mockCompute.mockReturnValue({ hormoziScore: 6, charmPrice: 200, ltv: 2400 });
    mockStorage.getJSON.mockReturnValue(makePricingWizardInput());
    const ctx = buildRetentionContext(makeFormData(), null);
    expect(ctx.offerFixNeeded).toBe(false);
  });

  it("offerFixNeeded is false when no pricing input (neutral default score=5)", () => {
    mockStorage.getJSON.mockReturnValue(null);
    const ctx = buildRetentionContext(makeFormData(), null);
    expect(ctx.offerFixNeeded).toBe(false);
  });
});

// ═══════════════════════════════════════════════
// Storage key constants
// ═══════════════════════════════════════════════

describe("Storage key constants", () => {
  it("PRICING_WIZARD_STORAGE_KEY is defined and non-empty", () => {
    expect(typeof PRICING_WIZARD_STORAGE_KEY).toBe("string");
    expect(PRICING_WIZARD_STORAGE_KEY.length).toBeGreaterThan(0);
  });

  it("DIFF_RESULT_STORAGE_KEY is defined and non-empty", () => {
    expect(typeof DIFF_RESULT_STORAGE_KEY).toBe("string");
    expect(DIFF_RESULT_STORAGE_KEY.length).toBeGreaterThan(0);
  });

  it("the two storage keys are different", () => {
    expect(PRICING_WIZARD_STORAGE_KEY).not.toBe(DIFF_RESULT_STORAGE_KEY);
  });
});
