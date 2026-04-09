// ═══════════════════════════════════════════════
// LLM Router — Dynamic Model Selection
// Routes requests to optimal Claude model based on task complexity
// ═══════════════════════════════════════════════

export type ModelTier = "fast" | "standard" | "deep";

export interface LLMRouterConfig {
  task: CopyTask;
  textLength: "short" | "medium" | "long";
  qualityPriority: "speed" | "balanced" | "quality";
}

export type CopyTask =
  | "ad-copy"
  | "email-sequence"
  | "landing-page"
  | "whatsapp-message"
  | "social-post"
  | "headline"
  | "deep-analysis"
  | "strategy"
  | "qa-analysis"
  | "research"
  | "agent-task";

export interface ModelSelection {
  model: string;
  tier: ModelTier;
  maxTokens: number;
  estimatedCostNIS: number;
  reasoning: string;
}

const MODEL_MAP: Record<ModelTier, { model: string; costPer1kTokens: number }> = {
  fast: { model: "claude-haiku-4-5-20251001", costPer1kTokens: 0.003 },
  standard: { model: "claude-sonnet-4-6", costPer1kTokens: 0.015 },
  deep: { model: "claude-opus-4-6", costPer1kTokens: 0.075 },
};

const TASK_COMPLEXITY: Record<CopyTask, { baseTier: ModelTier; maxTokens: number }> = {
  "headline": { baseTier: "fast", maxTokens: 256 },
  "whatsapp-message": { baseTier: "fast", maxTokens: 512 },
  "social-post": { baseTier: "fast", maxTokens: 512 },
  "ad-copy": { baseTier: "standard", maxTokens: 1024 },
  "email-sequence": { baseTier: "standard", maxTokens: 2048 },
  "landing-page": { baseTier: "standard", maxTokens: 4096 },
  "deep-analysis": { baseTier: "deep", maxTokens: 4096 },
  "strategy": { baseTier: "deep", maxTokens: 4096 },
  "qa-analysis": { baseTier: "standard", maxTokens: 2048 },
  "research": { baseTier: "deep", maxTokens: 4096 },
  "agent-task": { baseTier: "standard", maxTokens: 2048 },
};

/**
 * Selects the optimal model based on task, text length, and quality priority.
 */
export function selectModel(config: LLMRouterConfig): ModelSelection {
  const taskConfig = TASK_COMPLEXITY[config.task];
  let tier = taskConfig.baseTier;

  // Upgrade tier if quality priority demands it
  if (config.qualityPriority === "quality") {
    if (tier === "fast") tier = "standard";
    else if (tier === "standard") tier = "deep";
  }

  // Downgrade tier if speed priority demands it
  if (config.qualityPriority === "speed") {
    if (tier === "deep") tier = "standard";
    else if (tier === "standard") tier = "fast";
  }

  // Long text needs more tokens
  let maxTokens = taskConfig.maxTokens;
  if (config.textLength === "long") maxTokens = Math.min(maxTokens * 2, 8192);
  else if (config.textLength === "short") maxTokens = Math.round(maxTokens * 0.5);

  const modelConfig = MODEL_MAP[tier];
  const estimatedCostNIS = (maxTokens / 1000) * modelConfig.costPer1kTokens * 3.6; // USD to NIS

  return {
    model: modelConfig.model,
    tier,
    maxTokens,
    estimatedCostNIS: Math.round(estimatedCostNIS * 100) / 100,
    reasoning: `Task "${config.task}" (${config.qualityPriority} priority) → ${tier} tier → ${modelConfig.model}`,
  };
}

// ═══════════════════════════════════════════════
// USAGE TRACKING
// ═══════════════════════════════════════════════

export interface UsageRecord {
  task: CopyTask;
  model: string;
  tokensUsed: number;
  costNIS: number;
  timestamp: string;
}

const STORAGE_KEY = "funnelforge-llm-usage";

export function trackUsage(record: UsageRecord): void {
  const existing = getUsageHistory();
  existing.push(record);
  // Keep last 100 records
  const trimmed = existing.slice(-100);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function getUsageHistory(): UsageRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getTotalCostNIS(): number {
  return getUsageHistory().reduce((sum, r) => sum + r.costNIS, 0);
}

// ═══════════════════════════════════════════════
// FALLBACK CHAINS
// ═══════════════════════════════════════════════

const FALLBACK_ORDER: ModelTier[] = ["deep", "standard", "fast"];

/**
 * Get the fallback tier for a given tier (downgrades on failure).
 * Returns null if no further fallback is available.
 */
export function getFallbackTier(currentTier: ModelTier): ModelTier | null {
  const idx = FALLBACK_ORDER.indexOf(currentTier);
  if (idx < 0 || idx >= FALLBACK_ORDER.length - 1) return null;
  return FALLBACK_ORDER[idx + 1];
}

/**
 * Select model with fallback: if the preferred tier fails,
 * automatically downgrades to the next tier.
 */
export function selectModelWithFallback(
  config: LLMRouterConfig,
  failedTiers: ModelTier[] = []
): ModelSelection {
  let selection = selectModel(config);

  // If the selected tier has already failed, try fallbacks
  while (failedTiers.includes(selection.tier)) {
    const fallback = getFallbackTier(selection.tier);
    if (!fallback) break;

    const fallbackConfig = MODEL_MAP[fallback];
    selection = {
      model: fallbackConfig.model,
      tier: fallback,
      maxTokens: selection.maxTokens,
      estimatedCostNIS: Math.round((selection.maxTokens / 1000) * fallbackConfig.costPer1kTokens * 3.6 * 100) / 100,
      reasoning: `${selection.reasoning} → fallback to ${fallback}`,
    };
  }

  return selection;
}

// ═══════════════════════════════════════════════
// COST CAP CHECK
// ═══════════════════════════════════════════════

/**
 * Check if a proposed operation would exceed the session cost cap.
 */
export function wouldExceedCostCap(
  proposedCostNIS: number,
  currentSpendNIS: number,
  capNIS: number
): boolean {
  return currentSpendNIS + proposedCostNIS > capNIS;
}

/**
 * Calculate actual cost from token usage.
 */
export function calculateCostNIS(tokensUsed: number, tier: ModelTier): number {
  const costPerToken = MODEL_MAP[tier].costPer1kTokens / 1000;
  return Math.round(tokensUsed * costPerToken * 3.6 * 10000) / 10000;
}

/**
 * Get the model config for a tier.
 */
export function getModelConfig(tier: ModelTier): { model: string; costPer1kTokens: number } {
  return MODEL_MAP[tier];
}
