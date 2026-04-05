import { useState } from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/i18n/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { TabConfig } from "@/lib/adaptiveTabRules";
import { BarChart3, FileText, TrendingUp } from "lucide-react";

interface AdaptiveTabNavProps {
  tabs: TabConfig[];
}

const GROUP_CONFIG = {
  strategy: { labelKey: "groupStrategy", icon: BarChart3, color: "text-primary" },
  content: { labelKey: "groupContent", icon: FileText, color: "text-purple-500" },
  growth: { labelKey: "groupGrowth", icon: TrendingUp, color: "text-accent" },
} as const;

const GROUP_ORDER: (keyof typeof GROUP_CONFIG)[] = ["strategy", "content", "growth"];

const AdaptiveTabNav = ({ tabs }: AdaptiveTabNavProps) => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();
  const [activeGroup, setActiveGroup] = useState<string>("strategy");

  // Group tabs by super-tab
  const groups = GROUP_ORDER.map((groupId) => ({
    id: groupId,
    ...GROUP_CONFIG[groupId],
    tabs: tabs.filter((tab) => tab.group === groupId),
  })).filter((g) => g.tabs.length > 0);

  const activeGroupTabs = groups.find((g) => g.id === activeGroup)?.tabs || tabs;

  return (
    <div className="space-y-2">
      {/* Super-tab group selector */}
      <div className="flex gap-1 border-b border-border pb-2">
        {groups.map((group) => {
          const Icon = group.icon;
          const isActive = activeGroup === group.id;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => setActiveGroup(group.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? group.color : ""}`} />
              {t(group.labelKey as any)}
              {group.tabs.some((tab) => tab.badge) && (
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-tabs within active group */}
      <TabsList className={`${isMobile ? "inline-flex w-max" : "flex w-full"} gap-1 h-auto bg-transparent`}>
        {activeGroupTabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="relative shrink-0 gap-1.5 text-xs sm:text-sm"
          >
            {t(tab.labelKey as any)}
            {tab.badge && (
              <Badge
                variant="secondary"
                className="ml-1 h-4 px-1 text-xs leading-none bg-accent/20 text-accent-foreground"
              >
                {tab.badge[language]}
              </Badge>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
};

export default AdaptiveTabNav;
