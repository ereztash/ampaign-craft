// Query router — two-stage routing for the knowledge-query edge function.
//
// Stage A (semantic router, <10ms): keyword + intent-prototype matching
// to classify the query into one of five intents: LOOKUP, AGGREGATE,
// REASON, GENERATE, META. Follows Aurelio semantic-router pattern; no
// LLM call on the hot path. If confidence is high (>=0.75), we skip
// Stage B.
//
// Stage B (Adaptive-RAG classifier, ~100ms via Haiku): a tiny classifier
// that decides complexity: no_retrieval | single_hop | multi_hop |
// global. Only invoked when Stage A confidence is low. Paper: Jeong et
// al., Adaptive-RAG, arXiv:2403.14403, NAACL 2024.
//
// This module is pure. The edge function wraps both stages and calls
// Claude when needed.

export type Intent = "LOOKUP" | "AGGREGATE" | "REASON" | "GENERATE" | "META";

export type Complexity = "no_retrieval" | "single_hop" | "multi_hop" | "global";

export interface RouteDecision {
  intent: Intent;
  complexity: Complexity;
  confidence: number;
  /** "keyword" when Stage A matched without LLM; "llm" when Stage B ran. */
  source: "keyword" | "llm";
  reasoning: string;
}

// ───────────────────────────────────────────────
// Stage A — keyword/prototype matching
// ───────────────────────────────────────────────

interface IntentPrototype {
  intent: Intent;
  /** Default complexity for this intent when no stronger signal. */
  defaultComplexity: Complexity;
  /** Words/phrases that, if present, signal this intent strongly. */
  strong: RegExp[];
  /** Softer signals — bump confidence but need another signal to commit. */
  weak: RegExp[];
}

// Hebrew+English keywords. Hebrew business terms map to the same intents.
const PROTOTYPES: IntentPrototype[] = [
  {
    intent: "META",
    defaultComplexity: "no_retrieval",
    strong: [
      /\b(what do you know about|what have you learned|show my knowledge|what facts)\b/i,
      /מה (אתה יודע|המערכת יודעת|למדת) עליי/,
      /הראה (לי )?(את ה)?(גרף|ידע|עובדות)/,
    ],
    weak: [
      /\b(my knowledge|my facts|my graph|my profile)\b/i,
      /(פרופיל|מאגר) (שלי|העסק)/,
    ],
  },
  {
    intent: "AGGREGATE",
    defaultComplexity: "global",
    strong: [
      /\b(average|median|benchmark|compare to others|typical|industry standard)\b/i,
      /ממוצע|חציון|benchmark|כמה (אחרים|עסקים)/,
      /\b(top\s+\d+|most common|best performing)\b/i,
    ],
    weak: [/\b(stats|statistics|aggregate)\b/i],
  },
  {
    intent: "REASON",
    defaultComplexity: "multi_hop",
    strong: [
      /\bwhy\b/i,
      /\bhow (should|could|would)\b/i,
      /\b(because|therefore|reason)\b/i,
      /למה|מדוע|איך (צריך|כדאי|אפשר)/,
      /\b(explain|analyze|diagnose)\b/i,
      /(נתח|הסבר|אבחן)/,
    ],
    weak: [
      /\b(relationship|connection|depends)\b/i,
      /קשר בין/,
    ],
  },
  {
    intent: "GENERATE",
    defaultComplexity: "single_hop",
    strong: [
      /\b(write|create|draft|generate|compose)\b/i,
      /\bgive me (a|an|some)\b/i,
      /כתוב לי|צור לי|תן לי|ייצר/,
      /\b(headline|hook|ad copy|caption|subject line)\b/i,
      /(כותרת|הוק|עותק)/,
    ],
    weak: [/\b(suggest|recommend)\b/i, /המלץ/],
  },
  {
    intent: "LOOKUP",
    defaultComplexity: "single_hop",
    strong: [
      /\bwhat is\b/i, /\bwho is\b/i, /\bwhere is\b/i,
      /\bwhen (did|was)\b/i,
      /מה זה|מי זה|איפה/,
      /\b(show me|list|find)\b/i,
      /(הצג|מצא)/,
    ],
    weak: [/\b(tell me)\b/i, /ספר לי/],
  },
];

