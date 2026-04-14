// InsightsCard — shows AI-detected patterns from the user's plans
// Placed in CommandCenter to close the feedback loop.

import { useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { generateInsights, type BusinessInsight } from "@/engine/insightsEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tx } from "@/i18n/tx";
import { Lightbulb, TrendingUp, AlertTriangle, Trophy } from "lucide-react";

const typeConfig: Record<
  BusinessInsight["type"],
  { icon: React.ComponentType<{ className?: string }>; color: string; labelHe: string; labelEn: string }
> = {
  win:     { icon: Trophy,        color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20",   labelHe: "הישג",    labelEn: "Win" },
  pattern: { icon: TrendingUp,    color: "text-primary bg-primary/5",                          labelHe: "תבנית",   labelEn: "Pattern" },
  risk:    { icon: AlertTriangle, color: "text-red-500 bg-red-50 dark:bg-red-900/20",          labelHe: "סיכון",   labelEn: "Risk" },
  tip:     { icon: Lightbulb,     color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20", labelHe: "טיפ", labelEn: "Tip" },
};

export function InsightsCard() {
  const { language } = useLanguage();
  const isHe = language === "he";

  const insights = useMemo(() => generateInsights(), []);
  if (insights.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2" dir="auto">
          <Lightbulb className="h-4 w-4 text-primary" />
          {tx({ he: "תובנות מהתוכניות שלך", en: "Insights from your plans" }, language)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {insights.map((insight) => {
          const cfg = typeConfig[insight.type];
          const Icon = cfg.icon;
          return (
            <div
              key={insight.id}
              className={`flex items-start gap-2.5 rounded-lg p-2.5 ${cfg.color}`}
            >
              <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-semibold text-foreground leading-tight" dir="auto">
                    {insight.title[language]}
                  </p>
                  {insight.metric && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-mono">
                      {insight.metric}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug" dir="auto">
                  {insight.body[language]}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
