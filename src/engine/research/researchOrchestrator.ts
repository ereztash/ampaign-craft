// ═══════════════════════════════════════════════
// Research Orchestrator — Lead Researcher
// Decomposes macro questions into sub-queries,
// dispatches to domain sub-agents, synthesizes results.
// ═══════════════════════════════════════════════

import { parseLLMJson } from "@/engine/blackboard/llmAgent";
import { supabase } from "@/integrations/supabase/client";
import { runRegulatoryResearch } from "./subAgents/regulatoryAgent";
import { runMarketResearch } from "./subAgents/marketAgent";
import { runMarketingResearch } from "./subAgents/marketingAgent";
import type {
  ResearchQuery,
  ResearchSession,
  SubQuery,
  ResearchFinding,
  ResearchSynthesis,
  ResearchDomain,
} from "@/types/research";

// ═══════════════════════════════════════════════
// LLM INVOCATION HELPER
// ═══════════════════════════════════════════════

async function invokeLLM(
  systemPrompt: string,
  userPrompt: string,
  model = "claude-sonnet-4-6"
): Promise<string> {
  const _resp = await fetch("/api/growth/agent-executor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
      systemPrompt,
      prompt: userPrompt,
      model,
      maxTokens: 2048,
      temperature: 0.1,
    }),
      });
  const data = await _resp.json();
  const error = _resp.ok ? null : (data?.error || _resp.statusText);

  if (error) throw new Error(`LLM call failed: ${error}`);
  return data?.text || "";
}

// ═══════════════════════════════════════════════
// ORCHESTRATOR
// ═══════════════════════════════════════════════

export type ResearchProgressCallback = (session: ResearchSession) => void;

/**
 * Run a full research session: decompose → research → synthesize.
 */
export async function runResearch(
  query: ResearchQuery,
  onProgress?: ResearchProgressCallback
): Promise<ResearchSession> {
  const session: ResearchSession = {
    query,
    subQueries: [],
    findings: [],
    synthesis: null,
    status: "decomposing",
    progress: 0,
    startedAt: new Date().toISOString(),
  };

  const emit = () => onProgress?.(structuredClone(session));
  emit();

  try {
    // Step 1: Decompose the macro question into sub-queries
    session.subQueries = await decomposeQuery(query);
    session.progress = 20;
    emit();

    // Step 2: Run sub-agents in parallel per domain
    session.status = "researching";
    emit();

    const findings = await runSubAgents(session.subQueries);
    session.findings = findings;
    session.progress = 70;
    emit();

    // Step 3: Synthesize all findings
    session.status = "synthesizing";
    emit();

    session.synthesis = await synthesizeFindings(query, findings);
    session.status = "complete";
    session.progress = 100;
    session.completedAt = new Date().toISOString();
    emit();
  } catch (err) {
    session.status = "error";
    session.error = err instanceof Error ? err.message : String(err);
    emit();
  }

  return session;
}

// ═══════════════════════════════════════════════
// QUERY DECOMPOSITION
// ═══════════════════════════════════════════════

async function decomposeQuery(query: ResearchQuery): Promise<SubQuery[]> {
  const prompt = `Decompose this strategic business question into specific research sub-queries.

Main question: ${query.question}
Industry: ${query.context.industry}
Audience: ${query.context.audienceType}
Goal: ${query.context.mainGoal}
Market: Israel

Create 2-4 sub-queries across these domains: regulatory, market, marketing.
Each sub-query should be specific and answerable.

Respond in JSON:
[
  {
    "domain": "regulatory" | "market" | "marketing",
    "question": "specific research question",
    "keywords": ["keyword1", "keyword2"]
  }
]`;

  const raw = await invokeLLM(
    "You are a research planning specialist. Decompose broad business questions into focused, domain-specific sub-queries. Respond in JSON only.",
    prompt,
    "claude-sonnet-4-6"
  );

  const parsed = parseLLMJson<any[]>(raw);
  const items = Array.isArray(parsed) ? parsed : [parsed];

  return items.map((item: any, i: number) => ({
    id: `sq-${query.id}-${i + 1}`,
    parentId: query.id,
    domain: validateDomain(item.domain),
    question: item.question || query.question,
    keywords: Array.isArray(item.keywords) ? item.keywords : [],
  }));
}

