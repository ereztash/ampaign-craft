import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Feature, PricingTier } from "@/lib/pricingTiers";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { canAccessByData, getDataUnlockHint } from "@/lib/dataGates";

/**
 * Hook for feature-gated access. Returns gate check + paywall state.
 *
 * Access is granted if the user's monetary tier allows it (canUse) OR if the
 * user has earned it through data they provided to the system (canAccessByData).
 * This creates a progressive disclosure incentive loop orthogonal to payment.
 */
export function useFeatureGate() {
  const { canUse, tier } = useAuth();
  const { profile } = useUserProfile();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<Feature>("maxFunnels");
  const [paywallTier, setPaywallTier] = useState<PricingTier>("pro");
  const [dataUnlockHint, setDataUnlockHint] = useState<{ he: string; en: string } | null>(null);

  const checkAccess = useCallback((feature: Feature, requiredTier: PricingTier = "pro"): boolean => {
    if (canUse(feature)) return true;
    if (canAccessByData(profile.milestones, profile.investment, feature)) return true;
    setPaywallFeature(feature);
    setPaywallTier(requiredTier);
    setDataUnlockHint(getDataUnlockHint(feature));
    setPaywallOpen(true);
    return false;
  }, [canUse, profile.milestones, profile.investment]);

  return {
    tier,
    canUse,
    checkAccess,
    paywallOpen,
    setPaywallOpen,
    paywallFeature,
    paywallTier,
    dataUnlockHint,
  };
}
