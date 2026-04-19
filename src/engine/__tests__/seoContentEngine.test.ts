import { describe, it, expect, vi } from "vitest";
import {
  generateKeywords,
  generateContentBriefs,
  generateSocialCalendar,
  generateSEOContent,
  ENGINE_MANIFEST,
  type KeywordSuggestion,
  type ContentBrief,
  type SocialCalendarEntry,
} from "../seoContentEngine";
import type { FormData } from "@/types/funnel";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../blackboard/contract", () => ({
  writeContext: vi.fn(async () => {}),
  conceptKey: vi.fn((ns: string, type: string, id: string) => `${ns}-${type}-${id}`),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech",
    audienceType: "b2c",
    ageRange: [25, 45],
    interests: "marketing",
    productDescription: "SaaS platform for marketing automation with AI insights",
    averagePrice: 200,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook", "instagram", "google"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

// ═══════════════════════════════════════════════
// ENGINE_MANIFEST
// ═══════════════════════════════════════════════

describe("ENGINE_MANIFEST", () => {
  it("has the correct engine name", () => {
    expect(ENGINE_MANIFEST.name).toBe("seoContentEngine");
  });

  it("stage is design", () => {
    expect(ENGINE_MANIFEST.stage).toBe("design");
  });

  it("isLive is true", () => {
    expect(ENGINE_MANIFEST.isLive).toBe(true);
  });

  it("writes to USER-seoContent-* keys", () => {
    expect(ENGINE_MANIFEST.writes).toContain("USER-seoContent-*");
  });
});

// ═══════════════════════════════════════════════
// generateKeywords
// ═══════════════════════════════════════════════

describe("generateKeywords", () => {
  it("returns an array of keyword suggestions", () => {
    const keywords = generateKeywords(makeFormData());
    expect(Array.isArray(keywords)).toBe(true);
    expect(keywords.length).toBeGreaterThan(0);
  });

  it("each keyword has required fields", () => {
    const keywords = generateKeywords(makeFormData());
    for (const kw of keywords) {
      expect(kw.keyword.he).toBeTruthy();
      expect(kw.keyword.en).toBeTruthy();
      expect(["high", "medium", "low"]).toContain(kw.searchVolume);
      expect(["high", "medium", "low"]).toContain(kw.competition);
      expect(kw.relevance).toBeGreaterThanOrEqual(0);
      expect(kw.relevance).toBeLessThanOrEqual(100);
      expect(["informational", "transactional", "navigational"]).toContain(kw.intent);
    }
  });

  it("includes industry-level keyword when businessField is provided", () => {
    const keywords = generateKeywords(makeFormData({ businessField: "tech" }));
    const hasIndustryKw = keywords.some((k) => k.keyword.he === "tech" || k.keyword.en === "tech");
    expect(hasIndustryKw).toBe(true);
  });

  it("includes industry-in-Israel keyword", () => {
    const keywords = generateKeywords(makeFormData({ businessField: "tech" }));
    const hasIsrael = keywords.some((k) => k.keyword.en.includes("Israel"));
    expect(hasIsrael).toBe(true);
  });

  it("includes goal-specific keywords for sales goal", () => {
    const keywords = generateKeywords(makeFormData({ mainGoal: "sales" }));
    const hasSales = keywords.some((k) => k.keyword.he.includes("מכירות") || k.keyword.en.includes("sales"));
    expect(hasSales).toBe(true);
  });

  it("includes goal-specific keywords for awareness goal", () => {
    const keywords = generateKeywords(makeFormData({ mainGoal: "awareness" }));
    const hasAwareness = keywords.some((k) => k.keyword.he.includes("מיתוג") || k.keyword.en.includes("branding"));
    expect(hasAwareness).toBe(true);
  });

  it("includes goal-specific keywords for leads goal", () => {
    const keywords = generateKeywords(makeFormData({ mainGoal: "leads" }));
    const hasLeads = keywords.some((k) => k.keyword.he.includes("לידים") || k.keyword.en.includes("leads"));
    expect(hasLeads).toBe(true);
  });

  it("includes goal-specific keywords for loyalty goal", () => {
    const keywords = generateKeywords(makeFormData({ mainGoal: "loyalty" }));
    const hasLoyalty = keywords.some((k) => k.keyword.he.includes("נאמנות") || k.keyword.en.includes("loyalty"));
    expect(hasLoyalty).toBe(true);
  });

  it("includes B2B keyword for b2b audience", () => {
    const keywords = generateKeywords(makeFormData({ audienceType: "b2b" }));
    const hasB2B = keywords.some((k) => k.keyword.he.includes("עסקיים") || k.keyword.en.includes("business"));
    expect(hasB2B).toBe(true);
  });

  it("does NOT include B2B keyword for b2c audience", () => {
    const keywords = generateKeywords(makeFormData({ audienceType: "b2c" }));
    const hasB2B = keywords.some((k) => k.keyword.en === "business solutions");
    expect(hasB2B).toBe(false);
  });

  it("includes channel-specific keywords for each channel (up to 3)", () => {
    const keywords = generateKeywords(makeFormData({ existingChannels: ["facebook", "instagram", "google"] }));
    const channelKws = keywords.filter((k) => k.relevance === 60);
    expect(channelKws.length).toBeLessThanOrEqual(3);
    expect(channelKws.length).toBeGreaterThan(0);
  });

  it("produces results even when businessField is empty", () => {
    const keywords = generateKeywords(makeFormData({ businessField: "" }));
    // Should still have goal-based keywords
    expect(Array.isArray(keywords)).toBe(true);
  });

  it("produces results even when existingChannels is empty", () => {
    const keywords = generateKeywords(makeFormData({ existingChannels: [] }));
    expect(Array.isArray(keywords)).toBe(true);
  });
});

