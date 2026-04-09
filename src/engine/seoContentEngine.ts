// ═══════════════════════════════════════════════
// SEO Content Engine — Brand Authority Moat
// Generates SEO-optimized content briefs, keyword
// suggestions, and social media calendars.
// ═══════════════════════════════════════════════

import type { FormData } from "@/types/funnel";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export interface KeywordSuggestion {
  keyword: { he: string; en: string };
  searchVolume: "high" | "medium" | "low";
  competition: "high" | "medium" | "low";
  relevance: number; // 0-100
  intent: "informational" | "transactional" | "navigational";
}

export interface ContentBrief {
  title: { he: string; en: string };
  type: "blog" | "landing-page" | "social" | "email-sequence" | "video-script";
  targetKeywords: string[];
  outline: { he: string; en: string }[];
  estimatedWordCount: number;
  priority: "high" | "medium" | "low";
  funnelStage: string; // which stage this content supports
}

export interface SocialCalendarEntry {
  dayOfWeek: number;   // 0=Sunday, 6=Saturday
  time: string;        // "HH:MM"
  platform: string;
  contentType: string;
  topic: { he: string; en: string };
  hashtags: string[];
}

export interface SEOContentResult {
  keywords: KeywordSuggestion[];
  contentBriefs: ContentBrief[];
  socialCalendar: SocialCalendarEntry[];
  metaDescription: { he: string; en: string };
  generatedAt: string;
}

// ═══════════════════════════════════════════════
// KEYWORD GENERATION (Heuristic)
// ═══════════════════════════════════════════════

/**
 * Generate keyword suggestions based on business context.
 * This is a heuristic-based version; the LLM-powered version
 * would use the content-generator Edge Function.
 */
export function generateKeywords(formData: FormData): KeywordSuggestion[] {
  const keywords: KeywordSuggestion[] = [];
  const industry = formData.businessField || "";
  const product = formData.productDescription || "";

  // Industry-level keywords
  if (industry) {
    keywords.push({
      keyword: { he: industry, en: industry },
      searchVolume: "high",
      competition: "high",
      relevance: 90,
      intent: "informational",
    });

    keywords.push({
      keyword: {
        he: `${industry} בישראל`,
        en: `${industry} in Israel`,
      },
      searchVolume: "medium",
      competition: "medium",
      relevance: 85,
      intent: "informational",
    });
  }

  // Goal-based keywords
  const goalKeywords: Record<string, { he: string; en: string }[]> = {
    sales: [
      { he: "איך להגדיל מכירות", en: "how to increase sales" },
      { he: "אסטרטגיית מכירות", en: "sales strategy" },
    ],
    awareness: [
      { he: "מיתוג עסקי", en: "business branding" },
      { he: "חשיפה דיגיטלית", en: "digital exposure" },
    ],
    leads: [
      { he: "לידים איכותיים", en: "quality leads" },
      { he: "דף נחיתה", en: "landing page" },
    ],
    loyalty: [
      { he: "שימור לקוחות", en: "customer retention" },
      { he: "תוכנית נאמנות", en: "loyalty program" },
    ],
  };

  const goalKws = goalKeywords[formData.mainGoal || "sales"] || goalKeywords.sales;
  for (const kw of goalKws) {
    keywords.push({
      keyword: kw,
      searchVolume: "medium",
      competition: "medium",
      relevance: 75,
      intent: "transactional",
    });
  }

  // Audience-specific
  if (formData.audienceType === "b2b") {
    keywords.push({
      keyword: { he: "פתרונות עסקיים", en: "business solutions" },
      searchVolume: "medium",
      competition: "high",
      relevance: 70,
      intent: "informational",
    });
  }

  // Channel-specific
  for (const channel of (formData.existingChannels || []).slice(0, 3)) {
    keywords.push({
      keyword: {
        he: `שיווק ב${channel}`,
        en: `${channel} marketing`,
      },
      searchVolume: "low",
      competition: "low",
      relevance: 60,
      intent: "informational",
    });
  }

  return keywords;
}

// ═══════════════════════════════════════════════
// CONTENT BRIEF GENERATION
// ═══════════════════════════════════════════════

