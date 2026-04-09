import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import InsightCard, { InsightVariant } from "@/components/InsightCard";
import type { Bottleneck } from "@/engine/bottleneckEngine";
import { getRecommendedNextStep } from "@/engine/nextStepEngine";
import type { WeeklyPulse } from "@/engine/pulseEngine";
import type { UserKnowledgeGraph } from "@/engine/userKnowledgeGraph";

interface FeedItem {
  id: string;
  variant: InsightVariant;
  title: string;
  description: string;
  route: string;
}

interface InsightFeedProps {
  bottlenecks: Bottleneck[];
  pulse: WeeklyPulse | null;
  graph: UserKnowledgeGraph;
  hasDiff: boolean;
  planCount: number;
  masteryFeatures: Set<string>;
}

const moduleRoute: Record<Bottleneck["module"], string> = {
  differentiation: "/differentiate",
  marketing: "/wizard",
  sales: "/sales",
  pricing: "/pricing",
  retention: "/retention",
};

const InsightFeed = ({ bottlenecks, pulse, graph, hasDiff, planCount, masteryFeatures }: InsightFeedProps) => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const items = useMemo(() => {
    const list: FeedItem[] = [];

    for (const b of bottlenecks.slice(0, 4)) {
      list.push({
        id: b.id,
        variant: b.severity === "critical" ? "bottleneck" : b.severity === "warning" ? "module" : "opportunity",
        title: b.title[language],
        description: b.description[language],
        route: moduleRoute[b.module],
      });
    }

    const next = getRecommendedNextStep(graph, hasDiff, planCount, masteryFeatures);
    list.push({
      id: "next-step",
      variant: "module",
      title: next.title[language],
      description: next.description[language],
      route: next.route,
    });

    if (pulse) {
      list.push({
        id: "pulse-insight",
        variant: "pulse",
        title: pulse.greeting[language],
        description: pulse.insightOfTheWeek[language],
        route: "/strategy",
      });
      if (pulse.lossFramedMessages[0]) {
        list.push({
          id: "pulse-loss",
          variant: "pulse",
          title: language === "he" ? "תזכורת" : "Reminder",
          description: pulse.lossFramedMessages[0].message[language],
          route: "/wizard",
        });
      }
    }

    return list;
  }, [bottlenecks, pulse, graph, hasDiff, planCount, masteryFeatures, language]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-foreground px-1" dir="auto">
        {language === "he" ? "זרם תובנות" : "Intelligence feed"}
      </h2>
      <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pe-1">
        {items.map((item) => (
          <InsightCard
            key={item.id}
            language={language}
            variant={item.variant}
            title={item.title}
            description={item.description}
            onClick={() => navigate(item.route)}
          />
        ))}
      </div>
    </div>
  );
};

export default InsightFeed;
