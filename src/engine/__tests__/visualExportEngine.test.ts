import { describe, it, expect, vi } from "vitest";
import {
  structureSocialPost,
  structureForAllPlatforms,
  exportSocialPosts,
  getAllPlatformConfigs,
  getPlatformConfig,
  ENGINE_MANIFEST,
  type SocialPlatform,
  type SocialPostData,
} from "../visualExportEngine";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../blackboard/contract", () => ({
  writeContext: vi.fn(async () => {}),
  conceptKey: vi.fn((ns: string, type: string, id: string) => `${ns}-${type}-${id}`),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SHORT_TEXT = "Hello world! Great product.";
const LONG_TEXT = "A".repeat(400);
const TEXT_WITH_HASHTAGS = "Great content! #שיווק #marketing #tech #israel #digital #bonus #extra #overflow";
const EMOJI_RICH_TEXT = "🚀🎉🔥💥✨🎯💡🌟 Amazing product!";
const EMOJI_POOR_TEXT = "Plain business text without any visual elements";

// ═══════════════════════════════════════════════
// ENGINE_MANIFEST
// ═══════════════════════════════════════════════

describe("ENGINE_MANIFEST", () => {
  it("has correct engine name", () => {
    expect(ENGINE_MANIFEST.name).toBe("visualExportEngine");
  });

  it("stage is deploy", () => {
    expect(ENGINE_MANIFEST.stage).toBe("deploy");
  });

  it("isLive is true", () => {
    expect(ENGINE_MANIFEST.isLive).toBe(true);
  });

  it("reads from USER-copy-* keys", () => {
    expect(ENGINE_MANIFEST.reads).toContain("USER-copy-*");
  });

  it("writes to USER-visualExport-* keys", () => {
    expect(ENGINE_MANIFEST.writes).toContain("USER-visualExport-*");
  });
});

// ═══════════════════════════════════════════════
// getPlatformConfig / getAllPlatformConfigs
// ═══════════════════════════════════════════════

describe("getPlatformConfig", () => {
  const platforms: SocialPlatform[] = ["facebook", "instagram", "linkedin", "twitter"];

  it("returns a config for each platform", () => {
    for (const p of platforms) {
      const config = getPlatformConfig(p);
      expect(config.platform).toBe(p);
      expect(typeof config.maxLength).toBe("number");
      expect(config.maxLength).toBeGreaterThan(0);
      expect(typeof config.hashtagLimit).toBe("number");
      expect(["none", "low", "medium", "high"]).toContain(config.emojiDensity);
      expect(config.formatGuidelines.he).toBeTruthy();
      expect(config.formatGuidelines.en).toBeTruthy();
    }
  });

  it("facebook maxLength is 63206", () => {
    expect(getPlatformConfig("facebook").maxLength).toBe(63206);
  });

  it("instagram maxLength is 2200", () => {
    expect(getPlatformConfig("instagram").maxLength).toBe(2200);
  });

  it("linkedin maxLength is 3000", () => {
    expect(getPlatformConfig("linkedin").maxLength).toBe(3000);
  });

  it("twitter maxLength is 280", () => {
    expect(getPlatformConfig("twitter").maxLength).toBe(280);
  });

  it("twitter hashtagLimit is 2 (lowest)", () => {
    expect(getPlatformConfig("twitter").hashtagLimit).toBe(2);
  });

  it("instagram hashtagLimit is 30 (highest)", () => {
    expect(getPlatformConfig("instagram").hashtagLimit).toBe(30);
  });
});

describe("getAllPlatformConfigs", () => {
  it("returns 4 platform configs", () => {
    const configs = getAllPlatformConfigs();
    expect(configs.length).toBe(4);
  });

  it("covers all four platforms", () => {
    const configs = getAllPlatformConfigs();
    const platforms = new Set(configs.map((c) => c.platform));
    expect(platforms.has("facebook")).toBe(true);
    expect(platforms.has("instagram")).toBe(true);
    expect(platforms.has("linkedin")).toBe(true);
    expect(platforms.has("twitter")).toBe(true);
  });
});