// ═══════════════════════════════════════════════
// generateContentBriefs
// ═══════════════════════════════════════════════

describe("generateContentBriefs", () => {
  const sampleKeywords: KeywordSuggestion[] = [
    { keyword: { he: "שיווק", en: "marketing" }, searchVolume: "high", competition: "high", relevance: 90, intent: "informational" },
    { keyword: { he: "לידים", en: "leads" }, searchVolume: "medium", competition: "medium", relevance: 75, intent: "transactional" },
    { keyword: { he: "דיגיטל", en: "digital" }, searchVolume: "low", competition: "low", relevance: 60, intent: "informational" },
  ];

  it("returns an array of content briefs", () => {
    const briefs = generateContentBriefs(makeFormData(), sampleKeywords);
    expect(Array.isArray(briefs)).toBe(true);
    expect(briefs.length).toBeGreaterThan(0);
  });

  it("each brief has all required fields", () => {
    const briefs = generateContentBriefs(makeFormData(), sampleKeywords);
    for (const brief of briefs) {
      expect(brief.title.he).toBeTruthy();
      expect(brief.title.en).toBeTruthy();
      expect(["blog", "landing-page", "social", "email-sequence", "video-script"]).toContain(brief.type);
      expect(Array.isArray(brief.targetKeywords)).toBe(true);
      expect(Array.isArray(brief.outline)).toBe(true);
      expect(brief.outline.length).toBeGreaterThan(0);
      expect(typeof brief.estimatedWordCount).toBe("number");
      expect(["high", "medium", "low"]).toContain(brief.priority);
      expect(brief.funnelStage).toBeTruthy();
    }
  });

  it("always includes a blog brief", () => {
    const briefs = generateContentBriefs(makeFormData(), sampleKeywords);
    const blog = briefs.find((b) => b.type === "blog");
    expect(blog).toBeDefined();
    expect(blog!.priority).toBe("high");
  });

  it("always includes a landing-page brief", () => {
    const briefs = generateContentBriefs(makeFormData(), sampleKeywords);
    const lp = briefs.find((b) => b.type === "landing-page");
    expect(lp).toBeDefined();
  });

  it("always includes a social brief", () => {
    const briefs = generateContentBriefs(makeFormData(), sampleKeywords);
    const social = briefs.find((b) => b.type === "social");
    expect(social).toBeDefined();
  });

  it("includes email-sequence for sales goal", () => {
    const briefs = generateContentBriefs(makeFormData({ mainGoal: "sales" }), sampleKeywords);
    const emailSeq = briefs.find((b) => b.type === "email-sequence");
    expect(emailSeq).toBeDefined();
  });

  it("includes email-sequence for leads goal", () => {
    const briefs = generateContentBriefs(makeFormData({ mainGoal: "leads" }), sampleKeywords);
    const emailSeq = briefs.find((b) => b.type === "email-sequence");
    expect(emailSeq).toBeDefined();
  });

  it("does NOT include email-sequence for awareness goal", () => {
    const briefs = generateContentBriefs(makeFormData({ mainGoal: "awareness" }), sampleKeywords);
    const emailSeq = briefs.find((b) => b.type === "email-sequence");
    expect(emailSeq).toBeUndefined();
  });

  it("blog outline has at least 5 sections", () => {
    const briefs = generateContentBriefs(makeFormData(), sampleKeywords);
    const blog = briefs.find((b) => b.type === "blog")!;
    expect(blog.outline.length).toBeGreaterThanOrEqual(5);
  });

  it("blog estimated word count is >= 1000", () => {
    const briefs = generateContentBriefs(makeFormData(), sampleKeywords);
    const blog = briefs.find((b) => b.type === "blog")!;
    expect(blog.estimatedWordCount).toBeGreaterThanOrEqual(1000);
  });

  it("works with empty keywords array", () => {
    const briefs = generateContentBriefs(makeFormData(), []);
    expect(Array.isArray(briefs)).toBe(true);
    expect(briefs.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════
// generateSocialCalendar
// ═══════════════════════════════════════════════

describe("generateSocialCalendar", () => {
  it("returns an array of calendar entries", () => {
    const entries = generateSocialCalendar(makeFormData());
    expect(Array.isArray(entries)).toBe(true);
  });

  it("generates entries for each channel (up to 3)", () => {
    const entries = generateSocialCalendar(makeFormData({ existingChannels: ["facebook", "instagram", "google"] }));
    // 3 channels × 5 schedule slots = 15
    expect(entries.length).toBe(15);
  });

  it("generates 0 entries when no channels", () => {
    const entries = generateSocialCalendar(makeFormData({ existingChannels: [] }));
    expect(entries.length).toBe(0);
  });

  it("each entry has required fields", () => {
    const entries = generateSocialCalendar(makeFormData());
    for (const entry of entries) {
      expect(typeof entry.dayOfWeek).toBe("number");
      expect(entry.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(entry.dayOfWeek).toBeLessThanOrEqual(6);
      expect(entry.time).toMatch(/^\d{2}:\d{2}$/);
      expect(entry.platform).toBeTruthy();
      expect(entry.contentType).toBeTruthy();
      expect(entry.topic.he).toBeTruthy();
      expect(entry.topic.en).toBeTruthy();
      expect(Array.isArray(entry.hashtags)).toBe(true);
    }
  });

  it("limits channels to first 3 even if more provided", () => {
    const entries = generateSocialCalendar(makeFormData({ existingChannels: ["facebook", "instagram", "google", "email", "whatsapp"] }));
    // Only 3 channels × 5 = 15
    expect(entries.length).toBe(15);
  });

  it("content types include value, story, engagement, conversion", () => {
    const entries = generateSocialCalendar(makeFormData({ existingChannels: ["facebook"] }));
    const types = new Set(entries.map((e) => e.contentType));
    expect(types.has("value")).toBe(true);
    expect(types.has("story")).toBe(true);
    expect(types.has("engagement")).toBe(true);
    expect(types.has("conversion")).toBe(true);
  });

  it("hashtags include industry tag", () => {
    const entries = generateSocialCalendar(makeFormData({ businessField: "tech" }));
    const firstEntry = entries[0];
    expect(firstEntry.hashtags.some((h) => h.includes("tech"))).toBe(true);
  });

  it("instagram entries have extra hashtags (#טיפים or #עסקים)", () => {
    const entries = generateSocialCalendar(makeFormData({ existingChannels: ["instagram"] }));
    const hasExtra = entries.some((e) => e.hashtags.includes("#טיפים") || e.hashtags.includes("#עסקים"));
    expect(hasExtra).toBe(true);
  });
});

// ═══════════════════════════════════════════════
// generateSEOContent
// ═══════════════════════════════════════════════

describe("generateSEOContent", () => {
  it("returns all top-level fields", () => {
    const result = generateSEOContent(makeFormData());
    expect(Array.isArray(result.keywords)).toBe(true);
    expect(Array.isArray(result.contentBriefs)).toBe(true);
    expect(Array.isArray(result.socialCalendar)).toBe(true);
    expect(result.metaDescription).toBeDefined();
    expect(result.generatedAt).toBeTruthy();
  });

  it("generatedAt is a valid ISO timestamp", () => {
    const result = generateSEOContent(makeFormData());
    expect(new Date(result.generatedAt).getTime()).toBeGreaterThan(0);
  });

  it("metaDescription has he and en strings", () => {
    const result = generateSEOContent(makeFormData());
    expect(result.metaDescription.he).toBeTruthy();
    expect(result.metaDescription.en).toBeTruthy();
  });

  it("metaDescription for sales goal includes 'הגדל מכירות'", () => {
    const result = generateSEOContent(makeFormData({ mainGoal: "sales" }));
    expect(result.metaDescription.he).toContain("הגדל מכירות");
    expect(result.metaDescription.en).toContain("Increase sales");
  });

  it("metaDescription for non-sales goal includes 'שפר חשיפה'", () => {
    const result = generateSEOContent(makeFormData({ mainGoal: "awareness" }));
    expect(result.metaDescription.he).toContain("שפר חשיפה");
  });

  it("keywords array is non-empty", () => {
    const result = generateSEOContent(makeFormData());
    expect(result.keywords.length).toBeGreaterThan(0);
  });

  it("contentBriefs array is non-empty", () => {
    const result = generateSEOContent(makeFormData());
    expect(result.contentBriefs.length).toBeGreaterThan(0);
  });
});
