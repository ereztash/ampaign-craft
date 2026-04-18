import { describe, it, expect } from "vitest";
import {
  computeFingerprint,
  DIMENSION_LABELS,
  ARCHETYPE_LABELS,
  ENGINE_MANIFEST,
  type BusinessArchetype,
  type BusinessFingerprint,
  type FingerprintDimensions,
} from "../businessFingerprintEngine";
import type { UnifiedProfile } from "@/types/profile";

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeProfile(overrides: Partial<UnifiedProfile> = {}): UnifiedProfile {
  return {
    businessField: "tech",
    audienceType: "b2b",
    mainGoal: "sales",
    salesModel: "subscription",
    experienceLevel: "intermediate",
    pricePositioning: 60,
    competitiveIntensity: 50,
    budgetCapacity: 50,
    teamSize: 20,
    marketMaturity: 50,
    valuePriorities: ["speed", "quality", "cost", "innovation"],
    ageRange: [25, 45],
    channels: ["facebook", "google"],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// ENGINE_MANIFEST
// ─────────────────────────────────────────────────────────────────────────

describe("BusinessFingerprintEngine — ENGINE_MANIFEST", () => {
  it("has the correct name", () => {
    expect(ENGINE_MANIFEST.name).toBe("businessFingerprintEngine");
  });

  it("has stage 'discover'", () => {
    expect(ENGINE_MANIFEST.stage).toBe("discover");
  });

  it("isLive is true", () => {
    expect(ENGINE_MANIFEST.isLive).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// computeFingerprint — structure
// ─────────────────────────────────────────────────────────────────────────

describe("computeFingerprint — return structure", () => {
  it("returns all required top-level fields", () => {
    const result = computeFingerprint(makeProfile());
    expect(result).toHaveProperty("archetype");
    expect(result).toHaveProperty("marketMode");
    expect(result).toHaveProperty("growthStage");
    expect(result).toHaveProperty("dimensions");
    expect(result).toHaveProperty("ux");
  });

  it("archetype is a non-empty string", () => {
    const result = computeFingerprint(makeProfile());
    expect(typeof result.archetype).toBe("string");
    expect(result.archetype.length).toBeGreaterThan(0);
  });

  it("marketMode is one of b2b | b2c | hybrid", () => {
    const result = computeFingerprint(makeProfile());
    expect(["b2b", "b2c", "hybrid"]).toContain(result.marketMode);
  });

  it("growthStage is one of the valid values", () => {
    const result = computeFingerprint(makeProfile());
    expect(["pre-launch", "early", "growth", "mature"]).toContain(result.growthStage);
  });

  it("all dimensions are between 0 and 1", () => {
    const result = computeFingerprint(makeProfile());
    const dims = result.dimensions;
    for (const key of Object.keys(dims) as (keyof FingerprintDimensions)[]) {
      expect(dims[key]).toBeGreaterThanOrEqual(0);
      expect(dims[key]).toBeLessThanOrEqual(1);
    }
  });

  it("ux has required fields", () => {
    const result = computeFingerprint(makeProfile());
    expect(result.ux).toHaveProperty("terminology");
    expect(result.ux).toHaveProperty("complexity");
    expect(result.ux).toHaveProperty("framingPreference");
    expect(result.ux).toHaveProperty("emphasisTabs");
    expect(result.ux).toHaveProperty("simplifiedTabs");
  });

  it("emphasisTabs is a non-empty array with 'strategy'", () => {
    const result = computeFingerprint(makeProfile());
    expect(Array.isArray(result.ux.emphasisTabs)).toBe(true);
    expect(result.ux.emphasisTabs).toContain("strategy");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Archetype detection
// ─────────────────────────────────────────────────────────────────────────

describe("computeFingerprint — archetype detection", () => {
  it("tech + b2b + subscription → premium-b2b-saas", () => {
    const result = computeFingerprint(makeProfile({ businessField: "tech", audienceType: "b2b", salesModel: "subscription" }));
    expect(result.archetype).toBe("premium-b2b-saas");
  });

  it("personalBrand → creator-economy", () => {
    const result = computeFingerprint(makeProfile({ businessField: "personalBrand", audienceType: "b2c" }));
    expect(result.archetype).toBe("creator-economy");
  });

  it("services + b2b → b2b-professional-services", () => {
    const result = computeFingerprint(makeProfile({ businessField: "services", audienceType: "b2b", salesModel: "oneTime" }));
    expect(result.archetype).toBe("b2b-professional-services");
  });

  it("fashion b2c → b2c-ecommerce", () => {
    const result = computeFingerprint(makeProfile({ businessField: "fashion", audienceType: "b2c", salesModel: "oneTime" }));
    expect(result.archetype).toBe("b2c-ecommerce");
  });

  it("b2c + subscription → b2c-subscription", () => {
    const result = computeFingerprint(makeProfile({ audienceType: "b2c", salesModel: "subscription", businessField: "services", pricePositioning: 40 }));
    expect(result.archetype).toBe("b2c-subscription");
  });

  it("falls back to 'general' when no rule matches", () => {
    const result = computeFingerprint(makeProfile({ businessField: "other", audienceType: "b2c", salesModel: "oneTime", pricePositioning: 30 }));
    expect(result.archetype).toBe("general");
  });

  it("tech + b2b without subscription → b2b-enterprise", () => {
    const result = computeFingerprint(makeProfile({ businessField: "tech", audienceType: "b2b", salesModel: "oneTime" }));
    expect(result.archetype).toBe("b2b-enterprise");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Market mode detection
// ─────────────────────────────────────────────────────────────────────────

describe("computeFingerprint — marketMode", () => {
  it("audienceType 'b2b' → marketMode 'b2b'", () => {
    const result = computeFingerprint(makeProfile({ audienceType: "b2b" }));
    expect(result.marketMode).toBe("b2b");
  });

  it("audienceType 'b2c' → marketMode 'b2c'", () => {
    const result = computeFingerprint(makeProfile({ audienceType: "b2c" }));
    expect(result.marketMode).toBe("b2c");
  });

  it("audienceType 'both' → marketMode 'hybrid'", () => {
    const result = computeFingerprint(makeProfile({ audienceType: "both" }));
    expect(result.marketMode).toBe("hybrid");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Growth stage detection
// ─────────────────────────────────────────────────────────────────────────

describe("computeFingerprint — growthStage", () => {
  it("low scores → pre-launch", () => {
    const result = computeFingerprint(makeProfile({ marketMaturity: 0, teamSize: 0, budgetCapacity: 0 }));
    expect(result.growthStage).toBe("pre-launch");
  });

  it("high scores → mature", () => {
    const result = computeFingerprint(makeProfile({ marketMaturity: 100, teamSize: 100, budgetCapacity: 100 }));
    expect(result.growthStage).toBe("mature");
  });

  it("mid scores → growth or early", () => {
    const result = computeFingerprint(makeProfile({ marketMaturity: 50, teamSize: 50, budgetCapacity: 50 }));
    expect(["early", "growth"]).toContain(result.growthStage);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// UX derivation
// ─────────────────────────────────────────────────────────────────────────

describe("computeFingerprint — UX", () => {
  it("creator-economy archetype → terminology 'creator'", () => {
    const result = computeFingerprint(makeProfile({ businessField: "personalBrand", audienceType: "b2c" }));
    expect(result.ux.terminology).toBe("creator");
  });

  it("b2b → terminology 'b2b'", () => {
    const result = computeFingerprint(makeProfile({ audienceType: "b2b" }));
    expect(result.ux.terminology).toBe("b2b");
  });

  it("b2c → terminology 'b2c'", () => {
    const result = computeFingerprint(makeProfile({ audienceType: "b2c", businessField: "food" }));
    expect(result.ux.terminology).toBe("b2c");
  });

  it("advanced experience → complexity 'advanced'", () => {
    const result = computeFingerprint(makeProfile({ experienceLevel: "advanced" }));
    expect(result.ux.complexity).toBe("advanced");
  });

  it("beginner experience → complexity 'simple'", () => {
    const result = computeFingerprint(makeProfile({ experienceLevel: "beginner", valuePriorities: ["cost", "speed", "quality", "innovation"] }));
    expect(result.ux.complexity).toBe("simple");
  });

  it("high competitive intensity → loss framing", () => {
    const result = computeFingerprint(makeProfile({ competitiveIntensity: 90 }));
    expect(result.ux.framingPreference).toBe("loss");
  });

  it("awareness goal → gain framing (for non-competitor scenario)", () => {
    const result = computeFingerprint(makeProfile({
      mainGoal: "awareness",
      competitiveIntensity: 30,
      businessField: "personalBrand",
      audienceType: "b2c",
    }));
    expect(result.ux.framingPreference).toBe("gain");
  });

  it("simplifiedTabs is empty array for advanced complexity", () => {
    const result = computeFingerprint(makeProfile({ experienceLevel: "advanced" }));
    expect(result.ux.simplifiedTabs).toEqual([]);
  });

  it("sales goal adds 'sales' and 'planning' to emphasisTabs", () => {
    const result = computeFingerprint(makeProfile({ mainGoal: "sales" }));
    expect(result.ux.emphasisTabs).toContain("sales");
    expect(result.ux.emphasisTabs).toContain("planning");
  });

  it("loyalty goal adds 'retention' to emphasisTabs", () => {
    const result = computeFingerprint(makeProfile({ mainGoal: "loyalty" }));
    expect(result.ux.emphasisTabs).toContain("retention");
  });

  it("awareness goal adds 'content' to emphasisTabs", () => {
    const result = computeFingerprint(makeProfile({ mainGoal: "awareness" }));
    expect(result.ux.emphasisTabs).toContain("content");
  });

  it("no duplicate tabs in emphasisTabs", () => {
    const result = computeFingerprint(makeProfile({ mainGoal: "sales" }));
    const tabs = result.ux.emphasisTabs;
    expect(tabs.length).toBe(new Set(tabs).size);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// DIMENSION_LABELS and ARCHETYPE_LABELS
// ─────────────────────────────────────────────────────────────────────────

describe("DIMENSION_LABELS", () => {
  it("has all 6 dimension labels", () => {
    const keys = Object.keys(DIMENSION_LABELS);
    expect(keys).toContain("priceComplexity");
    expect(keys).toContain("salesCycleLength");
    expect(keys).toContain("competitiveIntensity");
    expect(keys).toContain("customerLifetimeValue");
    expect(keys).toContain("acquisitionComplexity");
    expect(keys).toContain("brandDependency");
  });

  it("each label has bilingual text", () => {
    for (const [, label] of Object.entries(DIMENSION_LABELS)) {
      expect(label.he).toBeTruthy();
      expect(label.en).toBeTruthy();
    }
  });
});

describe("ARCHETYPE_LABELS", () => {
  it("covers all archetypes", () => {
    const archetypes: BusinessArchetype[] = [
      "premium-b2b-saas", "b2b-professional-services", "b2b-enterprise",
      "local-b2c-service", "b2c-ecommerce", "b2c-subscription",
      "creator-economy", "marketplace", "high-ticket-b2c", "general",
    ];
    for (const archetype of archetypes) {
      expect(ARCHETYPE_LABELS[archetype]).toBeDefined();
      expect(ARCHETYPE_LABELS[archetype].he).toBeTruthy();
      expect(ARCHETYPE_LABELS[archetype].en).toBeTruthy();
    }
  });
});
