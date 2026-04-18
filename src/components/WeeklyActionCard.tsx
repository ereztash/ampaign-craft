import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useArchetype } from "@/contexts/ArchetypeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight,
  ArrowLeft,
  Target,
  Clock,
  CheckCircle2,
  RotateCcw,
  Repeat,
  Trophy,
  Minus,
  AlertTriangle,
  Users,
} from "lucide-react";
import { tx } from "@/i18n/tx";
import type { Bottleneck, BottleneckModule } from "@/engine/bottleneckEngine";
import type { GuidanceItem } from "@/types/meta";
import {
  commitToAction,
  reportOutcome,
  startNewWeek,
  abandonCommitment,
  continueCommitment,
  getLoopSnapshot,
  type LoopSnapshot,
  type ReportOutcome,
} from "@/engine/weeklyLoopEngine";
import { fetchCohortPriors, type CohortPriors } from "@/services/cohortBenchmarks";
import { Analytics } from "@/lib/analytics";

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

type CandidateAction = {
  kind: "bottleneck" | "guidance" | "cold-start" | "steady";
  title: string;
  why: string;
  firstTactic?: string;
  ctaRoute: string;
  severity: "critical" | "warning" | "info";
  module: BottleneckModule;
  actionId: string;
};

/**
 * Single primary Action Card that dominates the top of the Command Center.
 *
 * Renders one of seven states driven by the weekly loop state machine:
 *   no_signal / decision_pending / action_ready / in_progress /
 *   awaiting_report / between_weeks / missed_cycle
 *
 * The card owns the full weekly cadence: pick-the-move, commit, execute,
 * report, cooldown, re-engage.
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
  const { user } = useAuth();

  // Candidate action — what the engines currently recommend for the user
  // regardless of commitment state. Used for decision_pending/no_signal.
  const candidate = useMemo<CandidateAction>(() => {
    const topBottleneck = bottlenecks.find((b) => b.severity === "critical")
      ?? bottlenecks.find((b) => b.severity === "warning")
      ?? bottlenecks[0];

    if (topBottleneck) {
      return {
        kind: "bottleneck",
        title: topBottleneck.title[language],
        why: topBottleneck.description[language],
        firstTactic: topBottleneck.tactics[0]?.[language],
        ctaRoute: MODULE_ROUTES[topBottleneck.module],
        severity: topBottleneck.severity,
        module: topBottleneck.module,
        actionId: `bottleneck:${topBottleneck.id}`,
      };
    }

    if (guidance.length > 0) {
      const g = guidance[0];
      const firstAction = g.actions[0];
      const actionText = typeof firstAction === "string"
        ? firstAction
        : (firstAction as { he: string; en: string } | undefined)?.[language];
      return {
        kind: "guidance",
        title: g.area[language],
        why: g.issue[language],
        firstTactic: actionText,
        ctaRoute: "/strategy",
        severity: g.priority === "high" ? "critical" : "warning",
        module: "marketing",
        actionId: `guidance:${g.area.en}`,
      };
    }

    if (!hasPlan) {
      return {
        kind: "cold-start",
        title: tx({ he: "המהלך הראשון: תוכנית שיווק ראשונה", en: "First move: your first marketing plan" }, language),
        why: tx(
          { he: "אין עדיין תוכנית. נתחיל מהר — 2 לחיצות מספיקות כדי לקבל הצעת מהלך.", en: "No plan yet. Quick start — 2 clicks give you a first move to run." },
          language,
        ),
        firstTactic: tx(
          { he: "בנה תוכנית מהירה וראינו מה להריץ השבוע", en: "Build a quick plan — see what to run this week" },
          language,
        ),
        ctaRoute: "/wizard",
        severity: "info",
        module: "marketing",
        actionId: "cold-start:first-plan",
      };
    }

    return {
      kind: "steady",
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
      severity: "info",
      module: "marketing",
      actionId: "steady:deepen",
    };
  }, [bottlenecks, guidance, hasPlan, hasAnyConnection, language]);

  // Any of the three signal sources present → user has "entered the loop"
  const hasSignal = Boolean(stuckPoint) || bottlenecks.length > 0 || guidance.length > 0;

  // Loop state machine snapshot — kept in component state so we can re-derive
  // after a commit/report without waiting for parent re-render.
  const [snapshot, setSnapshot] = useState<LoopSnapshot>(() => getLoopSnapshot(hasSignal));
  const refreshSnapshot = useCallback(() => {
    setSnapshot(getLoopSnapshot(hasSignal));
  }, [hasSignal]);

  const [reportNote, setReportNote] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Cohort whisper — only surface "N similar businesses also reported X" when
  // we have archetype context AND the cohort sample is statistically meaningful
  // (n>=50, enforced inside fetchCohortPriors.isSignificant).
  const { effectiveArchetypeId, confidenceTier } = useArchetype();
  const [cohortPriors, setCohortPriors] = useState<CohortPriors | null>(null);
  useEffect(() => {
    // Skip cohort fetch when we don't have reliable archetype context yet —
    // noisy whispers are worse than silence.
    if (confidenceTier === "none" || confidenceTier === "tentative") return;
    if (snapshot.state !== "between_weeks") return;
    let cancelled = false;
    void fetchCohortPriors(effectiveArchetypeId).then((priors) => {
      if (!cancelled) setCohortPriors(priors);
    });
    return () => { cancelled = true; };
  }, [effectiveArchetypeId, confidenceTier, snapshot.state]);

  const handleCommitAndGo = useCallback(() => {
    commitToAction({
      actionId: candidate.actionId,
      actionTitle: candidate.title,
      module: candidate.module,
      severity: candidate.severity,
    });
    refreshSnapshot();
    navigate(candidate.ctaRoute);
  }, [candidate, navigate, refreshSnapshot]);

  const handleReport = useCallback((outcome: ReportOutcome) => {
    setReportSubmitting(true);
    reportOutcome(outcome, reportNote || null);
    setReportNote("");
    setReportSubmitting(false);
    refreshSnapshot();
  }, [reportNote, refreshSnapshot]);

  const handleStartNewWeek = useCallback(() => {
    const prevModule = snapshot.commitment?.module ?? "unknown";
    startNewWeek();
    if (user?.id) Analytics.loopNewMove(user.id, prevModule).catch(() => {});
    refreshSnapshot();
  }, [refreshSnapshot, snapshot.commitment, user?.id]);

  const handleContinueMove = useCallback(() => {
    const prevModule = snapshot.commitment?.module ?? "unknown";
    continueCommitment();
    if (user?.id) Analytics.loopContinued(user.id, prevModule).catch(() => {});
    refreshSnapshot();
  }, [refreshSnapshot, snapshot.commitment, user?.id]);

  const handleSwitchMove = useCallback(() => {
    abandonCommitment();
    refreshSnapshot();
  }, [refreshSnapshot]);

  // Fire cadence_hint_shown once per state entry while the hint is on screen.
  // Pairing this with later commit/report events tells us whether exposure to
  // the cadence text correlates with users actually staying in the loop.
  const lastHintStateRef = useRef<string | null>(null);
  useEffect(() => {
    const showsCadenceHint =
      snapshot.state === "no_signal" ||
      snapshot.state === "decision_pending" ||
      snapshot.state === "action_ready" ||
      snapshot.state === "in_progress";
    if (!showsCadenceHint) {
      lastHintStateRef.current = null;
      return;
    }
    if (lastHintStateRef.current === snapshot.state) return;
    lastHintStateRef.current = snapshot.state;
    if (user?.id) {
      Analytics.cadenceHintShown(user.id, snapshot.state).catch(() => {});
    }
  }, [snapshot.state, user?.id]);

  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  // ───────────────────────────────────────────────
  // State-specific rendering
  // ───────────────────────────────────────────────

  // in_progress / action_ready — user has committed, show the commitment card
  if (snapshot.state === "action_ready" || snapshot.state === "in_progress") {
    const c = snapshot.commitment!;
    const days = snapshot.daysSinceCommit ?? 0;
    const daysLeft = Math.max(0, 7 - days);
    const isDay0 = snapshot.state === "action_ready";

    return (
      <Card className="border-2 border-primary/30 shadow-lg">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" variant="secondary">
              <Target className="h-3 w-3 me-1" />
              {tx(
                isDay0
                  ? { he: "התחייבת למהלך", en: "You committed" }
                  : { he: "בעיצומו של המהלך", en: "Move in progress" },
                language,
              )}
            </Badge>
            <span className="text-xs text-muted-foreground" dir="auto">
              {tx(
                daysLeft === 0
                  ? { he: "דדליין היום", en: "Deadline today" }
                  : { he: `נותרו ${daysLeft} ימים`, en: `${daysLeft} days left` },
                language,
              )}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight" dir="auto">
            {c.actionTitle}
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed" dir="auto">
            {tx(
              isDay0
                ? { he: "הצעד הבא: לגשת למודול ולבצע את המהלך. נחזור אליך בעוד שבוע לדווח על התוצאה.", en: "Next step: open the module and run the move. We'll check in with you in a week." }
                : { he: "אל תאבד מומנטום. אם זה כבר בוצע, דווח כדי שהמערכת תלמד.", en: "Keep the momentum. If it's done, report back so the system learns." },
              language,
            )}
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <Button onClick={() => navigate(MODULE_ROUTES[c.module as BottleneckModule] ?? candidate.ctaRoute ?? "/strategy")} className="gap-2 flex-1">
              {tx({ he: "המשך בעבודה", en: "Continue working" }, language)}
              <Arrow className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleSwitchMove} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              {tx({ he: "החלף מהלך", en: "Switch move" }, language)}
            </Button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 border-t border-border/50 pt-3 mt-1" dir="auto">
            <Repeat className="h-3 w-3" />
            <span>
              {tx(
                { he: "מחזור: שבוע → דיווח → מהלך הבא", en: "Cycle: week → report → next move" },
                language,
              )}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // awaiting_report / missed_cycle — ask for the outcome
  if (snapshot.state === "awaiting_report" || snapshot.state === "missed_cycle") {
    const c = snapshot.commitment!;
    const isMissed = snapshot.state === "missed_cycle";
    const Icon = isMissed ? AlertTriangle : CheckCircle2;

    return (
      <Card className="border-2 border-primary/30 shadow-lg">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Badge
              className={
                isMissed
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
              }
              variant="secondary"
            >
              <Icon className="h-3 w-3 me-1" />
              {tx(
                isMissed
                  ? { he: "השבוע נדחה", en: "Cycle paused" }
                  : { he: "זמן לדווח", en: "Report time" },
                language,
              )}
            </Badge>
            <span className="text-xs text-muted-foreground" dir="auto">
              {tx(
                { he: `${snapshot.daysSinceCommit} ימים מההתחייבות`, en: `${snapshot.daysSinceCommit} days since commit` },
                language,
              )}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight" dir="auto">
            {tx(
              isMissed
                ? { he: "עבר כבר זמן. מה קרה עם המהלך?", en: "It's been a while. What happened with the move?" }
                : { he: "איך הלך עם המהלך?", en: "How did the move go?" },
              language,
            )}
          </h2>

          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-sm text-foreground" dir="auto">
              {c.actionTitle}
            </p>
          </div>

          <Textarea
            value={reportNote}
            onChange={(e) => setReportNote(e.target.value)}
            placeholder={tx(
              { he: "הערה קצרה על מה שקרה (אופציונלי)", en: "Short note on what happened (optional)" },
              language,
            )}
            dir="auto"
            rows={2}
          />

          <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-1">
            <Button onClick={() => handleReport("done")} disabled={reportSubmitting} className="gap-2 flex-1 bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {tx({ he: "בוצע", en: "Done" }, language)}
            </Button>
            <Button onClick={() => handleReport("partial")} disabled={reportSubmitting} variant="outline" className="gap-2 flex-1">
              {tx({ he: "בוצע חלקית", en: "Partial" }, language)}
            </Button>
            <Button onClick={() => handleReport("skipped")} disabled={reportSubmitting} variant="outline" className="gap-2 flex-1">
              {tx({ he: "לא בוצע", en: "Skipped" }, language)}
            </Button>
          </div>
          {isMissed && (
            <button
              type="button"
              onClick={handleSwitchMove}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline mt-1"
            >
              {tx({ he: "בחר מהלך אחר במקום לדווח", en: "Pick a different move instead" }, language)}
            </button>
          )}
        </CardContent>
      </Card>
    );
  }

  // between_weeks — celebrate & cooldown
  if (snapshot.state === "between_weeks") {
    const c = snapshot.commitment!;
    const outcomeLabel = c.outcome === "done"
      ? tx({ he: "מהלך הושלם", en: "Move completed" }, language)
      : c.outcome === "partial"
        ? tx({ he: "בוצע חלקית", en: "Partial outcome" }, language)
        : tx({ he: "דולג השבוע", en: "Skipped this week" }, language);
    const OutcomeIcon = c.outcome === "skipped" ? Minus : Trophy;
    const tone = c.outcome === "done"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
      : c.outcome === "partial"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
        : "bg-muted text-muted-foreground";

    return (
      <Card className="border-2 border-primary/30 shadow-lg">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Badge className={tone} variant="secondary">
              <OutcomeIcon className="h-3 w-3 me-1" />
              {outcomeLabel}
            </Badge>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight" dir="auto">
            {tx(
              c.outcome === "done"
                ? { he: "כל הכבוד. דיווחת — המערכת לומדת.", en: "Nicely done. You reported — the system learns." }
                : c.outcome === "partial"
                  ? { he: "התקדמות חלקית זה עדיין התקדמות.", en: "Partial progress is still progress." }
                  : { he: "לא כל שבוע מצליח — זה בסדר. נתחיל חדש.", en: "Not every week works out — that's fine. Fresh start." },
              language,
            )}
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed" dir="auto">
            {tx(
              { he: "המהלך הקודם נרשם בהיסטוריה. אפשר להתחיל שבוע חדש ולבחור את המהלך הבא.", en: "The previous move is logged. Start a new week and pick the next move." },
              language,
            )}
          </p>

          {cohortPriors?.isSignificant && cohortPriors.topActions.length > 0 && (
            <div className="flex items-start gap-2 rounded-md bg-blue-50 dark:bg-blue-950/30 p-3 text-sm" dir="auto">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <span className="text-foreground/80">
                {tx(
                  {
                    he: `${cohortPriors.sampleSize} עסקים דומים לשלך דיווחו — הדפוסים המובילים בארכיטיפ שלך זמינים ב"בחר מהלך חדש".`,
                    en: `${cohortPriors.sampleSize} similar businesses reported — top patterns for your archetype are available in "Pick a new move".`,
                  },
                  language,
                )}
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            {(c.outcome === "partial" || c.outcome === "done") && (
              <Button onClick={handleContinueMove} variant="outline" className="gap-2 flex-1">
                <Repeat className="h-4 w-4" />
                {tx({ he: "המשך באותו מהלך", en: "Continue same move" }, language)}
              </Button>
            )}
            <Button onClick={handleStartNewWeek} className="gap-2 flex-1">
              {tx({ he: "בחר מהלך חדש", en: "Pick a new move" }, language)}
              <Arrow className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // no_signal / decision_pending — show the candidate action
  const severityLabel = tx(
    candidate.severity === "critical"
      ? { he: "דחוף השבוע", en: "Urgent this week" }
      : candidate.severity === "warning"
        ? { he: "מומלץ השבוע", en: "Recommended this week" }
        : { he: "המהלך השבוע", en: "This week's move" },
    language,
  );

  const severityTone =
    candidate.severity === "critical"
      ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
      : candidate.severity === "warning"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
        : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200";

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
          {candidate.title}
        </h2>

        <p className="text-sm text-muted-foreground leading-relaxed" dir="auto">
          {candidate.why}
        </p>

        {candidate.firstTactic && (
          <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3">
            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span className="text-sm text-foreground" dir="auto">
              {candidate.firstTactic}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          {candidate.kind === "cold-start" || candidate.kind === "steady" ? (
            // No active commitment yet — deadline framing would be meaningless
            <div />
          ) : (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span dir="auto">
                {tx({ he: "עד סוף השבוע", en: "By end of this week" }, language)}
              </span>
            </div>
          )}
          <Button onClick={handleCommitAndGo} className="gap-2">
            {candidate.kind === "cold-start"
              ? tx({ he: "קבל את המהלך", en: "Get the move" }, language)
              : candidate.kind === "steady"
                ? tx({ he: "פתח מודול", en: "Open module" }, language)
                : tx({ he: "התחייב ובצע", en: "Commit and go" }, language)}
            <Arrow className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 border-t border-border/50 pt-3 mt-1" dir="auto">
          <Repeat className="h-3 w-3" />
          <span>
            {tx(
              { he: "מחזור: שבוע → דיווח → מהלך הבא", en: "Cycle: week → report → next move" },
              language,
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
