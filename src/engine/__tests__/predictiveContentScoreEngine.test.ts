import { describe, it, expect } from "vitest";
import {
  predictContentScore,
  getPredictiveContentVerdict,
  ENGINE_MANIFEST,
  type ContentLanguage,
  type ChannelName,
} from "../predictiveContentScoreEngine";
import type { DISCProfile } from "../discProfileEngine";
import type { BrandVectorResult } from "../brandVectorEngine";

// ═══════════════════════════════════════════════
// Fixtures
// ═══════════════════════════════════════════════

function makeDISC(primary: "D" | "I" | "S" | "C"): DISCProfile {
  return {
    primary,
    secondary: "I",
    scores: { D: 70, I: 60, S: 50, C: 40 },
    communicationTone: { he: "ישיר", en: "direct" },
  } as unknown as DISCProfile;
}

function makeBrand(primaryVector: "cortisol" | "oxytocin" | "dopamine"): BrandVectorResult {
  return {
    primaryVector,
    funnelAlignment: 70,
    vectorDistribution: { cortisol: 40, oxytocin: 30, dopamine: 30 },
    mismatch: null,
  } as unknown as BrandVectorResult;
}

const SAMPLE_HE = "הפלטפורמה שלנו עוזרת לך להגדיל את המכירות תוך 30 יום. לחץ כאן להתחיל.";
const SAMPLE_EN = "Our platform helps you increase sales within 30 days. Click here to start.";

// ═══════════════════════════════════════════════
// ENGINE_MANIFEST
// ═══════════════════════════════════════════════

describe("predictiveContentScoreEngine — ENGINE_MANIFEST", () => {
  it("name is predictiveContentScoreEngine", () => {
    expect(ENGINE_MANIFEST.name).toBe("predictiveContentScoreEngine");
  });

  it("stage is design", () => {
    expect(ENGINE_MANIFEST.stage).toBe("design");
  });

  it("isLive is true", () => {
    expect(ENGINE_MANIFEST.isLive).toBe(true);
  });
});

// ═══════════════════════════════════════════════
// predictContentScore — structure
// ═══════════════════════════════════════════════