export function generateContentBriefs(
  formData: FormData,
  keywords: KeywordSuggestion[]
): ContentBrief[] {
  const briefs: ContentBrief[] = [];
  const topKeywords = keywords
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5)
    .map((k) => k.keyword.he);

  // Blog post brief
  briefs.push({
    title: {
      he: `מדריך מקיף: ${formData.businessField || "שיווק"} בישראל`,
      en: `Complete Guide: ${formData.businessField || "Marketing"} in Israel`,
    },
    type: "blog",
    targetKeywords: topKeywords.slice(0, 3),
    outline: [
      { he: "מבוא — מצב השוק הנוכחי", en: "Introduction — Current market state" },
      { he: "אתגרים מרכזיים", en: "Key challenges" },
      { he: "אסטרטגיות מומלצות", en: "Recommended strategies" },
      { he: "דוגמאות מהשטח", en: "Real-world examples" },
      { he: "סיכום ושלבים הבאים", en: "Summary and next steps" },
    ],
    estimatedWordCount: 1500,
    priority: "high",
    funnelStage: "awareness",
  });

  // Landing page brief
  briefs.push({
    title: {
      he: `דף נחיתה — ${formData.productDescription?.slice(0, 30) || "המוצר שלך"}`,
      en: `Landing Page — ${formData.productDescription?.slice(0, 30) || "Your Product"}`,
    },
    type: "landing-page",
    targetKeywords: topKeywords.slice(0, 2),
    outline: [
      { he: "כותרת ראשית + תת-כותרת", en: "Main headline + subheadline" },
      { he: "הצעת ערך מרכזית", en: "Core value proposition" },
      { he: "הוכחות חברתיות", en: "Social proof" },
      { he: "CTA ראשי", en: "Primary CTA" },
      { he: "FAQ", en: "FAQ" },
    ],
    estimatedWordCount: 500,
    priority: "high",
    funnelStage: "conversion",
  });

  // Social media content
  briefs.push({
    title: {
      he: "סדרת תוכן לרשתות חברתיות",
      en: "Social Media Content Series",
    },
    type: "social",
    targetKeywords: topKeywords.slice(0, 2),
    outline: [
      { he: "פוסט ערך — טיפ מקצועי", en: "Value post — professional tip" },
      { he: "פוסט סיפור — מאחורי הקלעים", en: "Story post — behind the scenes" },
      { he: "פוסט המרה — הצעה ייחודית", en: "Conversion post — unique offer" },
    ],
    estimatedWordCount: 300,
    priority: "medium",
    funnelStage: "awareness",
  });

  // Email sequence
  if (formData.mainGoal === "sales" || formData.mainGoal === "leads") {
    briefs.push({
      title: {
        he: "סדרת אימיילים — ניהול לידים",
        en: "Email Sequence — Lead Nurturing",
      },
      type: "email-sequence",
      targetKeywords: topKeywords.slice(0, 2),
      outline: [
        { he: "אימייל 1 — ברוכים הבאים + ערך מיידי", en: "Email 1 — Welcome + immediate value" },
        { he: "אימייל 2 — בעיה + פתרון", en: "Email 2 — Problem + solution" },
        { he: "אימייל 3 — הוכחות חברתיות", en: "Email 3 — Social proof" },
        { he: "אימייל 4 — הצעה + דחיפות", en: "Email 4 — Offer + urgency" },
      ],
      estimatedWordCount: 800,
      priority: "high",
      funnelStage: "consideration",
    });
  }

  return briefs;
}

// ═══════════════════════════════════════════════
// SOCIAL CALENDAR GENERATION
// ═══════════════════════════════════════════════

export function generateSocialCalendar(
  formData: FormData
): SocialCalendarEntry[] {
  const entries: SocialCalendarEntry[] = [];
  const channels = formData.existingChannels || [];

  // Israeli posting times (Sunday-Thursday work week)
  // Best times: 8-9 AM, 12-1 PM, 8-9 PM
  const schedule = [
    { day: 0, time: "09:00", type: "value" },    // Sunday morning
    { day: 1, time: "12:00", type: "story" },     // Monday noon
    { day: 2, time: "20:00", type: "engagement" }, // Tuesday evening
    { day: 3, time: "09:00", type: "value" },     // Wednesday morning
    { day: 4, time: "12:00", type: "conversion" }, // Thursday noon
  ];

  const contentTypes: Record<string, { he: string; en: string }> = {
    value: { he: "תוכן ערך", en: "Value content" },
    story: { he: "סיפור / מאחורי הקלעים", en: "Story / Behind the scenes" },
    engagement: { he: "תוכן אינטראקטיבי", en: "Interactive content" },
    conversion: { he: "תוכן המרה", en: "Conversion content" },
  };

  for (const platform of channels.slice(0, 3)) {
    for (const slot of schedule) {
      entries.push({
        dayOfWeek: slot.day,
        time: slot.time,
        platform,
        contentType: slot.type,
        topic: contentTypes[slot.type] || contentTypes.value,
        hashtags: generateHashtags(formData.businessField || "", platform),
      });
    }
  }

  return entries;
}

function generateHashtags(industry: string, platform: string): string[] {
  const tags = [`#${industry.replace(/\s+/g, "")}`, "#שיווק_דיגיטלי", "#עסקים_בישראל"];
  if (platform === "instagram" || platform === "tiktok") {
    tags.push("#טיפים", "#עסקים");
  }
  return tags.slice(0, 5);
}

// ═══════════════════════════════════════════════
// FULL SEO CONTENT GENERATION
// ═══════════════════════════════════════════════

export function generateSEOContent(formData: FormData): SEOContentResult {
  const keywords = generateKeywords(formData);
  const contentBriefs = generateContentBriefs(formData, keywords);
  const socialCalendar = generateSocialCalendar(formData);

  const metaDescription = {
    he: `${formData.businessField || "עסק"} — ${formData.productDescription?.slice(0, 100) || "פתרונות מתקדמים"} | ${formData.mainGoal === "sales" ? "הגדל מכירות" : "שפר חשיפה"} בישראל`,
    en: `${formData.businessField || "Business"} — ${formData.productDescription?.slice(0, 100) || "Advanced solutions"} | ${formData.mainGoal === "sales" ? "Increase sales" : "Improve visibility"} in Israel`,
  };

  return {
    keywords,
    contentBriefs,
    socialCalendar,
    metaDescription,
    generatedAt: new Date().toISOString(),
  };
}
