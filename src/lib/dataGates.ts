import type { OnboardingMilestones, InvestmentMetrics } from "@/contexts/UserProfileContext";
import type { Feature } from "@/lib/pricingTiers";

/**
 * Data-based feature access gate.
 *
 * Returns true when the user has earned access through data they provided
 * to the system — independent of their monetary subscription tier.
 *
 * The intent: reward users who invest in the product with capability unlocks,
 * creating a progressive disclosure incentive loop that is orthogonal to
 * the paywall. A user who connects a data source AND has a saved plan gets
 * free AI Coach access; they need not pay for it upfront.
 */
export function canAccessByData(
  milestones: OnboardingMilestones,
  investment: InvestmentMetrics,
  feature: Feature,
): boolean {
  switch (feature) {
    case "aiCoachMessages":
      // 5 free AI Coach messages when user has saved a plan AND connected a data source
      return milestones.firstPlanSaved && milestones.dataSourceConnected;

    case "pdfExport":
      // PDF export unlocked when user has created 3+ plans
      return investment.plansCreated >= 3;

    case "campaignCockpit":
      // Read-only Cockpit preview when user has 3+ plans and 2+ modules completed
      return investment.plansCreated >= 3 && investment.modulesCompleted >= 2;

    default:
      return false;
  }
}

/**
 * Returns a human-readable message describing what data action unlocks the feature.
 * Used by the paywall modal to show a data-path alternative to paying.
 */
export function getDataUnlockHint(
  feature: Feature,
): { he: string; en: string } | null {
  switch (feature) {
    case "aiCoachMessages":
      return {
        he: "חבר מקור נתונים ושמור תוכנית ראשונה כדי לקבל 5 הודעות חינם",
        en: "Connect a data source and save your first plan to get 5 free messages",
      };
    case "pdfExport":
      return {
        he: "צור 3 תוכניות כדי לפתוח ייצוא PDF",
        en: "Create 3 plans to unlock PDF export",
      };
    case "campaignCockpit":
      return {
        he: "צור 3 תוכניות והשלם 2 מודולים לפריביו של Campaign Cockpit",
        en: "Create 3 plans and complete 2 modules for a Campaign Cockpit preview",
      };
    default:
      return null;
  }
}
