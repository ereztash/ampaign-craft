// ═══════════════════════════════════════════════
// Predictive Content Score Engine
// Anyword-style pre-publication score — combines 5 local
// signals (no API calls) to predict engagement + conversion.
// ═══════════════════════════════════════════════

import { analyzeCopy, type CopyQAResult } from "./copyQAEngine";
import { scoreHebrewCopy } from "@/lib/hebrewCopyOptimizer";
import { scoreEnglishCopy } from "@/lib/englishCopyOptimizer";
import type { DISCProfile } from "./discProfileEngine";
import type { BrandVectorResult } from "./brandVectorEngine";
import { analyzeAIDetection } from "./perplexityBurstiness";
import {
  writeContext,
  conceptKey,
  type BlackboardWriteContext,
} from "./blackboard/contract";

export const ENGINE_MANIFEST = {
  name: "predictiveContentScoreEngine",
  reads: ["USER-copy-*", "USER-disc-*", "USER-brandVector-*"],
  writes: ["USER-contentScore-*"],
  stage: "design",
  isLive: true,
  parameters: ["Predictive content scoring"],
} as const;

export type ContentLanguage = "he" | "en";

export type ChannelName = "whatsapp" | "facebook" | "instagram" | "linkedin" | "email" | "twitter";

export interface ChannelFitScore {
  channel: ChannelName;
  fit: number; // 0-100
  reason: { he: string; en: string };
}

export interface PredictiveContentScore {
  overallScore: number; // 0-100
  engagementPrediction: number; // 0-100
  conversionPrediction: number; // 0-100
  channelFit: ChannelFitScore[];
  improvementSuggestions: { he: string; en: string }[];
  breakdown: {
    copyQuality: number;
    culturalFit: number;
    discAlignment: number;
    brandAlignment: number;
    humanAuthenticity: number;
  };
}

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function scoreCulturalFit(text: string, language: ContentLanguage): number {
  const result = language === "he" ? scoreHebrewCopy(text) : scoreEnglishCopy(text);
  return Math.max(0, Math.min(100, result.total));
}

function scoreDISCAlignment(text: string, disc?: DISCProfile): number {
  if (!disc) return 60;
  const lower = text.toLowerCase();

  // Each primary profile favors different linguistic cues.
  switch (disc.primary) {
    case "D": {
      // Direct, results-oriented
      const hasResults = /\bresults?\b|\bROI\b|תוצאות|רווח|profit|win|save|cut/i.test(text);
      const hasDirect = text.split(/[.!?]/).every((s) => s.trim().split(/\s+/).length <= 25);
      return (hasResults ? 55 : 30) + (hasDirect ? 35 : 15);
    }
    case "I": {
      // Emotional, story-driven
      const hasStory = /story|imagine|feel|love|דמיין|הרגש|סיפור/i.test(lower);
      const hasEmoji = /[\u{1F300}-\u{1FAFF}]/u.test(text);
      return (hasStory ? 50 : 25) + (hasEmoji ? 30 : 15);
    }
    case "S": {
      // Trust, community
      const hasTrust = /trust|community|team|family|אמון|קהילה|משפחה|צוות/i.test(lower);
      const isCalm = !/!!!|HURRY|עכשיו!/i.test(text);
      return (hasTrust ? 55 : 30) + (isCalm ? 35 : 15);
    }
    case "C": {
      // Data, precision
      const hasData = /\d+%|\d+x|study|research|data|\d+|נתונים|מחקר/i.test(text);
      const hasCredibility = /proven|tested|certified|מוכח|מאושר/i.test(lower);
      return (hasData ? 55 : 25) + (hasCredibility ? 35 : 15);
    }
    default:
      return 60;
  }
}

function scoreBrandAlignment(text: string, brand?: BrandVectorResult): number {
  if (!brand) return 60;
  const lower = text.toLowerCase();

  // Check if text leans into the brand's primary vector
  switch (brand.primaryVector) {
    case "cortisol": {
      const urgencyHit = /limited|only|closing|deadline|hurry|נגמר|מוגבל|נשאר|עד/i.test(text);
      return urgencyHit ? 85 : 45;
    }
    case "oxytocin": {
      const trustHit = /trusted|community|family|reviews|אמון|קהילה|משפחה|ביקורות/i.test(lower);
      return trustHit ? 85 : 45;
    }
    case "dopamine": {
      const rewardHit = /new|discover|unlock|reward|bonus|חדש|גילוי|בונוס|תגמול/i.test(lower);
      return rewardHit ? 85 : 45;
    }
  }
}

