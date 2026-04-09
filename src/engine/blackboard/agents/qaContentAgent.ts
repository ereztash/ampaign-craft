// ═══════════════════════════════════════════════
// QA Content Agent — LLM-powered content quality review
// Checks: cultural sensitivity (Israeli market),
// brand consistency, CTA clarity, Hebrew quality.
// ═══════════════════════════════════════════════

import { createLLMAgent, parseLLMJson } from "../llmAgent";
import type { AsyncAgentDefinition } from "../agentTypes";
import type { QAContentResult, QAFinding } from "@/types/qa";

export const qaContentAgent: AsyncAgentDefinition = createLLMAgent({
  name: "qaContent",
  dependencies: ["funnel", "knowledgeGraph"],
  writes: ["qaContentResult"],
  modelTier: "standard",
  temperature: 0,
  maxTokens: 2048,

  systemPrompt: (board) => {
    const graph = board.get("knowledgeGraph");
    const parts = [
      "You are an expert Israeli marketing QA reviewer. Your job is to analyze generated marketing content for quality issues.",
      "Focus on: cultural fit for Israeli market, Hebrew language quality, brand consistency, CTA clarity.",
      "Respond ONLY in valid JSON matching the schema provided in the user prompt.",
      "Score each dimension 0-100 where 100 is perfect.",
    ];

    if (graph) {
      parts.push(`Business context: ${graph.identity?.industryLabel || "unknown"} industry, ${graph.identity?.audienceLabel || "unknown"} audience.`);
    }

    return parts.join("\n");
  },

  userPrompt: (board) => {
    const result = board.get("funnelResult");
    if (!result) return "No funnel result available.";

    // Collect all generated text content for review
    const contentSamples: string[] = [];

    // Funnel name
    if (result.funnelName?.he) contentSamples.push(`Funnel name: ${result.funnelName.he}`);

    // Hook tips
    if (result.hookTips) {
      for (const hook of result.hookTips.slice(0, 3)) {
        if (hook.example?.he) contentSamples.push(`Hook: ${hook.example.he}`);
      }
    }

    // Copy formulas
    if (result.copyLab?.formulas) {
      for (const formula of result.copyLab.formulas.slice(0, 2)) {
        if (formula.example?.he) contentSamples.push(`Copy: ${formula.example.he}`);
      }
    }

    // Overall tips
    if (result.overallTips) {
      for (const tip of result.overallTips.slice(0, 3)) {
        if (tip.he) contentSamples.push(`Tip: ${tip.he}`);
      }
    }

    return `Analyze the following Hebrew marketing content for quality issues.

Content samples:
${contentSamples.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Respond in this exact JSON structure:
{
  "findings": [
    {
      "category": "cultural" | "brand" | "cta",
      "severity": "critical" | "warning" | "info",
      "message_he": "description in Hebrew",
      "message_en": "description in English",
      "suggestion_he": "suggestion in Hebrew",
      "suggestion_en": "suggestion in English"
    }
  ],
  "culturalScore": 0-100,
  "brandConsistency": 0-100,
  "ctaClarity": 0-100,
  "hebrewQuality": 0-100
}`;
  },

  outputParser: (raw: string): QAContentResult => {
    try {
      const parsed = parseLLMJson<any>(raw);

      const findings: QAFinding[] = (parsed.findings || []).map((f: any, i: number) => ({
        id: `content-${i + 1}`,
        category: f.category || "cultural",
        severity: f.severity || "info",
        message: { he: f.message_he || "", en: f.message_en || "" },
        suggestion: f.suggestion_he ? { he: f.suggestion_he, en: f.suggestion_en || "" } : undefined,
        autoFixable: false,
      }));

      const culturalScore = clamp(parsed.culturalScore ?? 75, 0, 100);
      const brandConsistency = clamp(parsed.brandConsistency ?? 75, 0, 100);
      const ctaClarity = clamp(parsed.ctaClarity ?? 75, 0, 100);
      const hebrewQuality = clamp(parsed.hebrewQuality ?? 75, 0, 100);

      return {
        findings,
        culturalScore,
        brandConsistency,
        ctaClarity,
        hebrewQuality,
        overallScore: Math.round((culturalScore + brandConsistency + ctaClarity + hebrewQuality) / 4),
      };
    } catch {
      // Fallback: no findings, neutral scores
      return {
        findings: [],
        culturalScore: 70,
        brandConsistency: 70,
        ctaClarity: 70,
        hebrewQuality: 70,
        overallScore: 70,
      };
    }
  },
});

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
