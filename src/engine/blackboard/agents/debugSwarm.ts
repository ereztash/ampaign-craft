// ═══════════════════════════════════════════════
// Debug Swarm — Iterative QA Fix Loop
// Three-agent cycle: Analyzer → Proposer → Critique
// Uses circuit breaker to prevent runaway loops.
// ═══════════════════════════════════════════════

import { createLLMAgent, parseLLMJson } from "../llmAgent";
import { CircuitBreaker } from "../circuitBreaker";
import type { Blackboard } from "../blackboardStore";
import type { AsyncAgentDefinition } from "../agentTypes";
import type { QAFinding } from "@/types/qa";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export interface DebugAnalysis {
  findingId: string;
  rootCause: string;
  affectedSections: string[];
  complexity: "trivial" | "moderate" | "complex";
}

export interface DebugProposal {
  findingId: string;
  description: { he: string; en: string };
  changes: ProposedChange[];
  confidence: number; // 0-1
}

export interface ProposedChange {
  target: string;       // board section or field path
  action: "update" | "add" | "remove";
  currentValue?: string;
  proposedValue: string;
  rationale: string;
}

export interface DebugCritique {
  findingId: string;
  approved: boolean;
  confidence: number;   // 0-1
  concerns: string[];
  verdict: string;
}

export interface DebugSwarmResult {
  iterations: DebugIteration[];
  resolvedFindings: string[];
  unresolvedFindings: string[];
  totalIterations: number;
  circuitTripped: boolean;
  trippedReason: string | null;
}

export interface DebugIteration {
  iteration: number;
  findingId: string;
  analysis: DebugAnalysis;
  proposal: DebugProposal;
  critique: DebugCritique;
  resolved: boolean;
}

// ═══════════════════════════════════════════════
// SWARM RUNNER
// ═══════════════════════════════════════════════

/**
 * Run the debug swarm on a set of QA findings.
 * Each finding goes through Analyzer → Proposer → Critique.
 * The circuit breaker limits total iterations across all findings.
 *
 * Note: This is a standalone function, not a blackboard agent,
 * because it operates on QA results that are already on the board.
 * It's invoked by the UI or an orchestration layer when the user
 * requests auto-fix suggestions for QA findings.
 */
export async function runDebugSwarm(
  board: Blackboard,
  findings: QAFinding[],
  options: { maxIterations?: number; minConfidence?: number } = {}
): Promise<DebugSwarmResult> {
  const breaker = new CircuitBreaker({
    maxIterations: options.maxIterations ?? 5,
    minConfidence: options.minConfidence ?? 0.8,
    consecutiveFailures: 3,
    cooldownMs: 2000,
  });

  const iterations: DebugIteration[] = [];
  const resolvedFindings: string[] = [];
  const unresolvedFindings: string[] = [];

  // Process only critical and warning findings (skip info)
  const actionableFindings = findings.filter(
    (f) => f.severity === "critical" || f.severity === "warning"
  );

  for (const finding of actionableFindings) {
    if (!breaker.canContinue()) break;

    try {
      const iteration = await processOneFinding(board, finding, iterations.length + 1);
      iterations.push(iteration);

      if (iteration.resolved) {
        resolvedFindings.push(finding.id);
        breaker.recordSuccess(iteration.critique.confidence);
      } else {
        unresolvedFindings.push(finding.id);
        breaker.recordSuccess(iteration.critique.confidence);
      }
    } catch (err) {
      unresolvedFindings.push(finding.id);
      breaker.recordFailure(err instanceof Error ? err.message : String(err));
    }
  }

  // Any remaining findings that weren't processed
  const processedIds = new Set([...resolvedFindings, ...unresolvedFindings]);
  for (const f of actionableFindings) {
    if (!processedIds.has(f.id)) {
      unresolvedFindings.push(f.id);
    }
  }

  const snapshot = breaker.getSnapshot();

  return {
    iterations,
    resolvedFindings,
    unresolvedFindings,
    totalIterations: iterations.length,
    circuitTripped: snapshot.state === "open",
    trippedReason: snapshot.trippedReason,
  };
}