function scoreHumanAuthenticity(text: string): number {
  return analyzeAIDetection(text).humanScore;
}

function scoreCopyQualityFromQA(qa: CopyQAResult): number {
  return Math.max(0, Math.min(100, qa.score));
}

// ───────────────────────────────────────────────
// Channel fit heuristics
// ───────────────────────────────────────────────

function assessChannelFit(
  text: string,
  language: ContentLanguage,
  disc?: DISCProfile,
): ChannelFitScore[] {
  const wordCount = text.trim().split(/\s+/).length;
  const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 0);
  const avgSentenceLen = sentences.length > 0 ? wordCount / sentences.length : 0;
  const hasCTA = /\b(click|get|start|join|try|לחץ|התחל|קבל)\b/i.test(text);
  const hasEmoji = /[\u{1F300}-\u{1FAFF}]/u.test(text);

  const results: ChannelFitScore[] = [];

  // WhatsApp — short, direct, personal
  results.push({
    channel: "whatsapp",
    fit: Math.round(
      (wordCount <= 60 ? 55 : wordCount <= 120 ? 35 : 15) +
      (avgSentenceLen <= 12 ? 30 : 15) +
      (hasCTA ? 15 : 5),
    ),
    reason: {
      he: "WhatsApp: מעדיף טקסט קצר, ישיר, ועם CTA ברור",
      en: "WhatsApp: favors short, direct text with clear CTA",
    },
  });

  // Facebook — medium length, storytelling
  results.push({
    channel: "facebook",
    fit: Math.round(
      (wordCount >= 40 && wordCount <= 200 ? 50 : 25) +
      (hasCTA ? 20 : 10) +
      (hasEmoji ? 20 : 10) +
      10,
    ),
    reason: {
      he: "Facebook: תוכן אישי באורך בינוני עובד הכי טוב",
      en: "Facebook: medium-length personal content works best",
    },
  });

  // Instagram — visual hook, emoji rich
  results.push({
    channel: "instagram",
    fit: Math.round(
      (wordCount <= 150 ? 40 : 20) +
      (hasEmoji ? 40 : 10) +
      (hasCTA ? 20 : 5),
    ),
    reason: {
      he: "Instagram: hook חזותי עם אימוג'י ושורות קצרות",
      en: "Instagram: visual hook with emoji and short lines",
    },
  });

  // LinkedIn — professional, longer form, credibility
  const hasProfessional = /\b(ROI|strategy|insights|research|data|מחקר|אסטרטגיה|תוצאות)\b/i.test(text);
  results.push({
    channel: "linkedin",
    fit: Math.round(
      (wordCount >= 100 && wordCount <= 400 ? 40 : 20) +
      (hasProfessional ? 35 : 15) +
      (disc?.primary === "C" ? 20 : 10) +
      10,
    ),
    reason: {
      he: "LinkedIn: טון מקצועי + נתונים + DISC-C",
      en: "LinkedIn: professional tone + data + DISC-C",
    },
  });

  // Email — mid-length with CTA
  results.push({
    channel: "email",
    fit: Math.round(
      (wordCount >= 50 && wordCount <= 250 ? 45 : 25) +
      (hasCTA ? 30 : 10) +
      20,
    ),
    reason: {
      he: "Email: אורך מתון + CTA ברור",
      en: "Email: moderate length + clear CTA",
    },
  });

  // Twitter — very short, punchy
  results.push({
    channel: "twitter",
    fit: Math.round(
      (wordCount <= 40 ? 55 : 20) +
      (avgSentenceLen <= 10 ? 30 : 10) +
      15,
    ),
    reason: {
      he: "Twitter/X: קצר, חד, פאנצ'",
      en: "Twitter/X: short, sharp, punchy",
    },
  });

  // Clamp all to 0-100
  return results.map((r) => ({ ...r, fit: Math.max(0, Math.min(100, r.fit)) }));
}

// ───────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────

