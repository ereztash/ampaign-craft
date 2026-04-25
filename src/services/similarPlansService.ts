// ═══════════════════════════════════════════════
// Similar Plans Service
//
// Surfaces plans most similar to a given plan in the learned projection
// space (sslEmbeddingEngine). Feeds Loop 7: user clicks on a suggestion
// are recorded as hard positives for the next training epoch via
// captureSSLPick().
//
// Usage:
//   const plans = await getSimilarPlans(planId, userId);
//   // Render results; on click call captureSSLPick(planId, clickedPlanId, userId)
// ═══════════════════════════════════════════════

import { getSimilarPlans as _getSimilarPlans, type SimilarPlan } from "@/engine/sslEmbeddingEngine";
import { captureRecommendationShown, captureVariantPick } from "@/engine/outcomeLoopEngine";

export type { SimilarPlan };

// ───────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────

/**
 * Return up to k plans most similar to planId in projected embedding space.
 * Returns an empty array when the SSL projection is not yet trained or
 * when the user has fewer than 2 plans with embeddings.
 */
export async function getSimilarPlans(
  planId: string,
  userId: string,
  k = 5,
): Promise<SimilarPlan[]> {
  return _getSimilarPlans(planId, userId, k);
}

/**
 * Record that a similar-plan suggestion was shown (Loop 7 — recommendation side).
 * Returns the recommendation ID for use with captureSSLPick().
 */
export function captureSSLShown(
  planId: string,
  userId: string | null,
  archetypeId: string,
  confidenceTier: string,
  similarCount: number,
): string {
  return captureRecommendationShown({
    user_id:          userId,
    archetype_id:     archetypeId,
    confidence_tier:  confidenceTier,
    source:           "ssl_similar",
    action_id:        planId,
    action_label_en:  "Similar plan suggestion",
    context_snapshot: { similar_count: similarCount },
  });
}

/**
 * Record a user's interaction with a similar-plan suggestion (Loop 7 — pick side).
 *
 * choice:
 *   "primary"   — user opened / cloned the suggested plan  (strong positive signal)
 *   "variation" — user hovered / inspected it              (soft positive signal)
 *   "skip"      — user dismissed the suggestions block     (negative signal)
 */
export function captureSSLPick(
  recommendationId: string,
  choice: "primary" | "variation" | "skip",
  position: number,
  userId: string | null,
  hoverMs: number | null = null,
): void {
  captureVariantPick(recommendationId, choice, position, userId, hoverMs);
}
