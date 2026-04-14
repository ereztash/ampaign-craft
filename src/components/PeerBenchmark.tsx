import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { getSocialProof, getTotalUsers } from "@/lib/socialProofData";
import { tx } from "@/i18n/tx";
import { Users, BarChart3, ArrowUpRight } from "lucide-react";

interface PeerBenchmarkProps {
  businessField: string;
  healthScore?: number;
  modulesCompleted: number;
  modulesTotal: number;
}

const PEER_BENCHMARKS: Record<string, { avgHealthScore: number; avgModulesCompleted: number; avgDaysToComplete: number }> = {
  fashion: { avgHealthScore: 74, avgModulesCompleted: 3.2, avgDaysToComplete: 5 },
  tech: { avgHealthScore: 79, avgModulesCompleted: 3.8, avgDaysToComplete: 4 },
  food: { avgHealthScore: 68, avgModulesCompleted: 2.9, avgDaysToComplete: 6 },
  services: { avgHealthScore: 71, avgModulesCompleted: 3.0, avgDaysToComplete: 5 },
  education: { avgHealthScore: 73, avgModulesCompleted: 3.1, avgDaysToComplete: 7 },
  health: { avgHealthScore: 76, avgModulesCompleted: 3.4, avgDaysToComplete: 5 },
  realEstate: { avgHealthScore: 70, avgModulesCompleted: 2.6, avgDaysToComplete: 8 },
  tourism: { avgHealthScore: 72, avgModulesCompleted: 3.0, avgDaysToComplete: 6 },
  personalBrand: { avgHealthScore: 77, avgModulesCompleted: 3.5, avgDaysToComplete: 4 },
  other: { avgHealthScore: 72, avgModulesCompleted: 3.0, avgDaysToComplete: 6 },
};

function getBenchmark(field: string) {
  return PEER_BENCHMARKS[field] || PEER_BENCHMARKS.other;
}

export function PeerBenchmark({ businessField, healthScore, modulesCompleted, modulesTotal }: PeerBenchmarkProps) {
  const { language } = useLanguage();
  const isHe = language === "he";
  const proof = getSocialProof(businessField);
  const benchmark = getBenchmark(businessField);
  const totalUsers = getTotalUsers();

  const healthDelta = healthScore != null ? healthScore - benchmark.avgHealthScore : null;

  return (
    <Card className="border-blue-500/20 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-900/10">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-foreground">
            {tx({ he: "השוואת עמיתים", en: "Peer Benchmark" }, language)}
          </h3>
        </div>

        {/* Total platform users */}
        <p className="text-xs text-muted-foreground" dir="auto">
          {isHe
            ? `${proof.usersCount.toLocaleString()} עסקים בתחום שלך מתוך ${totalUsers.toLocaleString()} במערכת`
            : `${proof.usersCount.toLocaleString()} businesses in your field out of ${totalUsers.toLocaleString()} on the platform`}
        </p>

        <div className="grid grid-cols-2 gap-2">
          {/* Health score comparison */}
          {healthScore != null && (
            <div className="rounded-lg border p-2 text-center space-y-0.5">
              <BarChart3 className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
              <div className="text-lg font-bold text-foreground">{healthScore}</div>
              <div className="text-[10px] text-muted-foreground">
                {tx({ he: "ציון בריאות שלך", en: "Your health score" }, language)}
              </div>
              <div className={`text-[10px] font-medium flex items-center justify-center gap-0.5 ${(healthDelta ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                {(healthDelta ?? 0) >= 0 && <ArrowUpRight className="h-3 w-3" />}
                {(healthDelta ?? 0) >= 0 ? "+" : ""}{healthDelta}
                {tx({ he: " מהממוצע", en: " vs avg" }, language)}
              </div>
            </div>
          )}

          {/* Module completion comparison */}
          <div className="rounded-lg border p-2 text-center space-y-0.5">
            <div className="text-lg font-bold text-foreground">
              {modulesCompleted}/{modulesTotal}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {tx({ he: "מודולים שהושלמו", en: "Modules completed" }, language)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {isHe
                ? `עמיתים: ${benchmark.avgModulesCompleted.toFixed(1)}/${modulesTotal}`
                : `Peers: ${benchmark.avgModulesCompleted.toFixed(1)}/${modulesTotal}`}
            </div>
          </div>
        </div>

        {/* Industry top metric */}
        <div className="flex items-center gap-2 rounded-lg bg-blue-500/5 dark:bg-blue-500/10 p-2">
          <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{proof.topMetricValue}</span>
          <span className="text-xs text-muted-foreground" dir="auto">{proof.topMetric[language]}</span>
        </div>
      </CardContent>
    </Card>
  );
}
