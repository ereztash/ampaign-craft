// ═══════════════════════════════════════════════
// LLM Router — Dynamic Model Selection
// Routes requests to optimal Claude model based on task complexity
// ═══════════════════════════════════════════════

import type { RegimeState } from "@/engine/optimization/regimeDetector";

export type ModelTier = "fast" | "standard" | "deep";

export interface LLMRouterConfig {
  task: CopyTask;
  textLength: "short" | "medium" | "long";
  qualityPriority: "speed" | "balanced" | "quality";
  /** Optional: user's current behavioral regime — escalates tier when crisis detected. */
  regime?: RegimeState;
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

// ═══════════════════════════════════════════════
// TIER-BASED MODEL RESTRICTION
// ═══════════════════════════════════════════════

export type PricingTier = "free" | "pro" | "business";

const TIER_ORDER: ModelTier[] = ["fast", "standard", "deep"];

const PRICING_TIER_MAX_MODEL: Record<PricingTier, ModelTier> = {
  free: "fast",       // Haiku only
  pro: "standard",    // Haiku + Sonnet
  business: "deep",   // All models
};

export function getMaxTierForPricingTier(pricingTier: PricingTier): ModelTier {
  return PRICING_TIER_MAX_MODEL[pricingTier] ?? "fast";
}

function clampTier(requested: ModelTier, maxAllowed: ModelTier): ModelTier {
  const reqIdx = TIER_ORDER.indexOf(requested);
  const maxIdx = TIER_ORDER.indexOf(maxAllowed);
  return reqIdx <= maxIdx ? requested : maxAllowed;
}

/**
 * Selects the optimal model based on task, text length, quality priority,
 * and optional pricing tier restriction.
 */
export function selectModel(config: LLMRouterConfig, pricingTier?: PricingTier): ModelSelection {
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

  // Regime-aware escalation: when the user's metrics are in crisis,
  // upgrade one tier (even over `speed` priority) because a bad answer
  // in crisis is more expensive than a slow-but-good one.
  // Transitional regime nudges up only if already "fast" (borderline users
  // benefit from Sonnet-quality analysis); stable keeps the baseline.
  if (config.regime === "crisis") {
    if (tier === "fast") tier = "standard";
    else if (tier === "standard") tier = "deep";
  } else if (config.regime === "transitional" && tier === "fast") {
    tier = "standard";
  }

  // Clamp to pricing tier limit (applied LAST — free users never escalate past Haiku)
  if (pricingTier) {
    tier = clampTier(tier, getMaxTierForPricingTier(pricingTier));
  }

  // Long text needs more tokens
  let maxTokens = taskConfig.maxTokens;
  if (config.textLength === "long") maxTokens = Math.min(maxTokens * 2, 8192);
  else if (config.textLength === "short") maxTokens = Math.round(maxTokens * 0.5);

  const modelConfig = MODEL_MAP[tier];
  const estimatedCostNIS = (maxTokens / 1000) * modelConfig.costPer1kTokens * 3.6; // USD to NIS

  const regimeNote = config.regime && config.regime !== "stable" ? ` [regime: ${config.regime}]` : "";
  return {
    model: modelConfig.model,
    tier,
    maxTokens,
    estimatedCostNIS: Math.round(estimatedCostNIS * 100) / 100,
    reasoning: `Task "${config.task}" (${config.qualityPriority} priority)${regimeNote} → ${tier} tier → ${modelConfig.model}`,
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
// MONTHLY USAGE TRACKING
// ═══════════════════════════════════════════════

const MONTHLY_CAPS: Record<PricingTier, number> = {
  free: 5,       // 5 NIS/month
  pro: 50,       // 50 NIS/month
  business: 200, // 200 NIS/month
};

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export interface MonthlyUsage {
  totalTokens: number;
  totalCostNIS: number;
  callCount: number;
  monthKey: string;
}

export function getMonthlyUsage(): MonthlyUsage {
  const month = currentMonthKey();
  const history = getUsageHistory();
  const monthRecords = history.filter((r) => r.timestamp.startsWith(month));
  return {
    totalTokens: monthRecords.reduce((sum, r) => sum + r.tokensUsed, 0),
    totalCostNIS: Math.round(monthRecords.reduce((sum, r) => sum + r.costNIS, 0) * 100) / 100,
    callCount: monthRecords.length,
    monthKey: month,
  };
}

export function getMonthlyCap(pricingTier: PricingTier): number {
  return MONTHLY_CAPS[pricingTier] ?? MONTHLY_CAPS.free;
}

export function isOverMonthlyBudget(pricingTier: PricingTier): boolean {
  const usage = getMonthlyUsage();
  return usage.totalCostNIS >= getMonthlyCap(pricingTier);
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
