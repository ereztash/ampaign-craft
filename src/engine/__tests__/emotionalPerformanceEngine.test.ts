import { describe, it, expect } from "vitest";
import { calculateEPS, getEPSVerdict, ENGINE_MANIFEST } from "../emotionalPerformanceEngine";
import type { CopyQAResult } from "../copyQAEngine";
import type { BrandVectorResult } from "../brandVectorEngine";
import type { DISCProfile } from "../discProfileEngine";
import type { StylomeProfile } from "../stylomeEngine";

// ═══════════════════════════════════════════════
// Fixtures
// ═══════════════════════════════════════════════

function makeCopyQA(score = 75): CopyQAResult {
  return {
    score,
    risks: [],
    checklist: [],
    overallComment: { he: "טוב", en: "Good" },
  } as unknown as CopyQAResult;
}

function makeBrandVector(
  cortisol = 40,
  oxytocin = 30,
  dopamine = 30,
  funnelAlignment = 70,
): BrandVectorResult {
  return {
    primaryVector: "cortisol",
    funnelAlignment,
    vectorDistribution: { cortisol, oxytocin, dopamine },
    mismatch: null,
  } as unknown as BrandVectorResult;
}

function makeDISCProfile(primary: "D" | "I" | "S" | "C"): DISCProfile {
  return {
    primary,
    secondary: "I",
    scores: { D: 70, I: 60, S: 50, C: 40 },
    communicationTone: { he: "ישיר", en: "direct" },
  } as unknown as DISCProfile;
}

function makeStylome(burstiness = 60, perplexityEstimate = 60): StylomeProfile {
  return {
    metrics: { burstiness, perplexityEstimate },
  } as unknown as StylomeProfile;
}

// ═══════════════════════════════════════════════
// ENGINE_MANIFEST
// ═══════════════════════════════════════════════

describe("emotionalPerformanceEngine — ENGINE_MANIFEST", () => {
  it("exports correct manifest name", () => {
    expect(ENGINE_MANIFEST.name).toBe("emotionalPerformanceEngine");
  });

  it("manifest has required fields", () => {
    expect(ENGINE_MANIFEST.reads).toBeDefined();
    expect(ENGINE_MANIFEST.writes).toBeDefined();
    expect(ENGINE_MANIFEST.stage).toBe("design");
    expect(ENGINE_MANIFEST.isLive).toBe(true);
  });
});

// ═══════════════════════════════════════════════
// calculateEPS — Structure
// ═══════════════════════════════════════════════

