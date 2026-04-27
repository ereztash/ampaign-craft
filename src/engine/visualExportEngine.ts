// ═══════════════════════════════════════════════
// Visual / Social Export Engine
// Structures raw copy into platform-specific social posts
// (Facebook, Instagram, LinkedIn, Twitter) with per-platform
// rules for length, hashtags, emoji density, and formatting.
// ═══════════════════════════════════════════════

import type { ExportResult } from "./exportEngine";
import {
  writeContext,
  conceptKey,
  type BlackboardWriteContext,
} from "./blackboard/contract";

export const ENGINE_MANIFEST = {
  name: "visualExportEngine",
  reads: ["USER-copy-*"],
  writes: ["USER-visualExport-*"],
  stage: "deploy",
  isLive: true,
  parameters: ["Visual export"],
} as const;

export type SocialPlatform = "facebook" | "instagram" | "linkedin" | "twitter";

export interface SocialPostTemplate {
  platform: SocialPlatform;
  maxLength: number;
  hashtagLimit: number;
  emojiDensity: "none" | "low" | "medium" | "high";
  formatGuidelines: { he: string; en: string };
}

export interface SocialPostData {
  platform: SocialPlatform;
  text: string;
  hashtags: string[];
  charactersUsed: number;
  truncated: boolean;
  notes: { he: string; en: string }[];
}

// ───────────────────────────────────────────────
// Platform configs
// ───────────────────────────────────────────────

const PLATFORM_CONFIGS: Record<SocialPlatform, SocialPostTemplate> = {
  facebook: {
    platform: "facebook",
    maxLength: 63206,
    hashtagLimit: 5,
    emojiDensity: "low",
    formatGuidelines: {
      he: "פייסבוק מעדיף טקסט ארוך (400-600 תווים) עם סיפור אישי. אימוג'י מינימלי. 1-3 האשטגים.",
      en: "Facebook rewards longer posts (400-600 chars) with personal stories. Minimal emoji. 1-3 hashtags.",
    },
  },
  instagram: {
    platform: "instagram",
    maxLength: 2200,
    hashtagLimit: 30,
    emojiDensity: "high",
    formatGuidelines: {
      he: "אינסטגרם: פתיחה חזקה ב-125 תווים הראשונים. 8-15 האשטגים. אימוג'י נדיבים. שבור לשורות קצרות.",
      en: "Instagram: strong opener in first 125 chars. 8-15 hashtags. Generous emoji. Break into short lines.",
    },
  },
  linkedin: {
    platform: "linkedin",
    maxLength: 3000,
    hashtagLimit: 3,
    emojiDensity: "low",
    formatGuidelines: {
      he: "לינקדאין: טון מקצועי, 1200-1500 תווים, hook בשורה הראשונה, 3 האשטגים ממוקדים. אימוג'י נקודתי בלבד.",
      en: "LinkedIn: professional tone, 1200-1500 chars, hook in first line, 3 focused hashtags. Sparing emoji only.",
    },
  },
  twitter: {
    platform: "twitter",
    maxLength: 280,
    hashtagLimit: 2,
    emojiDensity: "medium",
    formatGuidelines: {
      he: "טוויטר/X: 280 תווים, שורה תחתונה חדה, 1-2 האשטגים. שרשור לתוכן ארוך.",
      en: "Twitter/X: 280 chars, sharp punchline, 1-2 hashtags. Use threads for longer content.",
    },
  },
};

// ───────────────────────────────────────────────
// Hashtag extraction & emoji adjustment
// ───────────────────────────────────────────────

