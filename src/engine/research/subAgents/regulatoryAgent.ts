// ═══════════════════════════════════════════════
// Regulatory Research Sub-Agent (Alpha)
// Israeli advertising law, data protection, consumer rights.
// ═══════════════════════════════════════════════

import { parseLLMJson } from "@/engine/blackboard/llmAgent";
import type { SubQuery, RegulatoryFinding, SourceCitation } from "@/types/research";

const SYSTEM_PROMPT = `You are an expert on Israeli business regulations, particularly:
- Advertising standards (חוק הגנת הצרכן, תקנות הפרסום)
- Data protection (חוק הגנת הפרטיות, GDPR alignment)
- Consumer protection laws
- Industry-specific regulations

Provide findings based on your knowledge. Be specific about Israeli law when applicable.
Always respond in valid JSON matching the schema in the user prompt.`;

export async function runRegulatoryResearch(
  subQuery: SubQuery,
  invokeLLM: (system: string, prompt: string) => Promise<string>
): Promise<RegulatoryFinding[]> {
  const prompt = `Research this regulatory question for an Israeli business:

Question: ${subQuery.question}
Keywords: ${subQuery.keywords.join(", ")}

Respond with a JSON array of findings:
[
  {
    "insight_he": "תובנה בעברית",
    "insight_en": "insight in English",
    "evidence": "specific regulation or legal basis",
    "sources": [{ "title": "source name", "type": "regulation", "reliability": "high" }],
    "confidence": 0.0-1.0,
    "actionable": true/false,
    "recommendation_he": "המלצה בעברית (if actionable)",
    "recommendation_en": "recommendation in English (if actionable)",
    "regulationType": "advertising" | "data-protection" | "consumer" | "industry-specific",
    "complianceLevel": "compliant" | "needs-review" | "non-compliant"
  }
]

Return 1-3 most relevant findings.`;

  try {
    const raw = await invokeLLM(SYSTEM_PROMPT, prompt);
    const parsed = parseLLMJson<Record<string, unknown>[]>(raw);

    return (Array.isArray(parsed) ? parsed : [parsed]).map((f: Record<string, unknown>, i: number) => ({
      id: `reg-${subQuery.id}-${i + 1}`,
      subQueryId: subQuery.id,
      domain: "regulatory" as const,
      insight: { he: (f.insight_he as string) || "", en: (f.insight_en as string) || "" },
      evidence: (f.evidence as string) || "",
      sources: normalizeSources(f.sources as unknown[]),
      confidence: clamp((f.confidence as number) ?? 0.6, 0, 1),
      actionable: (f.actionable as boolean) ?? false,
      recommendation: f.recommendation_he
        ? { he: f.recommendation_he as string, en: (f.recommendation_en as string) || "" }
        : undefined,
      regulationType: ((f.regulationType as string) || "advertising") as RegulatoryFinding["regulationType"],
      complianceLevel: ((f.complianceLevel as string) || "needs-review") as RegulatoryFinding["complianceLevel"],
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
