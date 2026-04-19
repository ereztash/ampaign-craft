// ═══════════════════════════════════════════════
// LLM Agent Factory — Creates async agents that call Claude API
// Generalizes the ai-coach and generate-copy patterns into
// a reusable agent template for the blackboard pipeline.
// ═══════════════════════════════════════════════

import type { Blackboard, BlackboardState, BoardSection } from "./blackboardStore";
import type { WriteEventContext } from "./blackboardStore";
import type { AsyncAgentDefinition, LLMAgentConfig } from "./agentTypes";
import { selectModel, type ModelTier } from "@/services/llmRouter";

// ═══════════════════════════════════════════════
// MODEL TIER MAP
// ═══════════════════════════════════════════════

/**
 * Canonical model IDs for each LLM tier.
 * - fast     → Haiku 4.5  (lowest latency, highest throughput, ~$0.003/1k tokens)
 * - standard → Sonnet 4.6 (balanced quality/speed for most agent tasks)
 * - deep     → Opus 4.6   (max reasoning depth for strategy/research agents)
 *
 * This is the single source of truth. Do not hardcode model strings elsewhere.
 */
export function getModelForTier(tier: ModelTier): string {
  switch (tier) {
    case "fast":     return "claude-haiku-4-5-20251001";
    case "standard": return "claude-sonnet-4-6";
    case "deep":     return "claude-opus-4-6";
  }
}

// ═══════════════════════════════════════════════
// FAST-TIER JSON ENFORCEMENT PREAMBLE
// ═══════════════════════════════════════════════

/**
 * Injected at the END of every fast-tier system prompt.
 *
 * Rationale: fast-tier (Haiku) models have a higher tendency to add markdown
 * fences, hedge language, or wrap responses in prose. The ontologicalVerifier
 * will reject any write where the JSON parse fails, so prevention here is
 * essential to reduce rejection rate for fast agents.
 *
 * Rules are numbered so violations are easy to reference in rejection logs.
 */
const FAST_TIER_JSON_ENFORCEMENT = `

STRICT OUTPUT CONTRACT (fast-tier, non-negotiable):
1. Output ONLY a single raw JSON object or array — no other characters.
2. Do NOT wrap output in markdown fences (\`\`\`json ... \`\`\`).
3. Do NOT add explanations, caveats, or commentary before or after the JSON.
4. Do NOT include keys absent from the schema defined in the user prompt.
5. Use the nearest valid schema default if a value is uncertain.
Violation of any rule above causes an automatic ontological rejection.`.trimEnd();

// ═══════════════════════════════════════════════
// LLM AGENT FACTORY
// ═══════════════════════════════════════════════

/**
 * Create an async agent that calls Claude API via Edge Function.
 * The agent reads from the blackboard, constructs prompts, calls
 * the LLM, parses the output, and writes results back to the board
 * via verifiedSet() — every write is checked by the ontologicalVerifier.
 */
export function createLLMAgent(config: LLMAgentConfig): AsyncAgentDefinition {
  return {
    name: config.name,
    dependencies: config.dependencies,
    writes: config.writes,
    timeout: 55_000, // Edge Functions have 60s timeout
    maxRetries: 1,
    modelTier: config.modelTier,
    confidenceThreshold: 0.7,

    run: async (board: Blackboard) => {
      // ── Build system prompt with fast-tier JSON enforcement ──
      const baseSystemPrompt =
        typeof config.systemPrompt === "function"
          ? config.systemPrompt(board)
          : config.systemPrompt;

      const systemPrompt =
        config.modelTier === "fast"
          ? `${baseSystemPrompt}${FAST_TIER_JSON_ENFORCEMENT}`
          : baseSystemPrompt;

      const userPrompt = config.userPrompt(board);

      // Use model based on agent tier (overrides selectModel routing)
      selectModel({
        task: "agent-task",
        textLength: "medium",
        qualityPriority:
          config.modelTier === "deep"
            ? "quality"
            : config.modelTier === "fast"
              ? "speed"
              : "balanced",
      });
      const model = getModelForTier(config.modelTier);
      const maxTokens = config.maxTokens ?? 2048;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-executor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          prompt: userPrompt,
          model,
          maxTokens,
          temperature: config.temperature ?? 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          `LLM agent "${config.name}" failed: ${data.error || response.statusText}`,
        );
      }

      const text = data?.text || "";
      if (!text) {
        throw new Error(`LLM agent "${config.name}" returned empty response`);
      }

      // ── Parse output ──
      const parsed = config.outputParser(text);

      // ── Write to board via verifiedSet (ontologicalVerifier gated) ──
      const writeCtx: WriteEventContext = {
        agentName: config.name,
        modelTier: config.modelTier,
      };

      for (const section of config.writes) {
        board.verifiedSet(
          section,
          parsed as unknown as BlackboardState[typeof section],
          writeCtx,
        );
      }
    },
  };
}

// ═══════════════════════════════════════════════
// JSON PARSER HELPER
// ═══════════════════════════════════════════════

/**
 * Parse LLM output as JSON, with fallback for markdown-wrapped JSON.
 * Order of attempts: direct parse → code fence extraction → object regex → array regex.
 */
export function parseLLMJson<T>(raw: string): T {
  // Attempt 1: direct parse (fast path — works for compliant fast-tier output)
  try {
    return JSON.parse(raw);
  } catch {
    /* fall through */
  }

  // Attempt 2: extract from markdown code fence ```json ... ```
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    return JSON.parse(fenceMatch[1].trim());
  }

  // Attempt 3: find first JSON object in free text
  const objectMatch = raw.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return JSON.parse(objectMatch[0]);
  }

  // Attempt 4: find first JSON array in free text
  const arrayMatch = raw.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return JSON.parse(arrayMatch[0]);
  }

  throw new Error(`parseLLMJson: could not extract JSON from response — "${raw.slice(0, 120)}..."`);
}
