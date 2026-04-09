// ═══════════════════════════════════════════════
// Market Research Sub-Agent (Beta)
// Competitor analysis, pricing benchmarks, industry trends.
// ═══════════════════════════════════════════════

import { parseLLMJson } from "@/engine/blackboard/llmAgent";
import type { SubQuery, MarketFinding, SourceCitation } from "@/types/research";

const SYSTEM_PROMPT = `You are a market intelligence analyst specializing in the Israeli market.
Focus on: competitor analysis, pricing strategy, market trends, and industry benchmarks.
Use Israeli market context (NIS currency, local competitors, Israeli consumer behavior).
Always respond in valid JSON matching the schema in the user prompt.`;

export async function runMarketResearch(
  subQuery: SubQuery,
  invokeLLM: (system: string, prompt: string) => Promise<string>
): Promise<MarketFinding[]> {
  const prompt = `Research this market question for an Israeli business:

Question: ${subQuery.question}
Keywords: ${subQuery.keywords.join(", ")}

Respond with a JSON array of findings:
[
  {
    "insight_he": "תובנה בעברית",
    "insight_en": "insight in English",
    "evidence": "data points, statistics, or market observations",
    "sources": [{ "title": "source name", "type": "report", "reliability": "medium" }],
    "confidence": 0.0-1.0,
    "actionable": true/false,
    "recommendation_he": "המלצה בעברית (if actionable)",
    "recommendation_en": "recommendation in English (if actionable)",
    "marketAspect": "competitor" | "pricing" | "trend" | "benchmark"
  }
]

Return 1-3 most relevant findings.`;

  try {
    const raw = await invokeLLM(SYSTEM_PROMPT, prompt);
    const parsed = parseLLMJson<any[]>(raw);

    return (Array.isArray(parsed) ? parsed : [parsed]).map((f: any, i: number) => ({
      id: `mkt-${subQuery.id}-${i + 1}`,
      subQueryId: subQuery.id,
      domain: "market" as const,
      insight: { he: f.insight_he || "", en: f.insight_en || "" },
      evidence: f.evidence || "",
      sources: normalizeSources(f.sources),
      confidence: clamp(f.confidence ?? 0.5, 0, 1),
      actionable: f.actionable ?? false,
      recommendation: f.recommendation_he
        ? { he: f.recommendation_he, en: f.recommendation_en || "" }
        : undefined,
      marketAspect: f.marketAspect || "trend",
    }));
  } catch {
    return [];
  }
}

function normalizeSources(raw: any[]): SourceCitation[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => ({
    title: s.title || "Unknown source",
    url: s.url,
    type: s.type || "article",
    reliability: s.reliability || "medium",
  }));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
