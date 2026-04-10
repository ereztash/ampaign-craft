// ═══════════════════════════════════════════════
// Training Export Engine — LLM Fine-Tuning Dataset
// Converts captured training_pairs into JSONL formats
// compatible with OpenAI and Anthropic fine-tuning APIs.
// ═══════════════════════════════════════════════

import {
  getTrainingPairs,
  type EngineCategory,
  type FeedbackRating,
  type TrainingPair,
} from "./trainingDataEngine";
import type { ExportResult } from "./exportEngine";

export type ExportFormat = "openai_jsonl" | "anthropic_jsonl" | "raw_json";

export interface ExportOptions {
  format: ExportFormat;
  engineId?: EngineCategory;
  quality?: FeedbackRating; // e.g. only "positive" pairs for supervised fine-tuning
  limit?: number;
  since?: string;
  systemPrompt?: string; // override default system prompt per-engine
}

// ───────────────────────────────────────────────
// System prompts per engine (used as context for fine-tuning)
// ───────────────────────────────────────────────

const ENGINE_SYSTEM_PROMPTS: Record<string, string> = {
  funnel:
    "You are Campaign Craft, an expert behavioral-science marketing planner. Generate a full-funnel campaign strategy from the user's business profile.",
  copy:
    "You are Campaign Craft, an expert Hebrew-first copywriter. Produce high-converting marketing copy tuned to the requested channel and audience.",
  disc_profile:
    "You are Campaign Craft's DISC profiling engine. Infer the buyer's DISC profile from the business profile and return a messaging strategy.",
  hormozi_value:
    "You are Campaign Craft's Hormozi Value Equation engine. Rewrite the offer to maximize (Dream × Likelihood) / (Time × Effort).",
  copy_qa:
    "You are Campaign Craft's Copy QA engine. Critique the copy on cortisol, entropy, reactance, persona fit, CTA strength and proof.",
  brand_vector:
    "You are Campaign Craft's Brand-Neuro engine. Classify the brand's neurochemical vector (cortisol/oxytocin/dopamine) and suggest rebalancing moves.",
  stylome:
    "You are Campaign Craft's Stylome voice-cloning engine. Extract a stylistic fingerprint from writing samples.",
  neuro_storytelling:
    "You are Campaign Craft's neuro-storytelling engine. Structure the narrative to match the reader's neural response curve.",
  differentiation:
    "You are Campaign Craft's differentiation engine. Surface positioning gaps vs competitors.",
  emotional_performance:
    "You are Campaign Craft's Emotional Performance (EPS) engine. Score the campaign on a unified 0-100 emotional health scale.",
  cross_domain_benchmark:
    "You are Campaign Craft's cross-domain benchmark engine. Transfer proven strategies across industries.",
  predictive_content_score:
    "You are Campaign Craft's predictive content scorer. Predict engagement and conversion before publication.",
  behavioral_cohort:
    "You are Campaign Craft's behavioral cohort engine. Assign users to behavioral segments and recommend cohort-specific strategies.",
};

function getSystemPrompt(engineId: string, override?: string): string {
  if (override) return override;
  return (
    ENGINE_SYSTEM_PROMPTS[engineId] ||
    "You are Campaign Craft, a behavioral-science marketing engine."
  );
}

// ───────────────────────────────────────────────
// Formatters
// ───────────────────────────────────────────────

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIExample {
  messages: OpenAIMessage[];
}

interface AnthropicExample {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
}

function serialize(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function toOpenAIFormat(pair: TrainingPair, systemPromptOverride?: string): OpenAIExample {
  const system = getSystemPrompt(pair.engine_id, systemPromptOverride);
  return {
    messages: [
      { role: "system", content: system },
      { role: "user", content: serialize(pair.input) },
      { role: "assistant", content: serialize(pair.output) },
    ],
  };
}

function toAnthropicFormat(pair: TrainingPair, systemPromptOverride?: string): AnthropicExample {
  const system = getSystemPrompt(pair.engine_id, systemPromptOverride);
  return {
    system,
    messages: [
      { role: "user", content: serialize(pair.input) },
      { role: "assistant", content: serialize(pair.output) },
    ],
  };
}

// ───────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────

export async function exportTrainingData(options: ExportOptions): Promise<ExportResult> {
  const pairs = await getTrainingPairs({
    engineId: options.engineId,
    quality: options.quality,
    limit: options.limit ?? 10000,
    since: options.since,
  });

  let body: string;
  let filename: string;
  let mimeType: string;

  switch (options.format) {
    case "openai_jsonl": {
      const lines = pairs.map((p) => JSON.stringify(toOpenAIFormat(p, options.systemPrompt)));
      body = lines.join("\n");
      filename = `training-openai-${dateStamp()}.jsonl`;
      mimeType = "application/jsonl";
      break;
    }
    case "anthropic_jsonl": {
      const lines = pairs.map((p) => JSON.stringify(toAnthropicFormat(p, options.systemPrompt)));
      body = lines.join("\n");
      filename = `training-anthropic-${dateStamp()}.jsonl`;
      mimeType = "application/jsonl";
      break;
    }
    case "raw_json":
    default: {
      body = JSON.stringify(pairs, null, 2);
      filename = `training-raw-${dateStamp()}.json`;
      mimeType = "application/json";
      break;
    }
  }

  const encoder = new TextEncoder();
  const buffer = encoder.encode(body).buffer;

  return { data: buffer, filename, mimeType };
}

export function getSupportedFormats(): { format: ExportFormat; label: { he: string; en: string } }[] {
  return [
    { format: "openai_jsonl", label: { he: "OpenAI Fine-Tuning (JSONL)", en: "OpenAI Fine-Tuning (JSONL)" } },
    { format: "anthropic_jsonl", label: { he: "Anthropic Claude (JSONL)", en: "Anthropic Claude (JSONL)" } },
    { format: "raw_json", label: { he: "JSON גולמי", en: "Raw JSON" } },
  ];
}

function dateStamp(): string {
  return new Date().toISOString().split("T")[0];
}