// ═══════════════════════════════════════════════
// SINGLE FINDING PROCESSOR
// ═══════════════════════════════════════════════

async function processOneFinding(
  board: Blackboard,
  finding: QAFinding,
  iterationNum: number
): Promise<DebugIteration> {
  // Step 1: Analyze root cause
  const analysis = await analyzeRootCause(board, finding);

  // Step 2: Propose fix
  const proposal = await proposeFix(board, finding, analysis);

  // Step 3: Critique the proposal
  const critique = await critiqueProposal(board, finding, proposal);

  return {
    iteration: iterationNum,
    findingId: finding.id,
    analysis,
    proposal,
    critique,
    resolved: critique.approved && critique.confidence >= 0.7,
  };
}

// ═══════════════════════════════════════════════
// ANALYZER AGENT
// ═══════════════════════════════════════════════

const analyzerAgent = createLLMAgent({
  name: "debugAnalyzer",
  dependencies: [],
  writes: [],
  modelTier: "standard",
  temperature: 0,
  maxTokens: 1024,

  systemPrompt: "You are a root-cause analysis expert for marketing funnel plans. Given a QA finding, identify the root cause in the plan data or engine logic. Be specific and concise. Respond in valid JSON only.",

  userPrompt: () => "", // overridden per-call
  outputParser: (raw: string) => parseLLMJson<DebugAnalysis>(raw),
});

async function analyzeRootCause(
  board: Blackboard,
  finding: QAFinding
): Promise<DebugAnalysis> {
  const formData = board.get("formData");
  const funnelResult = board.get("funnelResult");

  const prompt = `Analyze this QA finding and identify its root cause.

Finding:
- ID: ${finding.id}
- Category: ${finding.category}
- Severity: ${finding.severity}
- Message: ${finding.message.en}
- Location: ${finding.location || "unknown"}
${finding.suggestion ? `- Suggestion: ${finding.suggestion.en}` : ""}

Context:
- Business: ${formData?.businessField || "unknown"}
- Audience: ${formData?.audienceType || "unknown"}
- Goal: ${formData?.mainGoal || "unknown"}
- Stages: ${funnelResult?.stages?.length || 0}

Respond in this exact JSON:
{
  "findingId": "${finding.id}",
  "rootCause": "specific root cause description",
  "affectedSections": ["section1", "section2"],
  "complexity": "trivial" | "moderate" | "complex"
}`;

  // Call the LLM via the agent's internal mechanism
  const _resp = await fetch("/api/growth/agent-executor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
      systemPrompt: "You are a root-cause analysis expert for marketing funnel plans. Given a QA finding, identify the root cause in the plan data or engine logic. Be specific and concise. Respond in valid JSON only.",
      prompt,
      model: "claude-sonnet-4-6",
      maxTokens: 1024,
      temperature: 0,
    }),
      });
  const data = await _resp.json();
  const error = _resp.ok ? null : (data?.error || _resp.statusText);

  if (error) throw new Error(`Analyzer failed: ${error}`);

  const parsed = parseLLMJson<DebugAnalysis>(data?.text || "{}");
  return {
    findingId: finding.id,
    rootCause: parsed.rootCause || "Unable to determine root cause",
    affectedSections: parsed.affectedSections || [],
    complexity: parsed.complexity || "moderate",
  };
}

// ═══════════════════════════════════════════════
// PROPOSER AGENT
// ═══════════════════════════════════════════════

