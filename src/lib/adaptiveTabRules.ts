import { FunnelResult } from "@/types/funnel";
import { UserProfile } from "@/contexts/UserProfileContext";

export interface TabConfig {
  id: string;
  labelKey: string;
  visible: boolean;
  priority: number; // lower = shown first
  badge?: { he: string; en: string };
}

export function getTabConfig(result: FunnelResult, profile: UserProfile): TabConfig[] {
  const { formData } = result;
  const showBrandDna =
    formData.businessField === "personalBrand" || formData.businessField === "services";
  const isAdvanced = formData.experienceLevel === "advanced";
  const isBeginner = formData.experienceLevel === "beginner";

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
      id: "hooks",
      labelKey: "tabHooks",
      visible: true,
      priority: formData.mainGoal === "awareness" ? 15 : 50,
      badge: formData.mainGoal === "awareness" ? { he: "מומלץ", en: "Key" } : undefined,
    },
    {
      id: "copylab",
      labelKey: "tabCopyLab",
      visible: true,
      priority: 55,
    },
    {
      id: "neurostory",
      labelKey: "tabNeuroStory",
      visible: !!result.neuroStorytelling,
      priority: 60,
    },
    {
      id: "branddna",
      labelKey: "tabBrandDna",
      visible: showBrandDna,
      priority: showBrandDna ? 12 : 999,
      badge: showBrandDna ? { he: "מומלץ", en: "Recommended" } : undefined,
    },
    {
      id: "tips",
      labelKey: "tabTips",
      visible: true,
      priority: isBeginner ? 15 : 70,
      badge: isBeginner ? { he: "התחל כאן", en: "Start Here" } : undefined,
    },
    {
      id: "monitor",
      labelKey: "tabMonitor",
      visible: true,
      priority: isAdvanced ? 8 : 80,
    },
    {
      id: "data",
      labelKey: "tabData",
      visible: true,
      priority: isAdvanced ? 9 : 85,
      badge: isAdvanced ? { he: "חדש", en: "New" } : undefined,
    },
  ];

  return tabs
    .filter((tab) => tab.visible)
    .sort((a, b) => a.priority - b.priority);
}