export function predictContentScore(
  text: string,
  language: ContentLanguage = "he",
  discProfile?: DISCProfile,
  brandVector?: BrandVectorResult,
  targetChannels?: ChannelName[],
  blackboardCtx?: BlackboardWriteContext,
): PredictiveContentScore {
  // Gather component signals
  const reader = discProfile
    ? discProfile.primary === "I"
      ? "system1"
      : discProfile.primary === "C" || discProfile.primary === "D"
        ? "system2"
        : "balanced"
    : "balanced";

  const copyQA = analyzeCopy(text, reader as "system1" | "system2" | "balanced");
  const copyQuality = scoreCopyQualityFromQA(copyQA);
  const culturalFit = scoreCulturalFit(text, language);
  const discAlignment = scoreDISCAlignment(text, discProfile);
  const brandAlignment = scoreBrandAlignment(text, brandVector);
  const humanAuthenticity = scoreHumanAuthenticity(text);

  // Weighted composite (mirrors plan)
  const overallScore = Math.round(
    copyQuality * 0.25 +
    culturalFit * 0.20 +
    discAlignment * 0.20 +
    brandAlignment * 0.15 +
    humanAuthenticity * 0.20,
  );

  // Engagement vs conversion distinction — engagement leans cultural+authenticity,
  // conversion leans copy quality + DISC match
  const engagementPrediction = Math.round(
    culturalFit * 0.35 + humanAuthenticity * 0.35 + copyQuality * 0.2 + discAlignment * 0.1,
  );
  const conversionPrediction = Math.round(
    copyQuality * 0.35 + discAlignment * 0.3 + brandAlignment * 0.25 + culturalFit * 0.1,
  );

  // Channel fit
  let channelFit = assessChannelFit(text, language, discProfile);
  if (targetChannels && targetChannels.length > 0) {
    channelFit = channelFit.filter((c) => targetChannels.includes(c.channel));
  }

  // Improvement suggestions
  const suggestions: { he: string; en: string }[] = [];
  if (copyQuality < 60) {
    suggestions.push({
      he: "שפר את איכות הקופי — בדוק CTA, הוכחה חברתית, איזון קורטיזול",
      en: "Improve copy quality — check CTA, social proof, cortisol balance",
    });
  }
  if (culturalFit < 55) {
    suggestions.push({
      he: language === "he"
        ? "התאם יותר לתרבות הישראלית — קצר, אותנטי, אותות אמון"
        : "Better cultural fit — specific numbers, credibility, benefit framing",
      en: language === "he"
        ? "Better Israeli cultural fit — short, authentic, trust signals"
        : "Better cultural fit — specific numbers, credibility, benefit framing",
    });
  }
  if (discAlignment < 55 && discProfile) {
    suggestions.push({
      he: `התאם לפרופיל ${discProfile.primary} — ${discProfile.communicationTone.he}`,
      en: `Tune for ${discProfile.primary} profile — ${discProfile.communicationTone.en}`,
    });
  }
  if (humanAuthenticity < 50) {
    suggestions.push({
      he: "הטקסט נראה מיוצר ע\"י AI — הוסף שונות במשפטים וביטויים ייחודיים",
      en: "Text appears AI-generated — add sentence variation and unique phrasing",
    });
  }
  if (brandAlignment < 55 && brandVector) {
    suggestions.push(
      brandVector.mismatch ?? {
        he: "חזק את ההתאמה למותג — שמור על הווקטור הנוירו-כימי העיקרי",
        en: "Strengthen brand alignment — lean into the primary neuro-chemical vector",
      },
    );
  }

  const result: PredictiveContentScore = {
    overallScore: Math.max(0, Math.min(100, overallScore)),
    engagementPrediction: Math.max(0, Math.min(100, engagementPrediction)),
    conversionPrediction: Math.max(0, Math.min(100, conversionPrediction)),
    channelFit,
    improvementSuggestions: suggestions,
    breakdown: {
      copyQuality,
      culturalFit,
      discAlignment,
      brandAlignment,
      humanAuthenticity,
    },
  };

  if (blackboardCtx) {
    void writeContext({
      userId: blackboardCtx.userId,
      planId: blackboardCtx.planId,
      key: conceptKey("USER", "contentScore", blackboardCtx.planId ?? blackboardCtx.userId),
      stage: "design",
      payload: {
        overallScore: result.overallScore,
        engagementPrediction: result.engagementPrediction,
        conversionPrediction: result.conversionPrediction,
      },
      writtenBy: ENGINE_MANIFEST.name,
    }).catch(() => {});
  }

  return result;
}

export function getPredictiveContentVerdict(score: number): { he: string; en: string } {
  if (score >= 85) return { he: "מוכן לפרסום — ביצועים מצוינים צפויים", en: "Ready to publish — excellent performance expected" };
  if (score >= 70) return { he: "טוב — שקול אופטימיזציה קלה", en: "Good — consider minor optimization" };
  if (score >= 55) return { he: "בינוני — דרושים שיפורים", en: "Average — improvements needed" };
  if (score >= 40) return { he: "חלש — שכתב משמעותית", en: "Weak — significant rewrite" };
  return { he: "לא מוכן — התחל מחדש", en: "Not ready — start over" };
}
