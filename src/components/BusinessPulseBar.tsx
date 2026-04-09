import { useLanguage } from "@/i18n/LanguageContext";
import { BottleneckAnalysis } from "@/engine/bottleneckEngine";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, AlertTriangle, Flame, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface BusinessPulseBarProps {
  analysis: BottleneckAnalysis;
  dataSourceCount: number;
  planCount: number;
  streak: number;
}

const BusinessPulseBar = ({ analysis, dataSourceCount, planCount, streak }: BusinessPulseBarProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";

  const scoreColor = analysis.overallScore >= 70 ? "text-accent" : analysis.overallScore >= 40 ? "text-amber-500" : "text-destructive";
  const criticalCount = analysis.bottlenecks.filter((b) => b.severity === "critical").length;

  const stats = [
    {
      icon: Activity,
      label: isHe ? "ציון בריאות" : "Health Score",
      value: `${analysis.overallScore}`,
      suffix: "/100",
      color: scoreColor,
    },
    {
      icon: Database,
      label: isHe ? "מקורות מידע" : "Data Sources",
      value: `${dataSourceCount}`,
      suffix: isHe ? " מחוברים" : " connected",
      color: dataSourceCount > 0 ? "text-accent" : "text-muted-foreground",
    },
    {
      icon: AlertTriangle,
      label: isHe ? "חסמים" : "Bottlenecks",
      value: `${criticalCount}`,
      suffix: isHe ? " קריטיים" : " critical",
      color: criticalCount > 0 ? "text-destructive" : "text-accent",
    },
    {
      icon: TrendingUp,
      label: isHe ? "תוכניות" : "Plans",
      value: `${planCount}`,
      suffix: "",
      color: "text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <Card key={i} className="border">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted")}>
                <Icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                <p className="text-lg font-bold leading-none">
                  <span className={stat.color}>{stat.value}</span>
                  <span className="text-xs font-normal text-muted-foreground">{stat.suffix}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default BusinessPulseBar;
