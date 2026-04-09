import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getHealthScoreColor } from "@/engine/healthScoreEngine";
import { Flame, Database, AlertTriangle, FileText, Layers } from "lucide-react";

interface BusinessPulseBarProps {
  healthTotal: number | null;
  connectedSources: number;
  bottleneckCount: number;
  planCount: number;
  streakWeeks: number;
  completedModules: number;
  totalModules: number;
}

const BusinessPulseBar = ({
  healthTotal,
  connectedSources,
  bottleneckCount,
  planCount,
  streakWeeks,
  completedModules,
  totalModules,
}: BusinessPulseBarProps) => {
  const { language, t } = useLanguage();
  const isHe = language === "he";
  const score = healthTotal ?? 0;
  const hasScore = healthTotal !== null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="border-primary/20 sm:col-span-2 lg:col-span-1">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-muted/30"
              />
              {hasScore && (
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={getHealthScoreColor(score)}
                  strokeWidth="3"
                  strokeDasharray={`${score}, 100`}
                  strokeLinecap="round"
                />
              )}
            </svg>
            <span className="absolute text-lg font-bold text-foreground">{hasScore ? score : "—"}</span>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">{isHe ? "בריאות שיווק" : "Marketing health"}</p>
            <p className="text-sm font-semibold text-foreground" dir="auto">
              {hasScore ? (isHe ? "ציון פעיל" : "Active score") : (isHe ? "צור תוכנית לציון" : "Create a plan for score")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("navDataSources")}</p>
            <p className="text-lg font-bold">{connectedSources}</p>
            <div className="flex gap-1 mt-1">
              {Array.from({ length: Math.min(connectedSources, 5) }).map((_, i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-accent" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={bottleneckCount > 0 ? "border-destructive/30 bg-destructive/5" : ""}>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{isHe ? "צווארי בקבוק" : "Bottlenecks"}</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold">{bottleneckCount}</p>
              {bottleneckCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {isHe ? "לטיפול" : "Action"}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              {isHe ? "תוכניות" : "Plans"}
            </span>
            <span className="font-bold">{planCount}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              {isHe ? "מודולים" : "Modules"}
            </span>
            <span className="font-bold">
              {completedModules}/{totalModules}
            </span>
          </div>
          {streakWeeks > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <Flame className="h-3 w-3" />
              {streakWeeks} {isHe ? "שבועות רצף" : "week streak"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessPulseBar;