// ═══════════════════════════════════════════════
// structureSocialPost — Basic structure
// ═══════════════════════════════════════════════

describe("structureSocialPost — structure", () => {
  it("returns all required fields", () => {
    const post = structureSocialPost(SHORT_TEXT, "facebook");
    expect(post.platform).toBe("facebook");
    expect(typeof post.text).toBe("string");
    expect(Array.isArray(post.hashtags)).toBe(true);
    expect(typeof post.charactersUsed).toBe("number");
    expect(typeof post.truncated).toBe("boolean");
    expect(Array.isArray(post.notes)).toBe(true);
  });

  it("platform field matches the requested platform", () => {
    const platforms: SocialPlatform[] = ["facebook", "instagram", "linkedin", "twitter"];
    for (const p of platforms) {
      const post = structureSocialPost(SHORT_TEXT, p);
      expect(post.platform).toBe(p);
    }
  });

  it("text is a non-empty string", () => {
    const post = structureSocialPost(SHORT_TEXT, "facebook");
    expect(post.text.length).toBeGreaterThan(0);
  });

  it("charactersUsed equals the length of the final text", () => {
    const post = structureSocialPost(SHORT_TEXT, "facebook");
    expect(post.charactersUsed).toBe(post.text.length);
  });
});

// ═══════════════════════════════════════════════
// structureSocialPost — Hashtag handling
// ═══════════════════════════════════════════════

describe("structureSocialPost — hashtag handling", () => {
  it("extracts hashtags from raw copy", () => {
    const post = structureSocialPost("Content #marketing #שיווק", "facebook");
    expect(post.hashtags.length).toBeGreaterThan(0);
  });

  it("removes hashtags from main body text", () => {
    const post = structureSocialPost("Content #marketing", "facebook");
    // The body should not contain #marketing inline (it's appended at end)
    const bodyPart = post.text.split("\n\n")[0];
    expect(bodyPart).not.toContain("#marketing");
  });

  it("appends hashtags at end of text separated by double newline", () => {
    const post = structureSocialPost("Content #marketing", "facebook");
    if (post.hashtags.length > 0) {
      expect(post.text).toContain("\n\n#");
    }
  });

  it("enforces twitter hashtag limit of 2", () => {
    const post = structureSocialPost(TEXT_WITH_HASHTAGS, "twitter");
    expect(post.hashtags.length).toBeLessThanOrEqual(2);
  });

  it("adds a note when hashtags are trimmed on twitter", () => {
    const post = structureSocialPost(TEXT_WITH_HASHTAGS, "twitter");
    if (post.hashtags.length === 2) {
      const hasNote = post.notes.some((n) => n.en.includes("hashtag") || n.en.includes("Limited"));
      expect(hasNote).toBe(true);
    }
  });

  it("respects instagram's high hashtag limit of 30", () => {
    const post = structureSocialPost(TEXT_WITH_HASHTAGS, "instagram");
    // We only have 8 hashtags in TEXT_WITH_HASHTAGS — all should be kept
    expect(post.hashtags.length).toBeLessThanOrEqual(30);
  });

  it("deduplicates hashtags", () => {
    const post = structureSocialPost("Content #marketing #marketing #שיווק", "facebook");
    const unique = new Set(post.hashtags);
    expect(unique.size).toBe(post.hashtags.length);
  });
});

// ═══════════════════════════════════════════════
// structureSocialPost — Length truncation
// ═══════════════════════════════════════════════

describe("structureSocialPost — length enforcement", () => {
  it("short text is not truncated on facebook", () => {
    const post = structureSocialPost(SHORT_TEXT, "facebook");
    expect(post.truncated).toBe(false);
  });

  it("very long text is truncated on twitter (>280 chars)", () => {
    const longText = "A".repeat(400); // no hashtags
    const post = structureSocialPost(longText, "twitter");
    expect(post.truncated).toBe(true);
    expect(post.text.length).toBeLessThanOrEqual(283); // 280 + "..."
  });

  it("truncated text ends with '...'", () => {
    const post = structureSocialPost("A".repeat(500), "twitter");
    expect(post.truncated).toBe(true);
    // The truncated body should end with "..."
    const body = post.text.split("\n\n")[0];
    expect(body.endsWith("...")).toBe(true);
  });

  it("adds a note when text is truncated", () => {
    const post = structureSocialPost("A".repeat(500), "twitter");
    if (post.truncated) {
      const hasNote = post.notes.some((n) => n.en.includes("truncated") || n.he.includes("קוצר"));
      expect(hasNote).toBe(true);
    }
  });

  it("text within limit is not truncated on instagram", () => {
    const post = structureSocialPost("A".repeat(100), "instagram");
    expect(post.truncated).toBe(false);
  });
});

