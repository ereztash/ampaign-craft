import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Target, Clock, CheckCircle2 } from "lucide-react";
import { tx } from "@/i18n/tx";
import type { Bottleneck, BottleneckModule } from "@/engine/bottleneckEngine";
import type { GuidanceItem } from "@/types/meta";

// Maps each bottleneck module to the route where the next action lives.
// Keeping this in one place so the Action Card stays authoritative about
// where "the next move" actually gets executed.
const MODULE_ROUTES: Record<BottleneckModule, string> = {
  differentiation: "/differentiate",
  marketing: "/wizard",
  sales: "/sales",
  pricing: "/pricing",
  retention: "/retention",
};

interface WeeklyActionCardProps {
  bottlenecks: Bottleneck[];
  guidance: GuidanceItem[];
  hasPlan: boolean;
  hasAnyConnection: boolean;
  stuckPoint?: string;
}

/**
 * Single primary Action Card that dominates the top of the Command Center.
 *
 * This is the product's weekly decision loop surfaced as one card:
 * what to do, why now, how to measure success, and where to go next.
 *
 * Selection priority:
 *   1. First critical/warning bottleneck (highest-severity unresolved gap)
 *   2. First guidance item (KPI-driven corrective action)
 *   3. Cold-start fallback — prompt for first plan
 */
export default function WeeklyActionCard({
  bottlenecks,
  guidance,
  hasPlan,
  hasAnyConnection,
  stuckPoint,
}: WeeklyActionCardProps) {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();

  const action = useMemo(() => {
    const topBottleneck = bottlenecks.find((b) => b.severity === "critical")
      ?? bottlenecks.find((b) => b.severity === "warning")
      ?? bottlenecks[0];

    if (topBottleneck) {
      return {
        kind: "bottleneck" as const,
        title: topBottleneck.title[language],
        why: topBottleneck.description[language],
        firstTactic: topBottleneck.tactics[0]?.[language],
        ctaRoute: MODULE_ROUTES[topBottleneck.module],
        severity: topBottleneck.severity,
        module: topBottleneck.module,
      };
    }

    if (guidance.length > 0) {
      const g = guidance[0];
      const firstAction = g.actions[0];
      const actionText = typeof firstAction === "string"
        ? firstAction
        : (firstAction as { he: string; en: string } | undefined)?.[language];
      return {
        kind: "guidance" as const,
        title: g.area[language],
        why: g.issue[language],
        firstTactic: actionText,
        ctaRoute: "/strategy",
        severity: g.priority === "high" ? ("critical" as const) : ("warning" as const),
        module: "marketing" as BottleneckModule,
      };
    }

    if (!hasPlan) {
      return {
        kind: "cold-start" as const,
        title: tx({ he: "המהלך הראשון: תוכנית שיווק ראשונה", en: "First move: your first marketing plan" }, language),
        why: tx(
          { he: "אין עדיין תוכנית. נתחיל מהר — 2 לחיצות מספיקות כדי לקבל הצעת מהלך.", en: "No plan yet. Quick start — 2 clicks give you a first move to run." },
          language,
        ),
        firstTactic: tx(
          { he: "בנה תוכנית מהירה ראינו מה להריץ השבוע", en: "Build a quick plan — see what to run this week" },
          language,
        ),
        ctaRoute: "/wizard",
        severity: "info" as const,
        module: "marketing" as BottleneckModule,
      };
    }

    return {
      kind: "steady" as const,
      title: tx({ he: "המערכת יציבה השבוע", en: "System is steady this week" }, language),
      why: tx(
        { he: "לא זוהה מהלך דחוף. אפשר להעמיק מודול קיים או לדווח על ביצוע.", en: "No urgent move detected. Deepen an existing module or report an outcome." },
        language,
      ),
      firstTactic: tx(
        { he: "פתח מודול קיים", en: "Open an existing module" },
        language,
      ),
      ctaRoute: hasAnyConnection ? "/strategy" : "/data",
      severity: "info" as const,
      module: "marketing" as BottleneckModule,
    };
  }, [bottlenecks, guidance, hasPlan, hasAnyConnection, language]);

  const severityLabel = tx(
    action.severity === "critical"
      ? { he: "דחוף השבוע", en: "Urgent this week" }
      : action.severity === "warning"
        ? { he: "מומלץ השבוע", en: "Recommended this week" }
        : { he: "המהלך השבוע", en: "This week's move" },
    language,
  );

  const severityTone =
    action.severity === "critical"
      ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
      : action.severity === "warning"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
        : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200";

  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <Card className="border-2 border-primary/30 shadow-lg">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Badge className={severityTone} variant="secondary">
            <Target className="h-3 w-3 me-1" />
            {severityLabel}
          </Badge>
          {stuckPoint && (
            <span className="text-xs text-muted-foreground truncate max-w-[55%]" dir="auto">
              {tx({ he: "ציינת: ", en: "You said: " }, language)}{stuckPoint}
            </span>
          )}
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight" dir="auto">
          {action.title}
        </h2>

        <p className="text-sm text-muted-foreground leading-relaxed" dir="auto">
          {action.why}
        </p>

        {action.firstTactic && (
          <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3">
            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span className="text-sm text-foreground" dir="auto">
              {action.firstTactic}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span dir="auto">
              {tx({ he: "עד סוף השבוע", en: "By end of this week" }, language)}
            </span>
          </div>
          <Button onClick={() => navigate(action.ctaRoute)} className="gap-2">
            {tx({ he: "בצע את המהלך", en: "Make the move" }, language)}
            <Arrow className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
