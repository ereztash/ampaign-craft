// ═══════════════════════════════════════════════
// Tier Types — Canonical subscription tier definitions
//
// This file is the single source of truth for tier names.
// All PaywallModal, create-checkout, AuthContext, and quota
// enforcement code must import from here.
// ═══════════════════════════════════════════════

export type Tier = "free" | "pro" | "business";

export const ALL_TIERS: readonly Tier[] = ["free", "pro", "business"] as const;

export const TIER_DISPLAY_NAMES: Record<Tier, string> = {
  free: "Free",
  pro: "Pro",
  business: "Business",
};