function validateDomain(d: string): ResearchDomain {
  if (d === "regulatory" || d === "market" || d === "marketing") return d;
  return "marketing";
}

// ═══════════════════════════════════════════════
// SUB-AGENT DISPATCH
// ═══════════════════════════════════════════════

async function runSubAgents(subQueries: SubQuery[]): Promise<ResearchFinding[]> {
  // Group by domain and run each domain's queries in parallel
  const regulatory = subQueries.filter((q) => q.domain === "regulatory");
  const market = subQueries.filter((q) => q.domain === "market");
  const marketing = subQueries.filter((q) => q.domain === "marketing");

  const llm = (system: string, prompt: string) => invokeLLM(system, prompt);

  const [regFindings, mktFindings, mrkFindings] = await Promise.all([
    Promise.all(regulatory.map((q) => runRegulatoryResearch(q, llm))),
    Promise.all(market.map((q) => runMarketResearch(q, llm))),
    Promise.all(marketing.map((q) => runMarketingResearch(q, llm))),
  ]);

  return [
    ...regFindings.flat(),
    ...mktFindings.flat(),
    ...mrkFindings.flat(),
  ];
}

// ═══════════════════════════════════════════════
// SYNTHESIS
// ═══════════════════════════════════════════════

async function synthesizeFindings(
  query: ResearchQuery,
  findings: ResearchFinding[]
): Promise<ResearchSynthesis> {
  if (findings.length === 0) {
    return {
      queryId: query.id,
      summary: {
        he: "לא נמצאו תובנות מספיקות לסינתזה",
        en: "Insufficient findings for synthesis",
      },
      keyFindings: [],
      crossDomainInsights: [],
      strategicRecommendations: [],
      overallConfidence: 0,
      domains: [],
      totalFindings: 0,
      completedAt: new Date().toISOString(),
    };
  }

  const findingSummaries = findings.map((f) =>
    `[${f.domain}] ${f.insight.en} (confidence: ${f.confidence})`
  ).join("\n");

  const prompt = `Synthesize these research findings into strategic recommendations.

Original question: ${query.question}
Industry: ${query.context.industry}
Market: Israel

Findings:
${findingSummaries}

Respond in JSON:
{
  "summary_he": "סיכום כולל בעברית",
  "summary_en": "overall summary in English",
  "crossDomainInsights": [
    { "he": "תובנה חוצת תחומים בעברית", "en": "cross-domain insight in English" }
  ],
  "strategicRecommendations": [
    {
      "priority": "high" | "medium" | "low",
      "recommendation_he": "המלצה בעברית",
      "recommendation_en": "recommendation in English"
    }
  ],
  "overallConfidence": 0.0-1.0
}`;

  const raw = await invokeLLM(
    "You are a strategic business advisor synthesizing multi-domain research into actionable recommendations for Israeli businesses. Be concise and practical. Respond in JSON only.",
    prompt,
    "claude-sonnet-4-6"
  );

  const parsed = parseLLMJson<any>(raw);
  const domains = [...new Set(findings.map((f) => f.domain))] as ResearchDomain[];

  // Select top findings by confidence
  const keyFindings = [...findings]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  return {
    queryId: query.id,
    summary: {
      he: parsed.summary_he || "",
      en: parsed.summary_en || "",
    },
    keyFindings,
    crossDomainInsights: (parsed.crossDomainInsights || []).map((i: any) => ({
      he: i.he || "",
      en: i.en || "",
    })),
    strategicRecommendations: (parsed.strategicRecommendations || []).map((r: any) => ({
      priority: r.priority || "medium",
      recommendation: { he: r.recommendation_he || "", en: r.recommendation_en || "" },
      supportingFindings: [],
    })),
    overallConfidence: clamp(parsed.overallConfidence ?? 0.6, 0, 1),
    domains,
    totalFindings: findings.length,
    completedAt: new Date().toISOString(),
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