async function proposeFix(
  board: Blackboard,
  finding: QAFinding,
  analysis: DebugAnalysis
): Promise<DebugProposal> {
  const prompt = `Given this QA finding and root cause analysis, propose a specific fix.

Finding:
- ID: ${finding.id}
- Category: ${finding.category}
- Message: ${finding.message.en}
- Location: ${finding.location || "unknown"}

Root Cause Analysis:
- Root cause: ${analysis.rootCause}
- Affected sections: ${analysis.affectedSections.join(", ")}
- Complexity: ${analysis.complexity}

Propose specific changes to the marketing plan data to fix this issue.
Respond in this exact JSON:
{
  "findingId": "${finding.id}",
  "description": { "he": "תיאור בעברית", "en": "description in English" },
  "changes": [
    {
      "target": "section.field.path",
      "action": "update",
      "currentValue": "current value if known",
      "proposedValue": "new value",
      "rationale": "why this change fixes the issue"
    }
  ],
  "confidence": 0.0-1.0
}`;

  const _resp2 = await fetch("/api/growth/agent-executor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
      systemPrompt: "You are a marketing plan optimization expert. Given a QA finding and its root cause, propose specific, actionable changes to fix the issue. Focus on minimal, targeted changes. Respond in valid JSON only.",
      prompt,
      model: "claude-sonnet-4-6",
      maxTokens: 1024,
      temperature: 0.1,
    }),
      });
  const data2 = await _resp2.json();
  const error2 = _resp2.ok ? null : (data2?.error || _resp2.statusText);

  if (error2) throw new Error(`Proposer failed: ${error2}`);

  const parsed = parseLLMJson<DebugProposal>(data2?.text || "{}");
  return {
    findingId: finding.id,
    description: parsed.description || { he: "הצעה", en: "Proposal" },
    changes: (parsed.changes || []).map((c: any) => ({
      target: c.target || "unknown",
      action: c.action || "update",
      currentValue: c.currentValue,
      proposedValue: c.proposedValue || "",
      rationale: c.rationale || "",
    })),
    confidence: clamp(parsed.confidence ?? 0.5, 0, 1),
  };
}

// ═══════════════════════════════════════════════
// CRITIQUE AGENT
// ═══════════════════════════════════════════════

async function critiqueProposal(
  board: Blackboard,
  finding: QAFinding,
  proposal: DebugProposal
): Promise<DebugCritique> {
  const formData = board.get("formData");

  const prompt = `Evaluate this proposed fix for a QA finding. Be critical but fair.

Original Finding:
- ID: ${finding.id}
- Category: ${finding.category}
- Severity: ${finding.severity}
- Message: ${finding.message.en}

Proposed Fix:
- Description: ${proposal.description.en}
- Changes: ${JSON.stringify(proposal.changes, null, 2)}
- Proposer confidence: ${proposal.confidence}

Business Context:
- Field: ${formData?.businessField || "unknown"}
- Audience: ${formData?.audienceType || "unknown"}
- Goal: ${formData?.mainGoal || "unknown"}

Evaluate: Will this fix resolve the finding without introducing new issues?
Respond in this exact JSON:
{
  "findingId": "${finding.id}",
  "approved": true/false,
  "confidence": 0.0-1.0,
  "concerns": ["concern 1", "concern 2"],
  "verdict": "brief summary of evaluation"
}`;

  const _resp3 = await fetch("/api/growth/agent-executor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
      systemPrompt: "You are a critical code reviewer specializing in marketing automation systems. Evaluate proposed fixes objectively. Approve only if the fix is correct, complete, and won't cause side effects. Respond in valid JSON only.",
      prompt,
      model: "claude-sonnet-4-6",
      maxTokens: 1024,
      temperature: 0,
    }),
      });
  const data3 = await _resp3.json();
  const error3 = _resp3.ok ? null : (data3?.error || _resp3.statusText);

  if (error3) throw new Error(`Critique failed: ${error3}`);

  const parsed = parseLLMJson<DebugCritique>(data3?.text || "{}");
  return {
    findingId: finding.id,
    approved: parsed.approved ?? false,
    confidence: clamp(parsed.confidence ?? 0.5, 0, 1),
    concerns: parsed.concerns || [],
    verdict: parsed.verdict || "Unable to evaluate",
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