export function routeByKeyword(query: string): RouteDecision {
  const scores: Map<Intent, number> = new Map();
  const hits: Map<Intent, string[]> = new Map();

  for (const proto of PROTOTYPES) {
    let s = 0;
    const matched: string[] = [];
    for (const re of proto.strong) {
      if (re.test(query)) {
        s += 2;
        matched.push(re.source.slice(0, 40));
      }
    }
    for (const re of proto.weak) {
      if (re.test(query)) {
        s += 1;
        matched.push(re.source.slice(0, 40));
      }
    }
    if (s > 0) {
      scores.set(proto.intent, s);
      hits.set(proto.intent, matched);
    }
  }

  if (scores.size === 0) {
    return {
      intent: "LOOKUP",
      complexity: "single_hop",
      confidence: 0.3,
      source: "keyword",
      reasoning: "no keyword match; defaulting to LOOKUP/single_hop",
    };
  }

  let bestIntent: Intent = "LOOKUP";
  let bestScore = 0;
  for (const [intent, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  const proto = PROTOTYPES.find((p) => p.intent === bestIntent)!;
  const totalSignals = [...scores.values()].reduce((a, b) => a + b, 0);
  const dominance = totalSignals > 0 ? bestScore / totalSignals : 0;
  // Confidence blends signal strength and dominance over other intents.
  const confidence = Math.min(0.95, 0.4 + 0.2 * bestScore + 0.3 * dominance);

  return {
    intent: bestIntent,
    complexity: proto.defaultComplexity,
    confidence: Number(confidence.toFixed(2)),
    source: "keyword",
    reasoning: `matched [${(hits.get(bestIntent) ?? []).join(", ")}]`,
  };
}

// ───────────────────────────────────────────────
// Stage B — LLM classifier prompt builder
// ───────────────────────────────────────────────

/**
 * System prompt for the Stage-B classifier. Haiku, max_tokens=64.
 * Designed to be cacheable (static text), so every user query after
 * the first one hits the prompt cache and costs near-zero.
 */
export const CLASSIFIER_SYSTEM_PROMPT = [
  "You are a query classifier for a marketing-funnel knowledge system.",
  "Classify the user's query into exactly one intent + complexity.",
  "",
  "Intents (pick one):",
  "  LOOKUP    — 'what is X?', 'show me Y', direct facts about the user.",
  "  AGGREGATE — 'average CTR for SaaS?', 'top performing hooks?' — stats.",
  "  REASON    — 'why is my conversion low?', 'what's blocking me?' — diagnosis.",
  "  GENERATE  — 'write a headline', 'draft an email' — content creation.",
  "  META      — 'what do you know about me?' — self-reflection on graph.",
  "",
  "Complexity (pick one):",
  "  no_retrieval — can be answered from general knowledge alone.",
  "  single_hop   — needs 1-2 facts about the user.",
  "  multi_hop    — needs chains of facts (A -> B -> C).",
  "  global       — needs aggregation across many facts / cross-tenant stats.",
  "",
  "Output ONLY a tool_use call to classify_query.",
].join("\n");

export const CLASSIFY_QUERY_TOOL_SCHEMA = {
  name: "classify_query",
  description: "Record the intent + complexity for the user's query.",
  input_schema: {
    type: "object",
    required: ["intent", "complexity", "confidence"],
    properties: {
      intent: { type: "string", enum: ["LOOKUP", "AGGREGATE", "REASON", "GENERATE", "META"] },
      complexity: { type: "string", enum: ["no_retrieval", "single_hop", "multi_hop", "global"] },
      confidence: { type: "number", minimum: 0, maximum: 1 },
    },
  },
} as const;

/**
 * The confidence threshold below which Stage A escalates to Stage B.
 * Adaptive-RAG paper uses a trained classifier for this; we use a
 * simple threshold because our intent space is only 5-wide.
 */
export const STAGE_A_CONFIDENCE_FLOOR = 0.75;

export function needsLLMClassification(keywordDecision: RouteDecision): boolean {
  return keywordDecision.confidence < STAGE_A_CONFIDENCE_FLOOR;
}
