// ═══════════════════════════════════════════════
// Prompt Optimizer Engine
// Analyzes negative feedback on training pairs to discover
// systemic quality issues and suggest prompt-level fixes.
// Pure heuristic — no AI calls (would be circular).
// ═══════════════════════════════════════════════

import {
  getTrainingPairs,
  getTrainingStats,
  type EngineCategory,
  type TrainingPair,
  type TrainingStats,
} from "./trainingDataEngine";
import {
  writeContext,
  conceptKey,
  type BlackboardWriteContext,
} from "./blackboard/contract";

export const ENGINE_MANIFEST = {
  name: "promptOptimizerEngine",
  reads: ["USER-training-*"],
  writes: ["USER-promptOptimization-*"],
  stage: "discover",
  isLive: true,
  parameters: ["Prompt optimization"],
} as const;

export type ComplaintCategory = "tone" | "accuracy" | "length" | "relevance" | "language";

export interface FeedbackPattern {
  category: ComplaintCategory;
  occurrences: number;
  exampleQuotes: string[];
  topTrigrams: { trigram: string; count: number }[];
}

export interface PromptOptimization {
  engineId: EngineCategory;
  issue: { he: string; en: string };
  suggestedPromptAddition: string;
  confidence: number; // 0-100
  affectedPairs: number;
}

export interface OptimizationReport {
  stats: TrainingStats;
  patternsByEngine: Record<string, FeedbackPattern[]>;
  optimizations: PromptOptimization[];
  generatedAt: string;
}

// ───────────────────────────────────────────────
// Complaint keyword lexicons
// ───────────────────────────────────────────────

const COMPLAINT_LEXICONS: Record<ComplaintCategory, string[]> = {
  tone: [
    "tone", "too aggressive", "too soft", "pushy", "cold", "robotic", "stiff",
    "אגרסיבי", "רך", "קר", "קופצני", "רובוטי", "מלאכותי",
  ],
  accuracy: [
    "wrong", "inaccurate", "incorrect", "false", "not true", "mistake",
    "לא נכון", "שגיאה", "לא מדויק", "טעות",
  ],
  length: [
    "too long", "too short", "verbose", "wordy", "brief", "not enough",
    "ארוך מדי", "קצר מדי", "פטפטן", "דל",
  ],
  relevance: [
    "irrelevant", "off-topic", "not useful", "useless", "generic", "boring",
    "לא רלוונטי", "לא קשור", "לא שימושי", "כללי מדי", "משעמם",
  ],
  language: [
    "grammar", "spelling", "typo", "awkward", "translation",
    "דקדוק", "איות", "מוזר", "תרגום",
  ],
};

// ───────────────────────────────────────────────
// Pattern extraction
// ───────────────────────────────────────────────

function classifyComplaint(text: string): ComplaintCategory[] {
  const lower = text.toLowerCase();
  const hits: ComplaintCategory[] = [];
  for (const [cat, keywords] of Object.entries(COMPLAINT_LEXICONS) as [ComplaintCategory, string[]][]) {
    if (keywords.some((kw) => lower.includes(kw))) hits.push(cat);
  }
  if (hits.length === 0) hits.push("relevance");
  return hits;
}

function extractTrigrams(texts: string[], top = 5): { trigram: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const text of texts) {
    const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    for (let i = 0; i < words.length - 2; i++) {
      const tri = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      counts.set(tri, (counts.get(tri) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([trigram, count]) => ({ trigram, count }));
}

// ───────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────

export async function analyzeEngineFeedback(
  engineId: EngineCategory,
): Promise<FeedbackPattern[]> {
  const pairs = await getTrainingPairs({ engineId, quality: "negative", limit: 500 });
  const byCategory = new Map<ComplaintCategory, TrainingPair[]>();

  for (const pair of pairs) {
    if (!pair.feedback_text) continue;
    const cats = classifyComplaint(pair.feedback_text);
    for (const cat of cats) {
      const bucket = byCategory.get(cat) ?? [];
      bucket.push(pair);
      byCategory.set(cat, bucket);
    }
  }

  const patterns: FeedbackPattern[] = [];
  for (const [category, bucket] of byCategory.entries()) {
    const texts = bucket.map((p) => p.feedback_text ?? "").filter(Boolean);
    patterns.push({
      category,
      occurrences: bucket.length,
      exampleQuotes: texts.slice(0, 3),
      topTrigrams: extractTrigrams(texts, 5),
    });
  }

  return patterns.sort((a, b) => b.occurrences - a.occurrences);
}

const OPTIMIZATION_TEMPLATES: Record<ComplaintCategory, { he: string; en: string; addition: string }> = {
  tone: {
    he: "תלונות חוזרות על טון הקופי",
    en: "Recurring complaints about copy tone",
    addition: "Maintain a balanced tone: confident but not aggressive, warm but not overly soft. Avoid ALL-CAPS and excessive exclamation marks.",
  },
  accuracy: {
    he: "תלונות על דיוק עובדתי",
    en: "Complaints about factual accuracy",
    addition: "Only cite statistics and facts you are certain about. When unsure, use qualifying language like 'often' or 'typically' instead of specific numbers.",
  },
  length: {
    he: "תלונות על אורך התשובה",
    en: "Complaints about response length",
    addition: "Keep responses concise and proportional to the question. Avoid padding; every sentence should add value.",
  },
  relevance: {
    he: "תלונות על רלוונטיות",
    en: "Complaints about relevance",
    addition: "Tie every recommendation back to the user's specific industry, audience, and goal from the form data. Avoid generic advice.",
  },
  language: {
    he: "תלונות על שפה / דקדוק",
    en: "Complaints about language / grammar",
    addition: "Double-check Hebrew grammar and gender agreement. Prefer natural phrasing over literal translations.",
  },
};

export function generatePromptOptimizations(
  engineId: EngineCategory,
  patterns: FeedbackPattern[],
): PromptOptimization[] {
  return patterns
    .filter((p) => p.occurrences >= 3) // only significant patterns
    .map((p) => {
      const template = OPTIMIZATION_TEMPLATES[p.category];
      const confidence = Math.min(100, 40 + p.occurrences * 5);
      return {
        engineId,
        issue: { he: template.he, en: template.en },
        suggestedPromptAddition: template.addition,
        confidence,
        affectedPairs: p.occurrences,
      };
    });
}

export async function getOptimizationReport(
  blackboardCtx?: BlackboardWriteContext,
): Promise<OptimizationReport> {
  const stats = await getTrainingStats();
  const patternsByEngine: Record<string, FeedbackPattern[]> = {};
  const optimizations: PromptOptimization[] = [];

  for (const engineId of Object.keys(stats.byEngine) as EngineCategory[]) {
    const patterns = await analyzeEngineFeedback(engineId);
    if (patterns.length === 0) continue;
    patternsByEngine[engineId] = patterns;
    optimizations.push(...generatePromptOptimizations(engineId, patterns));
  }

  const report: OptimizationReport = {
    stats,
    patternsByEngine,
    optimizations: optimizations.sort((a, b) => b.confidence - a.confidence),
    generatedAt: new Date().toISOString(),
  };

  if (blackboardCtx) {
    void writeContext({
      userId: blackboardCtx.userId,
      planId: blackboardCtx.planId,
      key: conceptKey("USER", "promptOptimization", blackboardCtx.planId ?? blackboardCtx.userId),
      stage: "discover",
      payload: {
        optimizationCount: report.optimizations.length,
        totalPairs: report.stats.total,
      },
      writtenBy: ENGINE_MANIFEST.name,
    }).catch(() => {});
  }

  return report;
}
