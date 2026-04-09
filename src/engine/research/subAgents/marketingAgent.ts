// ═══════════════════════════════════════════════
// Marketing Research Sub-Agent (Gamma)
// Channel effectiveness, content trends, Israeli specifics.
// ═══════════════════════════════════════════════

import { parseLLMJson } from "@/engine/blackboard/llmAgent";
import type { SubQuery, MarketingFinding, SourceCitation } from "@/types/research";

const SYSTEM_PROMPT = `You are a digital marketing research specialist with deep expertise in the Israeli market.
Focus on: channel effectiveness (Facebook/Instagram/Google/TikTok in Israel), content strategies for Hebrew-speaking audiences, timing optimization, audience segmentation, and emerging marketing technologies (RCS, GenAI, WhatsApp Business).
Always respond in valid JSON matching the schema in the user prompt.`;

export async function runMarketingResearch(
  subQuery: SubQuery,
  invokeLLM: (system: string, prompt: string) => Promise<string>
): Promise<MarketingFinding[]> {
  const prompt = `Research this marketing question for an Israeli business:

Question: ${subQuery.question}
Keywords: ${subQuery.keywords.join(", ")}

Respond with a JSON array of findings:
[
  {
    "insight_he": "תובנה בעברית",
    "insight_en": "insight in English",
    "evidence": "data, case studies, or best practices",
    "sources": [{ "title": "source name", "type": "article", "reliability": "medium" }],
    "confidence": 0.0-1.0,
    "actionable": true/false,
    "recommendation_he": "המלצה בעברית (if actionable)",
    "recommendation_en": "recommendation in English (if actionable)",
    "marketingAspect": "channel" | "content" | "timing" | "audience" | "technology"
  }
]

Return 1-3 most relevant findings.`;

  try {
    const raw = await invokeLLM(SYSTEM_PROMPT, prompt);
    const parsed = parseLLMJson<any[]>(raw);

    return (Array.isArray(parsed) ? parsed : [parsed]).map((f: any, i: number) => ({
      id: `mrk-${subQuery.id}-${i + 1}`,
      subQueryId: subQuery.id,
      domain: "marketing" as const,
      insight: { he: f.insight_he || "", en: f.insight_en || "" },
      evidence: f.evidence || "",
      sources: normalizeSources(f.sources),
      confidence: clamp(f.confidence ?? 0.5, 0, 1),
      actionable: f.actionable ?? false,
      recommendation: f.recommendation_he
        ? { he: f.recommendation_he, en: f.recommendation_en || "" }
        : undefined,
      marketingAspect: f.marketingAspect || "channel",
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