// ═══════════════════════════════════════════════
// structureSocialPost — Emoji density notes
// ═══════════════════════════════════════════════

describe("structureSocialPost — emoji density feedback", () => {
  it("adds note for too many emojis on linkedin (low density platform)", () => {
    const post = structureSocialPost(EMOJI_RICH_TEXT, "linkedin");
    const hasNote = post.notes.some((n) => n.en.toLowerCase().includes("emoji"));
    expect(hasNote).toBe(true);
  });

  it("adds note for too few emojis on instagram (high density platform)", () => {
    const post = structureSocialPost(EMOJI_POOR_TEXT, "instagram");
    const hasNote = post.notes.some((n) => n.en.toLowerCase().includes("emoji"));
    expect(hasNote).toBe(true);
  });

  it("no emoji note on facebook for text with low emoji count", () => {
    const post = structureSocialPost("Great content with one emoji 🎯", "facebook");
    // facebook allows "low" emoji — <=2 emojis should be fine
    const hasTooManyNote = post.notes.some((n) => n.en.includes("Too many emoji"));
    expect(hasTooManyNote).toBe(false);
  });
});

// ═══════════════════════════════════════════════
// structureForAllPlatforms
// ═══════════════════════════════════════════════

describe("structureForAllPlatforms", () => {
  it("returns 4 posts (one per platform)", () => {
    const posts = structureForAllPlatforms(SHORT_TEXT);
    expect(posts.length).toBe(4);
  });

  it("covers all four platforms", () => {
    const posts = structureForAllPlatforms(SHORT_TEXT);
    const platforms = new Set(posts.map((p) => p.platform));
    expect(platforms.has("facebook")).toBe(true);
    expect(platforms.has("instagram")).toBe(true);
    expect(platforms.has("linkedin")).toBe(true);
    expect(platforms.has("twitter")).toBe(true);
  });

  it("each post has valid structure", () => {
    const posts = structureForAllPlatforms(SHORT_TEXT);
    for (const post of posts) {
      expect(post.text).toBeTruthy();
      expect(typeof post.truncated).toBe("boolean");
      expect(Array.isArray(post.hashtags)).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════
// exportSocialPosts
// ═══════════════════════════════════════════════

describe("exportSocialPosts", () => {
  const samplePosts: SocialPostData[] = [
    { platform: "facebook", text: "Hello", hashtags: ["#marketing"], charactersUsed: 5, truncated: false, notes: [] },
    { platform: "twitter", text: "Hi!", hashtags: [], charactersUsed: 3, truncated: false, notes: [{ he: "note", en: "note" }] },
  ];

  it("returns an ExportResult with data, filename, and mimeType", () => {
    const result = exportSocialPosts(samplePosts);
    expect(result.data).toBeDefined();
    expect(result.filename).toBeTruthy();
    expect(result.mimeType).toBeTruthy();
  });

  it("filename starts with 'social-posts-' and ends with '.csv'", () => {
    const result = exportSocialPosts(samplePosts);
    expect(result.filename).toMatch(/^social-posts-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it("mimeType is text/csv", () => {
    const result = exportSocialPosts(samplePosts);
    expect(result.mimeType).toBe("text/csv");
  });

  it("data is an ArrayBuffer", () => {
    const result = exportSocialPosts(samplePosts);
    expect(result.data instanceof ArrayBuffer).toBe(true);
  });

  it("handles empty posts array without throwing", () => {
    expect(() => exportSocialPosts([])).not.toThrow();
  });
});
