import { BusinessFingerprint } from "@/engine/businessFingerprintEngine";
import { FunnelResult } from "@/types/funnel";
import { UserProfile } from "@/contexts/UserProfileContext";
import type { ArchetypeUIConfig, ConfidenceTier, TabId } from "@/types/archetype";

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
export interface ArchetypeTabOverride {
  config: ArchetypeUIConfig;
  tier: ConfidenceTier;
}

export function getTabConfig(
  result: FunnelResult,
  profile: UserProfile,
  archetypeOverride?: ArchetypeTabOverride | null,
): TabConfig[] {
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

    // Executive Brief — one-page C-suite risk + NRR + action checklist
    {
      id: "brief",
      labelKey: "tabBrief",
      visible: !isBeginner,
      priority: isAdvanced ? 20 : 47,
      badge: isAdvanced ? { he: "חדש!", en: "New!" } : { he: "חדש", en: "New" },
      group: "strategy",
    },
  ];

  const baseTabs = tabs.filter((tab) => tab.visible);

  // Apply archetype priority overrides at "confident" and "strong" tiers
  if (
    archetypeOverride &&
    (archetypeOverride.tier === "confident" || archetypeOverride.tier === "strong")
  ) {
    const overrides = archetypeOverride.config.tabPriorityOverrides;
    return baseTabs
      .map((tab) => ({
        ...tab,
        priority: overrides[tab.id as TabId] ?? tab.priority,
      }))
      .sort((a, b) => a.priority - b.priority);
  }

  return baseTabs.sort((a, b) => a.priority - b.priority);
}

export function getTabConfigFromFingerprint(fp: BusinessFingerprint): TabConfig[] {
  const isSimple = fp.ux.complexity === "simple";
  const isAdvanced = fp.ux.complexity === "advanced";
  const showBrandDna = fp.archetype === "creator-economy" || fp.archetype === "local-b2c-service";

  const isEmphasis = (id: string) => fp.ux.emphasisTabs.includes(id);
  const isSimplified = (id: string) => fp.ux.simplifiedTabs.includes(id);

  const tabs: TabConfig[] = [
    { id: "strategy", labelKey: "tabStrategy", visible: true, priority: 10, group: "strategy" },
    { id: "planning", labelKey: "tabPlanning", visible: true, priority: isEmphasis("planning") ? 12 : 30, badge: isEmphasis("planning") ? { he: "מומלץ", en: "Key" } : undefined, group: "strategy" },
    { id: "content", labelKey: "tabContent", visible: true, priority: isEmphasis("content") ? 15 : 50, badge: isEmphasis("content") ? { he: "מומלץ", en: "Key" } : undefined, simplifiedMode: isSimplified("content"), group: "content" },
    { id: "analytics", labelKey: "tabAnalytics", visible: true, priority: isAdvanced ? 8 : isSimple ? 55 : 60, badge: isAdvanced ? { he: "מומלץ", en: "Key" } : undefined, simplifiedMode: isSimplified("analytics"), group: "strategy" },
    { id: "branddna", labelKey: "tabBrandDna", visible: showBrandDna, priority: isEmphasis("branddna") ? 12 : 70, badge: isEmphasis("branddna") ? { he: "מומלץ", en: "Recommended" } : undefined, simplifiedMode: isSimplified("branddna"), group: "content" },
    { id: "sales", labelKey: "tabSales", visible: true, priority: isEmphasis("sales") ? 12 : 35, badge: isEmphasis("sales") ? { he: "מומלץ", en: "Key" } : undefined, simplifiedMode: isSimplified("sales"), group: "growth" },
    { id: "pricing", labelKey: "tabPricing", visible: true, priority: isEmphasis("pricing") ? 14 : 40, simplifiedMode: isSimplified("pricing"), group: "growth" },
    { id: "retention", labelKey: "tabRetention", visible: true, priority: isEmphasis("retention") ? 13 : 45, simplifiedMode: isSimplified("retention"), group: "growth" },
    { id: "stylome", labelKey: "tabStylome", visible: true, priority: isSimple ? 52 : isAdvanced ? 45 : 56, simplifiedMode: isSimplified("stylome"), group: "content" },
  ];

  return tabs.filter((tab) => tab.visible).sort((a, b) => a.priority - b.priority);
}
