// Deterministic 0-100 moat score from a BusinessSpec.
// Applies the four-dimension moat model from lessons/saas/spec/07-moat.md.

import type { BusinessSpec, MoatScore } from "./types";

export function computeMoatScore(spec: BusinessSpec): MoatScore {
  const clarity = scoreClarity(spec);
  const differentiation = scoreDifferentiation(spec);
  const urgency = scoreUrgency(spec);
  const conviction = scoreConviction(spec);
  const total = clarity + differentiation + urgency + conviction;

  return {
    total,
    clarity,
    differentiation,
    urgency,
    conviction,
    label:
      total >= 85 ? "fortress"
      : total >= 65 ? "strong"
      : total >= 40 ? "developing"
      : "weak",
  };
}

function scoreClarity(spec: BusinessSpec): number {
  let pts = 0;
  if (spec.offer.trim().length >= 30) pts += 10;
  else if (spec.offer.trim().length >= 15) pts += 5;
  if (spec.icp.trim().length >= 20) pts += 8;
  else if (spec.icp.trim().length >= 10) pts += 4;
  if (spec.pricePoint.trim().length >= 3) pts += 7;
  return Math.min(pts, 25);
}

function scoreDifferentiation(spec: BusinessSpec): number {
  let pts = 0;
  const named = spec.competitors.filter((c) => c.name.trim()).length;
  if (named >= 1) pts += 7;
  if (named >= 2) pts += 5;
  if (spec.differentiator.trim().length >= 30) pts += 13;
  else if (spec.differentiator.trim().length >= 15) pts += 7;
  return Math.min(pts, 25);
}

function scoreUrgency(spec: BusinessSpec): number {
  const scores: Record<string, number> = {
    churn: 25,
    conversion: 22,
    leads: 20,
    pricing: 20,
    delivery: 18,
  };
  return scores[spec.bottleneck] ?? 15;
}

function scoreConviction(spec: BusinessSpec): number {
  let pts = 0;
  const wc = spec.winCondition.toLowerCase();
  if (wc.length >= 40) pts += 10;
  else if (wc.length >= 20) pts += 6;
  const quantifiers = [
    "$", "%", "mrr", "arr", "revenue", "customers", "leads",
    "users", "churn", "conversion", "deals", "pipeline",
    "retention", "×", "x ",
  ];
  if (quantifiers.some((q) => wc.includes(q))) pts += 15;
  else pts += 5;
  return Math.min(pts, 25);
}
