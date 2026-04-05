import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/i18n/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TabConfig } from "@/lib/adaptiveTabRules";

interface AdaptiveTabNavProps {
  tabs: TabConfig[];
}

const AdaptiveTabNav = ({ tabs }: AdaptiveTabNavProps) => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();

  const tabsList = (
    <TabsList className={`${isMobile ? "inline-flex w-max" : "flex w-full"} gap-1`}>
      {tabs.map((tab) => (
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
  );

  if (isMobile) {
    return (
      <ScrollArea className="w-full whitespace-nowrap">
        {tabsList}
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  }

  return tabsList;
};

export default AdaptiveTabNav;
