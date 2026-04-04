import { FunnelResult } from "@/types/funnel";
import { UserProfile } from "@/contexts/UserProfileContext";

export interface TabConfig {
  id: string;
  labelKey: string;
  visible: boolean;
  priority: number; // lower = shown first
  badge?: { he: string; en: string };
}

/**
 * MECE Segment-based tab configuration:
 * - Segment A (Builder/Beginner): Strategy, Budget, KPIs, Tips only. Hide advanced tabs.
 * - Segment B (Amplifier/Intermediate): All tabs, Brand DNA promoted, Copy Lab & Neuro-Story available.
 * - Segment C (Analyst/Advanced): All tabs, Monitor & Data promoted.
 */
export function getTabConfig(result: FunnelResult, profile: UserProfile): TabConfig[] {
  const { formData } = result;
  const showBrandDna =
    formData.businessField === "personalBrand" || formData.businessField === "services";
  const isAdvanced = formData.experienceLevel === "advanced";
  const isIntermediate = formData.experienceLevel === "intermediate";
  const isBeginner = formData.experienceLevel === "beginner" || formData.experienceLevel === "";

  const tabs: TabConfig[] = [
    // Always visible
    {
      id: "strategy",
      labelKey: "tabStrategy",
      visible: true,
      priority: 10,
    },
    {
      id: "budget",
      labelKey: "tabBudget",
      visible: true,
      priority: formData.mainGoal === "sales" ? 15 : 30,
      badge: formData.mainGoal === "sales" ? { he: "מומלץ", en: "Key" } : undefined,
    },
    {
      id: "kpis",
      labelKey: "tabKpis",
      visible: true,
      priority: 40,
    },
    {
      id: "tips",
      labelKey: "tabTips",
      visible: true,
      priority: isBeginner ? 15 : 70,
      badge: isBeginner ? { he: "התחל כאן", en: "Start Here" } : undefined,
    },

    // Segment B+C: Hooks (hidden for beginners — too complex without context)
    {
      id: "hooks",
      labelKey: "tabHooks",
      visible: !isBeginner,
      priority: formData.mainGoal === "awareness" ? 15 : 50,
      badge: formData.mainGoal === "awareness" ? { he: "מומלץ", en: "Key" } : undefined,
    },

    // Segment B+C: Copy Lab (hidden for beginners — neurocopywriting requires knowledge)
    {
      id: "copylab",
      labelKey: "tabCopyLab",
      visible: !isBeginner,
      priority: 55,
    },

    // Segment B+C: Neuro-Storytelling (hidden for beginners)
    {
      id: "neurostory",
      labelKey: "tabNeuroStory",
      visible: !isBeginner && !!result.neuroStorytelling,
      priority: 60,
    },

    // Segment B: Brand DNA (only for personal brands/services, promoted for intermediates)
    {
      id: "branddna",
      labelKey: "tabBrandDna",
      visible: showBrandDna && !isBeginner,
      priority: showBrandDna && isIntermediate ? 12 : 999,
      badge: showBrandDna && isIntermediate ? { he: "מומלץ", en: "Recommended" } : undefined,
    },

    // Segment C: Monitor (hidden for beginners — requires Meta Ads)
    {
      id: "monitor",
      labelKey: "tabMonitor",
      visible: !isBeginner,
      priority: isAdvanced ? 8 : 80,
      badge: isAdvanced ? { he: "מומלץ", en: "Key" } : undefined,
    },

    // Segment C: Data import/analysis (hidden for beginners)
    {
      id: "data",
      labelKey: "tabData",
      visible: !isBeginner,
      priority: isAdvanced ? 9 : 85,
      badge: isAdvanced ? { he: "חדש", en: "New" } : undefined,
    },
  ];

  return tabs
    .filter((tab) => tab.visible)
    .sort((a, b) => a.priority - b.priority);
}