function extractHashtags(text: string): string[] {
  return [...new Set((text.match(/#[\u0590-\u05FFa-zA-Z0-9_]+/g) || []))];
}

function stripHashtags(text: string): string {
  return text.replace(/#[\u0590-\u05FFa-zA-Z0-9_]+/g, "").replace(/\s+/g, " ").trim();
}

function countEmojis(text: string): number {
  // Rough emoji detection
  return (text.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;
}

function applyEmojiDensity(text: string, density: SocialPlatform): string {
  // Platform-specific nudging — returns text as-is; downstream UI can flag density
  return text;
}

// ───────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────

export function structureSocialPost(
  rawCopy: string,
  platform: SocialPlatform,
  lang: "he" | "en" = "he",
): SocialPostData {
  const config = PLATFORM_CONFIGS[platform];
  const notes: { he: string; en: string }[] = [];

  // Extract and trim
  let hashtags = extractHashtags(rawCopy);
  let body = stripHashtags(rawCopy);

  // Hashtag limit enforcement
  if (hashtags.length > config.hashtagLimit) {
    hashtags = hashtags.slice(0, config.hashtagLimit);
    notes.push({
      he: `הוגבל ל-${config.hashtagLimit} האשטגים`,
      en: `Limited to ${config.hashtagLimit} hashtags`,
    });
  }

  // Emoji density feedback
  const emojiCount = countEmojis(rawCopy);
  if (config.emojiDensity === "low" && emojiCount > 2) {
    notes.push({
      he: "יותר מדי אימוג'י לטון המקצועי של הפלטפורמה",
      en: "Too many emoji for this platform's professional tone",
    });
  }
  if (config.emojiDensity === "high" && emojiCount < 2) {
    notes.push({
      he: "הוסף יותר אימוג'י — הפלטפורמה חזותית",
      en: "Add more emoji — the platform is visual",
    });
  }

  // Length enforcement (reserve 20 chars for hashtag tail)
  const hashtagTail = hashtags.length > 0 ? `\n\n${hashtags.join(" ")}` : "";
  const maxBody = Math.max(0, config.maxLength - hashtagTail.length);
  let truncated = false;
  if (body.length > maxBody) {
    body = body.slice(0, maxBody - 3).trim() + "...";
    truncated = true;
    notes.push({
      he: `הטקסט קוצר ל-${maxBody} תווים`,
      en: `Text truncated to ${maxBody} chars`,
    });
  }

  const finalText = body + hashtagTail;

  return {
    platform,
    text: finalText,
    hashtags,
    charactersUsed: finalText.length,
    truncated,
    notes,
  };
}

export function structureForAllPlatforms(
  rawCopy: string,
  lang: "he" | "en" = "he",
  blackboardCtx?: BlackboardWriteContext,
): SocialPostData[] {
  const platforms: SocialPlatform[] = ["facebook", "instagram", "linkedin", "twitter"];
  const posts = platforms.map((p) => structureSocialPost(rawCopy, p, lang));

  if (blackboardCtx) {
    void writeContext({
      userId: blackboardCtx.userId,
      planId: blackboardCtx.planId,
      key: conceptKey("USER", "visualExport", blackboardCtx.planId ?? blackboardCtx.userId),
      stage: "deploy",
      payload: {
        postCount: posts.length,
        platforms: platforms,
      },
      writtenBy: ENGINE_MANIFEST.name,
    }).catch(() => {});
  }

  return posts;
}

function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    const s = String(v ?? "");
    return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.map(escape).join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

export function exportSocialPosts(posts: SocialPostData[]): ExportResult {
  const rows: Record<string, unknown>[] = posts.map((p) => ({
    Platform: p.platform,
    Text: p.text,
    Hashtags: p.hashtags.join(" "),
    "Characters Used": p.charactersUsed,
    Truncated: p.truncated ? "Yes" : "No",
    Notes: p.notes.map((n) => n.en).join("; "),
  }));

  const csv = rowsToCsv(rows);
  const encoded = new TextEncoder().encode(csv);
  const buffer = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(buffer).set(encoded);

  return {
    data: buffer,
    filename: `social-posts-${new Date().toISOString().split("T")[0]}.csv`,
    mimeType: "text/csv",
  };
}

export function getAllPlatformConfigs(): SocialPostTemplate[] {
  return Object.values(PLATFORM_CONFIGS);
}

export function getPlatformConfig(platform: SocialPlatform): SocialPostTemplate {
  return PLATFORM_CONFIGS[platform];
}
