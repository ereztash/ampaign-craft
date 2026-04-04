import { FunnelResult } from "@/types/funnel";
import { UserProfile } from "@/contexts/UserProfileContext";

export interface TabConfig {
  id: string;
  labelKey: string;
  visible: boolean;
  priority: number; // lower = shown first
  badge?: { he: string; en: string };
  simplifiedMode?: boolean; // true = show beginner-friendly simplified view
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

    // Hooks — visible to all; beginners get simplified 3-hook view
    {
      id: "hooks",
      labelKey: "tabHooks",
      visible: true,
      priority: isBeginner ? 55 : formData.mainGoal === "awareness" ? 15 : 50,
      badge: !isBeginner && formData.mainGoal === "awareness" ? { he: "מומלץ", en: "Key" } : undefined,
      simplifiedMode: isBeginner,
    },

    // Copy Lab — visible to all; beginners get 2 basic formulas
    {
      id: "copylab",
      labelKey: "tabCopyLab",
      visible: true,
      priority: isBeginner ? 60 : 55,
      simplifiedMode: isBeginner,
    },

    // Neuro-Storytelling — visible to all (if data exists); beginners get simplified emotions view
    {
      id: "neurostory",
      labelKey: "tabNeuroStory",
      visible: !!result.neuroStorytelling,
      priority: isBeginner ? 65 : 60,
      simplifiedMode: isBeginner,
    },

    // Brand DNA — only for personal brands/services, visible to all segments
    {
      id: "branddna",
      labelKey: "tabBrandDna",
      visible: showBrandDna,
      priority: showBrandDna && isIntermediate ? 12 : isBeginner ? 70 : 999,
      badge: showBrandDna && isIntermediate ? { he: "מומלץ", en: "Recommended" } : undefined,
      simplifiedMode: isBeginner,
    },

    // Monitor — visible to all; beginners get guided intro
    {
      id: "monitor",
      labelKey: "tabMonitor",
      visible: true,
      priority: isAdvanced ? 8 : isBeginner ? 75 : 80,
      badge: isAdvanced ? { he: "מומלץ", en: "Key" } : undefined,
      simplifiedMode: isBeginner,
    },

    // Data import/analysis — visible to all; critical for all segments
    {
      id: "data",
      labelKey: "tabData",
      visible: true,
      priority: isAdvanced ? 9 : isBeginner ? 50 : 85,
      badge: isAdvanced ? { he: "חדש", en: "New" } : isBeginner ? { he: "נתונים", en: "Data" } : undefined,
      simplifiedMode: isBeginner,
    },

    // Stylome Extractor — personal style fingerprint + system prompt
    {
      id: "stylome",
      labelKey: "tabStylome",
      visible: true,
      priority: isBeginner ? 52 : isAdvanced ? 45 : 56,
      badge: { he: "חדש", en: "New" },
      simplifiedMode: isBeginner,
    },
  ];

  return tabs
    .filter((tab) => tab.visible)
    .sort((a, b) => a.priority - b.priority);
}