describe("calculateEPS — structure", () => {
  it("returns all required top-level fields", () => {
    const result = calculateEPS();
    expect(result.score).toBeDefined();
    expect(result.emotionalBalance).toBeDefined();
    expect(result.dominantEmotion).toBeDefined();
    expect(result.discAlignment).toBeDefined();
    expect(result.channelBreakdown).toBeDefined();
    expect(result.recommendations).toBeDefined();
    expect(result.components).toBeDefined();
  });

  it("score is clamped between 0 and 100", () => {
    const result = calculateEPS();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("components has all four sub-scores", () => {
    const result = calculateEPS();
    expect(result.components.copyQuality).toBeDefined();
    expect(result.components.brandAlignment).toBeDefined();
    expect(result.components.discAlignment).toBeDefined();
    expect(result.components.stylomeAuthenticity).toBeDefined();
  });

  it("channelBreakdown has exactly 4 channels", () => {
    const result = calculateEPS();
    expect(result.channelBreakdown).toHaveLength(4);
    const channels = result.channelBreakdown.map((c) => c.channel);
    expect(channels).toContain("WhatsApp");
    expect(channels).toContain("Facebook");
    expect(channels).toContain("Instagram");
    expect(channels).toContain("Email");
  });

  it("all channel scores are between 0 and 100", () => {
    const result = calculateEPS(makeCopyQA(90), makeBrandVector());
    for (const ch of result.channelBreakdown) {
      expect(ch.score).toBeGreaterThanOrEqual(0);
      expect(ch.score).toBeLessThanOrEqual(100);
    }
  });

  it("recommendations is a non-empty array", () => {
    const result = calculateEPS();
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("each recommendation has he and en fields", () => {
    const result = calculateEPS();
    for (const rec of result.recommendations) {
      expect(rec.he).toBeTruthy();
      expect(rec.en).toBeTruthy();
    }
  });
});

// ═══════════════════════════════════════════════
// calculateEPS — Defaults (no inputs)
// ═══════════════════════════════════════════════

describe("calculateEPS — neutral defaults", () => {
  it("without brand vector uses 33/33/34 balance", () => {
    const result = calculateEPS();
    expect(result.emotionalBalance.cortisol).toBe(33);
    expect(result.emotionalBalance.oxytocin).toBe(33);
    expect(result.emotionalBalance.dopamine).toBe(34);
  });

  it("without inputs fallback scores are 50", () => {
    const result = calculateEPS();
    expect(result.components.copyQuality).toBe(50);
    expect(result.components.brandAlignment).toBe(50);
    expect(result.components.discAlignment).toBe(50);
    expect(result.components.stylomeAuthenticity).toBe(50);
  });

  it("dominant emotion with 33/33/34 is dopamine", () => {
    const result = calculateEPS();
    expect(result.dominantEmotion).toBe("dopamine");
  });
});

// ═══════════════════════════════════════════════
// calculateEPS — Brand vector
// ═══════════════════════════════════════════════

describe("calculateEPS — brand vector influence", () => {
  it("uses brand vector distribution as emotional balance", () => {
    const result = calculateEPS(undefined, makeBrandVector(70, 20, 10));
    expect(result.emotionalBalance.cortisol).toBe(70);
    expect(result.emotionalBalance.oxytocin).toBe(20);
    expect(result.emotionalBalance.dopamine).toBe(10);
  });

  it("high cortisol balance sets dominantEmotion to cortisol", () => {
    const result = calculateEPS(undefined, makeBrandVector(80, 10, 10));
    expect(result.dominantEmotion).toBe("cortisol");
  });

  it("high oxytocin balance sets dominantEmotion to oxytocin", () => {
    const result = calculateEPS(undefined, makeBrandVector(10, 80, 10));
    expect(result.dominantEmotion).toBe("oxytocin");
  });

  it("high brand alignment score feeds into components", () => {
    const result = calculateEPS(undefined, makeBrandVector(40, 30, 30, 95));
    expect(result.components.brandAlignment).toBe(95);
  });

  it("high cortisol triggers cortisol-too-high recommendation", () => {
    const result = calculateEPS(undefined, makeBrandVector(80, 10, 10));
    const allText = result.recommendations.map((r) => r.en).join(" ");
    expect(allText.toLowerCase()).toContain("cortisol");
  });

  it("low dopamine triggers dopamine-too-low recommendation", () => {
    const result = calculateEPS(undefined, makeBrandVector(50, 45, 5));
    const allText = result.recommendations.map((r) => r.en).join(" ");
    expect(allText.toLowerCase()).toContain("dopamine");
  });

  it("low oxytocin triggers trust recommendation", () => {
    const result = calculateEPS(undefined, makeBrandVector(60, 10, 30));
    const allText = result.recommendations.map((r) => r.en).join(" ");
    expect(allText.toLowerCase()).toContain("trust");
  });
});

// ═══════════════════════════════════════════════
// calculateEPS — DISC alignment
// ═══════════════════════════════════════════════

describe("calculateEPS — DISC alignment scoring", () => {
  it("D profile: high cortisol+dopamine yields high alignment", () => {
    const result = calculateEPS(undefined, makeBrandVector(60, 10, 30), makeDISCProfile("D"));
    // D: cortisol*0.4 + dopamine*0.4 + oxytocin*0.2 = 60*0.4 + 30*0.4 + 10*0.2 = 24+12+2 = 38
    expect(result.discAlignment).toBe(38);
  });

  it("I profile: high dopamine+oxytocin yields alignment", () => {
    const result = calculateEPS(undefined, makeBrandVector(10, 50, 40), makeDISCProfile("I"));
    // I: dopamine*0.5 + oxytocin*0.4 + cortisol*0.1 = 40*0.5 + 50*0.4 + 10*0.1 = 20+20+1 = 41
    expect(result.discAlignment).toBe(41);
  });

  it("S profile: high oxytocin yields highest alignment", () => {
    const result = calculateEPS(undefined, makeBrandVector(10, 80, 10), makeDISCProfile("S"));
    // S: oxytocin*0.6 + dopamine*0.25 + cortisol*0.15 = 80*0.6 + 10*0.25 + 10*0.15 = 48+2.5+1.5 = 52
    expect(result.discAlignment).toBe(52);
  });

  it("C profile: uses dopamine+oxytocin balanced", () => {
    const result = calculateEPS(undefined, makeBrandVector(20, 40, 40), makeDISCProfile("C"));
    // C: dopamine*0.45 + oxytocin*0.35 + cortisol*0.2 = 40*0.45 + 40*0.35 + 20*0.2 = 18+14+4 = 36
    expect(result.discAlignment).toBe(36);
  });

  it("unknown DISC primary returns 50", () => {
    const result = calculateEPS(undefined, undefined, { primary: "X" } as unknown as DISCProfile);
    expect(result.discAlignment).toBe(50);
  });

  it("no DISC profile returns alignment of 50", () => {
    const result = calculateEPS();
    expect(result.discAlignment).toBe(50);
  });
});

// ═══════════════════════════════════════════════
// calculateEPS — Stylome
// ═══════════════════════════════════════════════

describe("calculateEPS — stylome authenticity", () => {
  it("high burstiness+perplexity => high stylome score", () => {
    const result = calculateEPS(undefined, undefined, undefined, makeStylome(90, 90));
    expect(result.components.stylomeAuthenticity).toBe(90);
  });

  it("low burstiness+perplexity => low stylome score", () => {
    const result = calculateEPS(undefined, undefined, undefined, makeStylome(20, 20));
    expect(result.components.stylomeAuthenticity).toBe(20);
  });

  it("no stylome falls back to 50", () => {
    const result = calculateEPS();
    expect(result.components.stylomeAuthenticity).toBe(50);
  });
});

// ═══════════════════════════════════════════════
// calculateEPS — Trend
// ═══════════════════════════════════════════════

describe("calculateEPS — trend tracking", () => {
  it("no previousScore means no trend field", () => {
    const result = calculateEPS();
    expect(result.trend).toBeUndefined();
  });

  it("previousScore adds trend object with delta", () => {
    const result = calculateEPS(makeCopyQA(75), undefined, undefined, undefined, 60);
    expect(result.trend).toBeDefined();
    expect(result.trend!.previousScore).toBe(60);
    expect(result.trend!.delta).toBe(result.score - 60);
  });

  it("positive delta when score improves", () => {
    const result = calculateEPS(makeCopyQA(90), makeBrandVector(40, 30, 30, 90), undefined, makeStylome(80, 80), 30);
    expect(result.trend!.delta).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════
// calculateEPS — CopyQA risks surfaced
// ═══════════════════════════════════════════════

describe("calculateEPS — CopyQA risk recommendations", () => {
  it("high severity risks from copyQA appear in recommendations", () => {
    const copyQA = makeCopyQA(40);
    (copyQA as unknown as Record<string, unknown>).risks = [
      { severity: "high", fix: { he: "תקן", en: "Fix this now" } },
    ];
    const result = calculateEPS(copyQA);
    const allText = result.recommendations.map((r) => r.en).join(" ");
    expect(allText).toContain("Fix this now");
  });

  it("recommendations capped at 5 items", () => {
    const copyQA = makeCopyQA(30);
    (copyQA as unknown as Record<string, unknown>).risks = [
      { severity: "high", fix: { he: "תקן 1", en: "Fix 1" } },
      { severity: "high", fix: { he: "תקן 2", en: "Fix 2" } },
    ];
    const result = calculateEPS(copyQA, makeBrandVector(70, 5, 25));
    expect(result.recommendations.length).toBeLessThanOrEqual(5);
  });
});

// ═══════════════════════════════════════════════
// getEPSVerdict
// ═══════════════════════════════════════════════

describe("getEPSVerdict", () => {
  it("score >= 85 returns Excellent verdict", () => {
    const v = getEPSVerdict(85);
    expect(v.en).toContain("Excellent");
    expect(v.he.length).toBeGreaterThan(0);
  });

  it("score 70-84 returns Good verdict", () => {
    const v = getEPSVerdict(72);
    expect(v.en).toContain("Good");
  });

  it("score 55-69 returns Average verdict", () => {
    const v = getEPSVerdict(60);
    expect(v.en).toContain("Average");
  });

  it("score 40-54 returns Weak verdict", () => {
    const v = getEPSVerdict(45);
    expect(v.en).toContain("Weak");
  });

  it("score < 40 returns Critical verdict", () => {
    const v = getEPSVerdict(20);
    expect(v.en).toContain("Critical");
  });

  it("boundary 85 is Excellent not Good", () => {
    expect(getEPSVerdict(85).en).toContain("Excellent");
  });

  it("boundary 70 is Good not Average", () => {
    expect(getEPSVerdict(70).en).toContain("Good");
  });

  it("boundary 40 is Weak", () => {
    expect(getEPSVerdict(40).en).toContain("Weak");
  });

  it("score 0 returns Critical", () => {
    expect(getEPSVerdict(0).en).toContain("Critical");
  });

  it("score 100 returns Excellent", () => {
    expect(getEPSVerdict(100).en).toContain("Excellent");
  });

  it("always returns bilingual result", () => {
    for (const score of [0, 40, 55, 70, 85, 100]) {
      const v = getEPSVerdict(score);
      expect(v.he.length).toBeGreaterThan(0);
      expect(v.en.length).toBeGreaterThan(0);
    }
  });
});
