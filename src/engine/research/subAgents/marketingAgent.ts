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
    const parsed = parseLLMJson<Record<string, unknown>[]>(raw);

    return (Array.isArray(parsed) ? parsed : [parsed]).map((f: Record<string, unknown>, i: number) => ({
      id: `mrk-${subQuery.id}-${i + 1}`,
      subQueryId: subQuery.id,
      domain: "marketing" as const,
      insight: { he: (f.insight_he as string) || "", en: (f.insight_en as string) || "" },
      evidence: (f.evidence as string) || "",
      sources: normalizeSources(f.sources as unknown[]),
      confidence: clamp((f.confidence as number) ?? 0.5, 0, 1),
      actionable: (f.actionable as boolean) ?? false,
      recommendation: f.recommendation_he
        ? { he: f.recommendation_he as string, en: (f.recommendation_en as string) || "" }
        : undefined,
      marketingAspect: (f.marketingAspect as string) || "channel",
    }));
  } catch {
    return [];
  }
}

function normalizeSources(raw: unknown[]): SourceCitation[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => {
    const src = s as Record<string, unknown>;
    return {
      title: (src.title as string) || "Unknown source",
      url: src.url as string | undefined,
      type: (src.type as SourceCitation["type"]) || "article",
      reliability: (src.reliability as SourceCitation["reliability"]) || "medium",
    };
  });
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
