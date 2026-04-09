// ═══════════════════════════════════════════════
// A/B Testing Engine — Experiment Management
// Supports deterministic variant assignment, conversion tracking,
// and statistical significance calculation.
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export type ExperimentStatus = "draft" | "running" | "paused" | "completed";

export interface Variant {
  id: string;
  name: string;
  weight: number; // 0-1, all weights in an experiment must sum to 1
  description?: string;
}

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  variants: Variant[];
  status: ExperimentStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  targetSampleSize?: number;
}

export interface ConversionRecord {
  userId: string;
  experimentId: string;
  variantId: string;
  metric: string;
  value: number;
  recordedAt: string;
}

export interface VariantResult {
  variantId: string;
  variantName: string;
  participants: number;
  conversions: number;
  conversionRate: number;
  totalValue: number;
  avgValue: number;
}

export interface ExperimentResult {
  experimentId: string;
  totalParticipants: number;
  variantResults: VariantResult[];
  isSignificant: boolean;
  pValue: number;
  confidenceLevel: number;
  winningVariantId: string | null;
  lift: number; // percentage improvement of winner over control
}

// ═══════════════════════════════════════════════
// VARIANT ASSIGNMENT
// ═══════════════════════════════════════════════

/**
 * Simple string hash (djb2) for deterministic variant assignment.
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Deterministically assign a user to a variant based on userId + experimentId.
 * The same user always gets the same variant for a given experiment.
 */
export function assignVariant(userId: string, experiment: Experiment): Variant {
  if (experiment.variants.length === 0) {
    throw new Error("Experiment has no variants");
  }

  if (experiment.variants.length === 1) {
    return experiment.variants[0];
  }

  const hash = hashString(`${userId}:${experiment.id}`);
  const normalized = (hash % 10000) / 10000; // 0-0.9999

  let cumulative = 0;
  for (const variant of experiment.variants) {
    cumulative += variant.weight;
    if (normalized < cumulative) {
      return variant;
    }
  }

  // Fallback to last variant (handles floating-point edge case)
  return experiment.variants[experiment.variants.length - 1];
}

// ═══════════════════════════════════════════════
// EXPERIMENT CREATION
// ═══════════════════════════════════════════════

/**
 * Create a simple A/B experiment with two equally-weighted variants.
 */
export function createABExperiment(
  id: string,
  name: string,
  controlName = "Control",
  treatmentName = "Treatment"
): Experiment {
  return {
    id,
    name,
    variants: [
      { id: `${id}_control`, name: controlName, weight: 0.5 },
      { id: `${id}_treatment`, name: treatmentName, weight: 0.5 },
    ],
    status: "draft",
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create a multi-variant experiment with custom weights.
 */
export function createMultiVariantExperiment(
  id: string,
  name: string,
  variants: { name: string; weight: number }[]
): Experiment {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  if (Math.abs(totalWeight - 1) > 0.001) {
    throw new Error(`Variant weights must sum to 1, got ${totalWeight}`);
  }

  return {
    id,
    name,
    variants: variants.map((v, i) => ({
      id: `${id}_v${i}`,
      name: v.name,
      weight: v.weight,
    })),
    status: "draft",
    createdAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════
// RESULT CALCULATION
// ═══════════════════════════════════════════════

/**
 * Calculate experiment results from assignment and conversion data.
 */
export function calculateExperimentResults(
  experiment: Experiment,
  assignments: { userId: string; variantId: string }[],
  conversions: ConversionRecord[]
): ExperimentResult {
  const variantResults: VariantResult[] = experiment.variants.map((variant) => {
    const participants = assignments.filter((a) => a.variantId === variant.id).length;
    const variantConversions = conversions.filter((c) => c.variantId === variant.id);
    const uniqueConverters = new Set(variantConversions.map((c) => c.userId)).size;
    const totalValue = variantConversions.reduce((sum, c) => sum + c.value, 0);

    return {
      variantId: variant.id,
      variantName: variant.name,
      participants,
      conversions: uniqueConverters,
      conversionRate: participants > 0 ? uniqueConverters / participants : 0,
      totalValue,
      avgValue: uniqueConverters > 0 ? totalValue / uniqueConverters : 0,
    };
  });

  const totalParticipants = variantResults.reduce((sum, v) => sum + v.participants, 0);

  // Calculate chi-squared statistic for significance
  const { isSignificant, pValue } = chiSquaredTest(variantResults);

  // Find winning variant
  const sorted = [...variantResults].sort((a, b) => b.conversionRate - a.conversionRate);
  const winner = sorted[0];
  const control = variantResults[0]; // First variant is typically control

  const lift =
    control.conversionRate > 0
      ? ((winner.conversionRate - control.conversionRate) / control.conversionRate) * 100
      : 0;

  return {
    experimentId: experiment.id,
    totalParticipants,
    variantResults,
    isSignificant,
    pValue,
    confidenceLevel: 1 - pValue,
    winningVariantId: isSignificant ? winner.variantId : null,
    lift: round(lift, 2),
  };
}

// ═══════════════════════════════════════════════
// STATISTICAL TESTS
// ═══════════════════════════════════════════════

/**
 * Chi-squared test for independence on conversion rates.
 * Returns whether the result is statistically significant at p < 0.05.
 */
function chiSquaredTest(results: VariantResult[]): { isSignificant: boolean; pValue: number } {
  if (results.length < 2) return { isSignificant: false, pValue: 1 };

  const totalParticipants = results.reduce((s, r) => s + r.participants, 0);
  const totalConversions = results.reduce((s, r) => s + r.conversions, 0);

  if (totalParticipants === 0 || totalConversions === 0) {
    return { isSignificant: false, pValue: 1 };
  }

  const overallRate = totalConversions / totalParticipants;

  let chiSquared = 0;
  for (const result of results) {
    if (result.participants === 0) continue;

    const expectedConversions = result.participants * overallRate;
    const expectedNonConversions = result.participants * (1 - overallRate);

    if (expectedConversions > 0) {
      chiSquared +=
        Math.pow(result.conversions - expectedConversions, 2) / expectedConversions;
    }
    if (expectedNonConversions > 0) {
      const nonConversions = result.participants - result.conversions;
      chiSquared +=
        Math.pow(nonConversions - expectedNonConversions, 2) / expectedNonConversions;
    }
  }

  const df = results.length - 1;
  const pValue = 1 - chiSquaredCDF(chiSquared, df);

  return {
    isSignificant: pValue < 0.05,
    pValue: round(pValue, 4),
  };
}

/**
 * Approximate chi-squared CDF using the regularized gamma function.
 * Good enough for experiment analysis (df typically 1-4).
 */
function chiSquaredCDF(x: number, df: number): number {
  if (x <= 0) return 0;

  const k = df / 2;
  const xHalf = x / 2;

  // Use series expansion of lower incomplete gamma function
  let sum = 0;
  let term = 1 / k;
  sum += term;

  for (let n = 1; n < 100; n++) {
    term *= xHalf / (k + n);
    sum += term;
    if (term < 1e-10) break;
  }

  return sum * Math.exp(-xHalf + k * Math.log(xHalf) - logGamma(k));
}

/**
 * Log-gamma function (Stirling's approximation for the gamma function).
 */
function logGamma(z: number): number {
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  z -= 1;
  const coefficients = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let x = 0.99999999999980993;
  for (let i = 0; i < coefficients.length; i++) {
    x += coefficients[i] / (z + 1 + i);
  }
  const t = z + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