describe("predictContentScore — result structure", () => {
  it("returns all required top-level fields", () => {
    const result = predictContentScore(SAMPLE_HE);
    expect(result.overallScore).toBeDefined();
    expect(result.engagementPrediction).toBeDefined();
    expect(result.conversionPrediction).toBeDefined();
    expect(result.channelFit).toBeDefined();
    expect(result.improvementSuggestions).toBeDefined();
    expect(result.breakdown).toBeDefined();
  });

  it("overallScore is between 0 and 100", () => {
    const result = predictContentScore(SAMPLE_HE);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });

  it("engagementPrediction is between 0 and 100", () => {
    const result = predictContentScore(SAMPLE_HE);
    expect(result.engagementPrediction).toBeGreaterThanOrEqual(0);
    expect(result.engagementPrediction).toBeLessThanOrEqual(100);
  });

  it("conversionPrediction is between 0 and 100", () => {
    const result = predictContentScore(SAMPLE_HE);
    expect(result.conversionPrediction).toBeGreaterThanOrEqual(0);
    expect(result.conversionPrediction).toBeLessThanOrEqual(100);
  });

  it("breakdown contains all 5 components", () => {
    const result = predictContentScore(SAMPLE_HE);
    const b = result.breakdown;
    expect(b.copyQuality).toBeDefined();
    expect(b.culturalFit).toBeDefined();
    expect(b.discAlignment).toBeDefined();
    expect(b.brandAlignment).toBeDefined();
    expect(b.humanAuthenticity).toBeDefined();
  });

  it("channelFit has 6 channels by default", () => {
    const result = predictContentScore(SAMPLE_HE);
    expect(result.channelFit).toHaveLength(6);
  });

  it("all channel fit scores are 0-100", () => {
    const result = predictContentScore(SAMPLE_HE);
    for (const ch of result.channelFit) {
      expect(ch.fit).toBeGreaterThanOrEqual(0);
      expect(ch.fit).toBeLessThanOrEqual(100);
    }
  });

  it("all channels have bilingual reason", () => {
    const result = predictContentScore(SAMPLE_HE);
    for (const ch of result.channelFit) {
      expect(ch.reason.he.length).toBeGreaterThan(0);
      expect(ch.reason.en.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════
// predictContentScore — language support
// ═══════════════════════════════════════════════

describe("predictContentScore — language variants", () => {
  it("handles Hebrew language without throwing", () => {
    expect(() => predictContentScore(SAMPLE_HE, "he")).not.toThrow();
  });

  it("handles English language without throwing", () => {
    expect(() => predictContentScore(SAMPLE_EN, "en")).not.toThrow();
  });

  it("defaults to 'he' language without error", () => {
    expect(() => predictContentScore(SAMPLE_HE)).not.toThrow();
  });
});

// ═══════════════════════════════════════════════
// predictContentScore — DISC alignment
// ═══════════════════════════════════════════════

describe("predictContentScore — DISC profile influence", () => {
  it("D profile with results-oriented copy boosts discAlignment", () => {
    const textWithResults = "Results: 3x ROI, save costs, win faster.";
    const result = predictContentScore(textWithResults, "en", makeDISC("D"));
    expect(result.breakdown.discAlignment).toBeGreaterThan(30);
  });

  it("I profile with story/emoji copy boosts discAlignment", () => {
    const textWithStory = "Imagine your success 🚀 Feel the excitement! Love the journey. Story of growth.";
    const result = predictContentScore(textWithStory, "en", makeDISC("I"));
    expect(result.breakdown.discAlignment).toBeGreaterThan(30);
  });

  it("S profile with trust copy boosts discAlignment", () => {
    const textWithTrust = "Trust our community, family approach, team support.";
    const result = predictContentScore(textWithTrust, "en", makeDISC("S"));
    expect(result.breakdown.discAlignment).toBeGreaterThan(30);
  });

  it("C profile with data copy boosts discAlignment", () => {
    const textWithData = "Study shows 87% improvement. Research data: 3x results. Proven and certified.";
    const result = predictContentScore(textWithData, "en", makeDISC("C"));
    expect(result.breakdown.discAlignment).toBeGreaterThan(30);
  });

  it("no DISC profile falls back to 60", () => {
    const result = predictContentScore(SAMPLE_EN, "en");
    expect(result.breakdown.discAlignment).toBe(60);
  });
});

// ═══════════════════════════════════════════════
// predictContentScore — Brand alignment
// ═══════════════════════════════════════════════

describe("predictContentScore — brand vector influence", () => {
  it("cortisol brand with urgency copy scores higher brand alignment", () => {
    const urgencyText = "Limited time only! Closing soon. Only 3 spots left until deadline.";
    const result = predictContentScore(urgencyText, "en", undefined, makeBrand("cortisol"));
    expect(result.breakdown.brandAlignment).toBe(85);
  });

  it("oxytocin brand with trust copy scores higher brand alignment", () => {
    const trustText = "Join our trusted community. Family values, 500+ reviews from our clients.";
    const result = predictContentScore(trustText, "en", undefined, makeBrand("oxytocin"));
    expect(result.breakdown.brandAlignment).toBe(85);
  });

  it("dopamine brand with reward copy scores higher brand alignment", () => {
    const rewardText = "Discover something new! Unlock exclusive bonus rewards today.";
    const result = predictContentScore(rewardText, "en", undefined, makeBrand("dopamine"));
    expect(result.breakdown.brandAlignment).toBe(85);
  });

  it("mismatched brand vector returns lower alignment", () => {
    const trustText = "Join our trusted community. Family values, reviews.";
    const result = predictContentScore(trustText, "en", undefined, makeBrand("cortisol"));
    expect(result.breakdown.brandAlignment).toBe(45);
  });

  it("no brand vector falls back to 60", () => {
    const result = predictContentScore(SAMPLE_EN, "en");
    expect(result.breakdown.brandAlignment).toBe(60);
  });
});

// ═══════════════════════════════════════════════
// predictContentScore — channel filtering
// ═══════════════════════════════════════════════

describe("predictContentScore — channel filtering", () => {
  it("filters channels when targetChannels is specified", () => {
    const result = predictContentScore(SAMPLE_EN, "en", undefined, undefined, ["whatsapp", "email"]);
    expect(result.channelFit).toHaveLength(2);
    const names = result.channelFit.map((c) => c.channel);
    expect(names).toContain("whatsapp");
    expect(names).toContain("email");
  });

  it("returns all 6 channels when targetChannels is empty array", () => {
    const result = predictContentScore(SAMPLE_EN, "en", undefined, undefined, []);
    expect(result.channelFit).toHaveLength(6);
  });

  it("single channel filter returns 1 channel", () => {
    const result = predictContentScore(SAMPLE_EN, "en", undefined, undefined, ["linkedin"]);
    expect(result.channelFit).toHaveLength(1);
    expect(result.channelFit[0].channel).toBe("linkedin");
  });

  it("all channels represented in default output", () => {
    const result = predictContentScore(SAMPLE_EN, "en");
    const channels = result.channelFit.map((c) => c.channel);
    expect(channels).toContain("whatsapp");
    expect(channels).toContain("facebook");
    expect(channels).toContain("instagram");
    expect(channels).toContain("linkedin");
    expect(channels).toContain("email");
    expect(channels).toContain("twitter");
  });
});

// ═══════════════════════════════════════════════
// predictContentScore — channel fit heuristics
// ═══════════════════════════════════════════════

describe("predictContentScore — channel fit heuristics", () => {
  it("short text (<=60 words) scores higher on WhatsApp", () => {
    const short = predictContentScore("Get results now. Click here.", "en", undefined, undefined, ["whatsapp"]);
    const long = predictContentScore("a ".repeat(130).trim(), "en", undefined, undefined, ["whatsapp"]);
    expect(short.channelFit[0].fit).toBeGreaterThan(long.channelFit[0].fit);
  });

  it("very short text (<=40 words) scores higher on Twitter", () => {
    const veryShort = predictContentScore("Short punchy tweet right here!", "en", undefined, undefined, ["twitter"]);
    const longer = predictContentScore("a ".repeat(60).trim(), "en", undefined, undefined, ["twitter"]);
    expect(veryShort.channelFit[0].fit).toBeGreaterThan(longer.channelFit[0].fit);
  });

  it("professional text boosts LinkedIn score", () => {
    const proText = "Our strategy insights and research data show 3x ROI results for businesses.";
    const result = predictContentScore(proText, "en", undefined, undefined, ["linkedin"]);
    expect(result.channelFit[0].fit).toBeGreaterThan(20);
  });
});

// ═══════════════════════════════════════════════
// predictContentScore — improvement suggestions
// ═══════════════════════════════════════════════

describe("predictContentScore — improvement suggestions", () => {
  it("returns an array of suggestions", () => {
    const result = predictContentScore("x", "en");
    expect(Array.isArray(result.improvementSuggestions)).toBe(true);
  });

  it("each suggestion has he and en fields", () => {
    const result = predictContentScore("x", "en");
    for (const s of result.improvementSuggestions) {
      expect(s.he.length).toBeGreaterThan(0);
      expect(s.en.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════
// getPredictiveContentVerdict
// ═══════════════════════════════════════════════

describe("getPredictiveContentVerdict", () => {
  it("score >= 85 → ready to publish", () => {
    expect(getPredictiveContentVerdict(85).en).toContain("Ready");
    expect(getPredictiveContentVerdict(100).en).toContain("Ready");
  });

  it("score 70-84 → Good verdict", () => {
    expect(getPredictiveContentVerdict(70).en).toContain("Good");
    expect(getPredictiveContentVerdict(84).en).toContain("Good");
  });

  it("score 55-69 → Average", () => {
    expect(getPredictiveContentVerdict(55).en).toContain("Average");
    expect(getPredictiveContentVerdict(69).en).toContain("Average");
  });

  it("score 40-54 → Weak", () => {
    expect(getPredictiveContentVerdict(40).en).toContain("Weak");
    expect(getPredictiveContentVerdict(54).en).toContain("Weak");
  });

  it("score < 40 → Not ready", () => {
    expect(getPredictiveContentVerdict(0).en).toContain("Not ready");
    expect(getPredictiveContentVerdict(39).en).toContain("Not ready");
  });

  it("always returns bilingual result", () => {
    for (const score of [0, 40, 55, 70, 85, 100]) {
      const v = getPredictiveContentVerdict(score);
      expect(v.he.length).toBeGreaterThan(0);
      expect(v.en.length).toBeGreaterThan(0);
    }
  });
});
