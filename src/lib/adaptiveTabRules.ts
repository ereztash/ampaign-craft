import { FunnelResult } from "@/types/funnel";
import { UserProfile } from "@/contexts/UserProfileContext";

export interface TabConfig {
  id: string;
  labelKey: string;
  visible: boolean;
  priority: number; // lower = shown first
  badge?: { he: string; en: string };
  simplifiedMode?: boolean; // true = show beginner-friendly simplified view
  group?: "strategy" | "content" | "growth"; // super-tab grouping
}

/**
 * MECE Segment-based tab configuration with progressive disclosure:
 * ALL tabs visible to ALL users. Beginners get simplified views (simplifiedMode: true).
 * - Segment A (Builder/Beginner): All tabs, Tips promoted, advanced tabs in simplified mode.
 * - Segment B (Amplifier/Intermediate): All tabs, Brand DNA promoted, full views.
 * - Segment C (Analyst/Advanced): All tabs, Monitor & Data promoted, full views.
 */
export function getTabConfig(result: FunnelResult, profile: UserProfile): TabConfig[] {
  const { formData } = result;
  const showBrandDna =
    formData.businessField === "personalBrand" || formData.businessField === "services";
  const isAdvanced = formData.experienceLevel === "advanced";
  const isIntermediate = formData.experienceLevel === "intermediate";
  const isBeginner = formData.experienceLevel === "beginner" || formData.experienceLevel === "";

  const tabs: TabConfig[] = [
    // Strategy — core funnel + channels + Israeli tools + tips (collapsible)
    {
      id: "strategy",
      labelKey: "tabStrategy",
      visible: true,
      priority: 10,
      group: "strategy",
    },

    // Planning — budget charts + KPIs + Israeli benchmarks
    {
      id: "planning",
      labelKey: "tabPlanning",
      visible: true,
      priority: formData.mainGoal === "sales" ? 15 : 30,
      badge: formData.mainGoal === "sales" ? { he: "מומלץ", en: "Key" } : undefined,
      group: "strategy",
    },

    // Content — hooks + Copy Lab + Neuro-Story (nested sub-tabs)
    {
      id: "content",
      labelKey: "tabContent",
      visible: true,
      priority: isBeginner ? 40 : formData.mainGoal === "awareness" ? 15 : 50,
      badge: !isBeginner && formData.mainGoal === "awareness" ? { he: "מומלץ", en: "Key" } : undefined,
      simplifiedMode: isBeginner,
      group: "content",
    },

    // Analytics — Meta monitor + Data import/analysis
    {
      id: "analytics",
      labelKey: "tabAnalytics",
      visible: true,
      priority: isAdvanced ? 8 : isBeginner ? 55 : 60,
      badge: isAdvanced ? { he: "מומלץ", en: "Key" } : undefined,
      simplifiedMode: isBeginner,
      group: "strategy",
    },

    // Brand DNA — conditional: personal brands/services only
    {
      id: "branddna",
      labelKey: "tabBrandDna",
      visible: showBrandDna,
      priority: showBrandDna && isIntermediate ? 12 : isBeginner ? 70 : 999,
      badge: showBrandDna && isIntermediate ? { he: "מומלץ", en: "Recommended" } : undefined,
      simplifiedMode: isBeginner,
      group: "content",
    },

    // Sales — pipeline, forecasting, objection scripts, automations
    {
      id: "sales",
      labelKey: "tabSales",
      visible: true,
      priority: formData.mainGoal === "sales" || formData.mainGoal === "leads" ? 12 : 35,
      group: "growth",
      badge: formData.mainGoal === "sales" || formData.mainGoal === "leads"
        ? { he: "חדש!", en: "New!" }
        : { he: "חדש", en: "New" },
      simplifiedMode: isBeginner,
    },

    // Pricing Intelligence — pricing model, tiers, offer stack, guarantee
    {
      id: "pricing",
      labelKey: "tabPricing",
      visible: true,
      priority: formData.mainGoal === "sales" ? 14 : 40,
      simplifiedMode: isBeginner,
      group: "growth",
    },

    // Retention & Growth — onboarding, churn prevention, referrals, loyalty
    {
      id: "retention",
      labelKey: "tabRetention",
      visible: true,
      priority: formData.salesModel === "subscription" ? 13 : formData.mainGoal === "loyalty" ? 15 : 45,
      simplifiedMode: isBeginner,
      group: "growth",
    },

    // Stylome — personal style fingerprint + system prompt
    {
      id: "stylome",
      labelKey: "tabStylome",
      visible: true,
      priority: isBeginner ? 52 : isAdvanced ? 45 : 56,
      simplifiedMode: isBeginner,
      group: "content",
    },
  ];

  return tabs
    .filter((tab) => tab.visible)
    .sort((a, b) => a.priority - b.priority);
}
