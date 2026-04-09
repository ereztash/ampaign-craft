// ═══════════════════════════════════════════════
// LLM Agent Factory — Creates async agents that call Claude API
// Generalizes the ai-coach and generate-copy patterns into
// a reusable agent template for the blackboard pipeline.
// ═══════════════════════════════════════════════

import type { Blackboard, BoardSection } from "./blackboardStore";
import type { AsyncAgentDefinition, LLMAgentConfig } from "./agentTypes";
import { supabase } from "@/integrations/supabase/client";
import { selectModel, calculateCostNIS, type ModelTier } from "@/services/llmRouter";

// ═══════════════════════════════════════════════
// LLM AGENT FACTORY
// ═══════════════════════════════════════════════

/**
 * Create an async agent that calls Claude API via Edge Function.
 * The agent reads from the blackboard, constructs prompts, calls
 * the LLM, parses the output, and writes results back to the board.
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
      const systemPrompt = typeof config.systemPrompt === "function"
        ? config.systemPrompt(board)
        : config.systemPrompt;

      const userPrompt = config.userPrompt(board);

      const modelSelection = selectModel({
        task: "agent-task",
        textLength: "medium",
        qualityPriority: config.modelTier === "deep" ? "quality" : config.modelTier === "fast" ? "speed" : "balanced",
      });

      // Override model based on agent config
      const model = getModelForTier(config.modelTier);
      const maxTokens = config.maxTokens ?? modelSelection.maxTokens;

      const { data, error } = await supabase.functions.invoke("agent-executor", {
        body: {
          systemPrompt,
          prompt: userPrompt,
          model,
          maxTokens,
          temperature: config.temperature ?? 0,
        },
      });

      if (error) {
        throw new Error(`LLM agent "${config.name}" failed: ${error.message}`);
      }

      const text = data?.text || "";
      if (!text) {
        throw new Error(`LLM agent "${config.name}" returned empty response`);
      }

      // Parse the output
      const parsed = config.outputParser(text);

      // Write to board sections
      for (const section of config.writes) {
        board.set(section, parsed as any);
      }
    },
  };
}

function getModelForTier(tier: ModelTier): string {
  switch (tier) {
    case "fast": return "claude-haiku-4-5-20251001";
    case "standard": return "claude-sonnet-4-6";
    case "deep": return "claude-opus-4-6";
  }
}

// ═══════════════════════════════════════════════
// JSON PARSER HELPER
// ═══════════════════════════════════════════════

/**
 * Parse LLM output as JSON, with fallback for markdown-wrapped JSON.
 */
export function parseLLMJson<T>(raw: string): T {
  // Try direct parse
  try {
    return JSON.parse(raw);
  } catch {
    // Try extracting from markdown code block
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }

    // Try finding JSON object/array in text
    const objectMatch = raw.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }

    const arrayMatch = raw.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }

    throw new Error("Failed to parse LLM response as JSON");
  }
}
