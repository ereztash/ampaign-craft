import type { Bottleneck } from "@/engine/bottleneckEngine";
import type { HealthScore } from "@/engine/healthScoreEngine";
import type { BusinessInsight } from "@/engine/insightsEngine";
import type { LoopSnapshot } from "@/engine/weeklyLoopEngine";
import { commitToAction, reportOutcome, startNewWeek, getStreak } from "@/engine/weeklyLoopEngine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GlobalInsightHeroProps {
  bottlenecks: Bottleneck[];
  insights: BusinessInsight[];
  loopSnapshot: LoopSnapshot;
  healthScore: HealthScore;
  language: "he" | "en";
  onLoopStateChange: () => void;
}

const INSIGHT_BORDER: Record<string, string> = {
  win: "border-accent bg-accent/5",
  pattern: "border-primary bg-primary/5",
  tip: "border-primary bg-primary/5",
  risk: "border-destructive bg-destructive/5",
};

const SEVERITY_BORDER: Record<string, string> = {
  critical: "border-destructive bg-destructive/5",
  warning: "border-amber-500 bg-amber-50 dark:bg-amber-950/20",
  info: "border-primary bg-primary/5",
};

export function GlobalInsightHero({
  bottlenecks,
  insights,
  loopSnapshot,
  healthScore,
  language,
  onLoopStateChange,
}: GlobalInsightHeroProps) {
  const t = (he: string, en: string) => (language === "he" ? he : en);
  const { state, commitment, daysSinceCommit } = loopSnapshot;

  const isAccountabilityActive =
    state === "awaiting_report" ||
    state === "missed_cycle" ||
    state === "in_progress" ||
    state === "between_weeks";

  const hasInsight = insights.length > 0;
  const hasBottleneck = bottlenecks.length > 0;

  if (!isAccountabilityActive && !hasInsight && !hasBottleneck) return null;

  // ─── Layer 0: Accountability loop ──────────────────────────────
  if (isAccountabilityActive && commitment) {
    const streak = getStreak();

    if (state === "between_weeks") {
      return (
        <Card className="mb-4 border-accent/30 bg-accent/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-xl" aria-hidden="true">✅</span>
              <div>
                <p className="text-sm font-semibold text-foreground" dir="auto">
                  {streak >= 2
                    ? t(`${streak} שבועות ברצף, כל הכבוד!`, `${streak} weeks in a row, great work!`)
                    : t("כל הכבוד על הדיווח", "Great job reporting in")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5" dir="auto">
                  &ldquo;{commitment.actionTitle}&rdquo;
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (state === "in_progress") {
      return (
        <Card className="mb-4 border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-xl" aria-hidden="true">⏳</span>
              <p className="text-sm text-foreground" dir="auto">
                {t(`יום ${daysSinceCommit}: `, `Day ${daysSinceCommit}: `)}
                &ldquo;{commitment.actionTitle}&rdquo;
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (state === "missed_cycle") {
      return (
        <Card className="mb-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-xl" aria-hidden="true">⏰</span>
              <div>
                <p className="text-sm font-semibold text-foreground" dir="auto">
                  {t(
                    `עברו ${daysSinceCommit} ימים. בואו נתחיל מחדש`,
                    `${daysSinceCommit} days passed. Let's restart`,
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5" dir="auto">
                  &ldquo;{commitment.actionTitle}&rdquo;
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { startNewWeek(); onLoopStateChange(); }}
            >
              {t("שבוע חדש", "Start new week")}
            </Button>
          </CardContent>
        </Card>
      );
    }

    // awaiting_report
    return (
      <Card className="mb-4 border-primary/30 bg-primary/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-xl" aria-hidden="true">📋</span>
            <div>
              <p className="text-sm font-semibold text-foreground" dir="auto">
                {t("דיווח שבועי: איך הלך?", "Weekly check-in: how did it go?")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5" dir="auto">
                &ldquo;{commitment.actionTitle}&rdquo;
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => { reportOutcome("done"); onLoopStateChange(); }}
            >
              {t("הצלחתי ✓", "Done ✓")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { reportOutcome("partial"); onLoopStateChange(); }}
            >
              {t("חלקית", "Partial")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => { reportOutcome("skipped"); onLoopStateChange(); }}
            >
              {t("דילגתי", "Skipped")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Layers 1 + 2: Temporal signal + Operational gap ───────────
  return (
    <div className="mb-4 space-y-3">
      {hasInsight && (() => {
        const insight = insights[0];
        return (
          <Card className={cn("border-s-4", INSIGHT_BORDER[insight.type] ?? "border-primary bg-primary/5")}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Badge
                    variant={insight.type === "risk" ? "destructive" : "secondary"}
                    className="text-xs mb-1"
                  >
                    {insight.type === "risk"
                      ? t("סיכון", "Risk")
                      : insight.type === "win"
                        ? t("הישג", "Win")
                        : insight.type === "pattern"
                          ? t("מגמה", "Trend")
                          : t("טיפ", "Tip")}
                  </Badge>
                  <p className="text-sm font-semibold text-foreground" dir="auto">{insight.title[language]}</p>
                  <p className="text-xs text-muted-foreground mt-0.5" dir="auto">{insight.body[language]}</p>
                </div>
                {insight.metric && (
                  <span className="shrink-0 rounded-full bg-background/60 px-2 py-0.5 text-xs font-mono">
                    {insight.metric}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {hasBottleneck && (() => {
        const b = bottlenecks[0];
        return (
          <Card className={cn("border-s-4", SEVERITY_BORDER[b.severity] ?? "border-primary bg-primary/5")}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Badge
                    variant={b.severity === "critical" ? "destructive" : "secondary"}
                    className="text-xs mb-1 capitalize"
                  >
                    {b.severity}
                  </Badge>
                  <p className="text-sm font-semibold text-foreground" dir="auto">{b.title[language]}</p>
                  <p className="text-xs text-muted-foreground mt-0.5" dir="auto">{b.description[language]}</p>
                </div>
                <span className="shrink-0 rounded-full bg-background/60 px-2 py-0.5 text-xs font-mono">
                  {healthScore.total}/100
                </span>
              </div>
              {b.tactics[0] && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => {
                    commitToAction({
                      actionId: b.id,
                      actionTitle: b.tactics[0][language],
                      module: b.module,
                      severity: b.severity,
                    });
                    onLoopStateChange();
                  }}
                >
                  {b.tactics[0][language]}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}

export default GlobalInsightHero;
