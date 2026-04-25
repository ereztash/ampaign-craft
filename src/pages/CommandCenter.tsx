import { useMemo, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useDataSources } from "@/contexts/DataSourceContext";
import { buildUserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { calculateHealthScore } from "@/engine/healthScoreEngine";
import { safeStorage } from "@/lib/safeStorage";
import { calculateCostOfInaction } from "@/engine/costOfInactionEngine";
import { generateWeeklyPulse } from "@/engine/pulseEngine";
import { detectBottlenecks } from "@/engine/bottleneckEngine";
import { computeGaps } from "@/engine/gapEngine";
import { generateGuidance } from "@/engine/guidanceEngine";
import { predictSuccess } from "@/engine/predictiveEngine";
import { generateBenchmarks } from "@/engine/campaignAnalyticsEngine";
import { inferDISCProfile } from "@/engine/discProfileEngine";
import { computeMotivationState, type BAEInput } from "@/engine/behavioralActionEngine";
import type { MetaInsights } from "@/types/meta";
import { useAchievements } from "@/hooks/useAchievements";
import { useModuleStatus } from "@/hooks/useModuleStatus";
import { getTotalUsers } from "@/lib/socialProofData";
import { Analytics } from "@/lib/analytics";
import BusinessPulseBar from "@/components/BusinessPulseBar";
import WeeklyActionCard from "@/components/WeeklyActionCard";
import IdentityStrip from "@/components/IdentityStrip";
import InsightFeed from "@/components/InsightFeed";
import { NudgeBanner } from "@/components/NudgeBanner";
import { ProgressMomentum } from "@/components/ProgressMomentum";
import type { SavedPlan } from "@/types/funnel";
import { tx } from "@/i18n/tx";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import ExpressWizard from "@/components/ExpressWizard";
import { ArrowRight } from "lucide-react";
import { InsightsCard } from "@/components/InsightsCard";
import { AnalyticsConnectCard } from "@/components/AnalyticsConnectCard";
import { useArchetype } from "@/contexts/ArchetypeContext";
import ArchetypePipelineGuide from "@/components/ArchetypePipelineGuide";
import { snapshotEngineOutputs, captureContentSnapshot } from "@/engine/outcomeLoopEngine";
import { hasCompletedIntake } from "@/engine/intake/intakeSignal";
import { recordRouteVisit } from "@/engine/intake/feedbackLoop";
import IntakeReframeBanner from "@/components/intake/IntakeReframeBanner";

const CommandCenter = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { sources, refreshFromProfile } = useDataSources();
  const navigate = useNavigate();
  const location = useLocation();
  const reducedMotion = useReducedMotion();
  const totalUsers = getTotalUsers();
  const { streak, masteryFeatures } = useAchievements(language);
  const modules = useModuleStatus();

  useEffect(() => {
    refreshFromProfile(!!profile.lastFormData);
  }, [profile.lastFormData, refreshFromProfile]);

  // First-time gate: brand-new users (no plan, no intake) get sent to /intake
  // for the 30-second diagnostic. Users who already have a plan or have
  // completed intake before are not redirected — they own their entry point.
  useEffect(() => {
    if (profile.savedPlanCount === 0 && !hasCompletedIntake() && !profile.lastFormData) {
      navigate("/intake", { replace: true });
    }
  }, [profile.savedPlanCount, profile.lastFormData, navigate]);

  // Phase-3 telemetry: record CommandCenter visit (always collected,
  // surfaced to UI only when VITE_INTAKE_FEEDBACK_ENABLED is on).
  useEffect(() => {
    recordRouteVisit("/");
  }, []);

  // Re-read plans from storage when the count, last summary, or route changes
  // (these are the reactive proxies for the non-reactive localStorage key).
  const plans = useMemo(
    (): SavedPlan[] => safeStorage.getJSON<SavedPlan[]>("funnelforge-plans", []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile.savedPlanCount, profile.lastPlanSummary, location.key],
  );

  const latestPlan = useMemo(() => {
    if (plans.length === 0) return null;
    return [...plans].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())[0];
  }, [plans]);

  const graph = useMemo(() => {
    if (profile.lastFormData) return buildUserKnowledgeGraph(profile.lastFormData);
    return buildUserKnowledgeGraph({
      businessField: "",
      audienceType: "b2c",
      ageRange: [25, 55],
      interests: "",
      productDescription: "",
      averagePrice: 0,
      salesModel: "oneTime",
      budgetRange: "medium",
      mainGoal: "sales",
      existingChannels: [],
      experienceLevel: "beginner",
    });
  }, [profile.lastFormData]);

  const hasDiff = !!safeStorage.getString("funnelforge-differentiation-result", "");
  const healthTotal = latestPlan ? calculateHealthScore(latestPlan.result).total : null;
  const pulse = generateWeeklyPulse(plans);
  const connectedCount = sources.filter((s) => s.status === "connected").length;

  const bottlenecks = detectBottlenecks({
    funnelResult: latestPlan?.result ?? null,
    hasDifferentiation: hasDiff,
    planCount: plans.length,
    connectedSources: connectedCount,
    healthScoreTotal: healthTotal,
  });

  // Cross-plan analytics benchmarks used to feed predictive success.
  const analyticsResult = useMemo(() => generateBenchmarks(plans), [plans]);

  // Guidance engine: compute KPI gaps then generate corrective guidance.
  const guidanceItems = useMemo(() => {
    if (!latestPlan) return [];
    const emptyInsights: MetaInsights = {
      spend: "0",
      impressions: "0",
      clicks: "0",
      cpc: "0",
      cpm: "0",
      ctr: "0",
      reach: "0",
      date_start: "",
      date_stop: "",
      actions: [],
      cost_per_action_type: [],
    };
    const gaps = computeGaps(latestPlan.result, emptyInsights);
    return generateGuidance(gaps, latestPlan.result);
  }, [latestPlan]);

  // Predictive success forecast — consumes the benchmarks we just generated.
  const successForecast = useMemo(() => {
    if (!latestPlan?.result || !profile.lastFormData) return null;
    return predictSuccess(profile.lastFormData, latestPlan.result, analyticsResult.benchmarks);
  }, [latestPlan, profile.lastFormData, analyticsResult]);

  const completedModules = modules.filter((m) => m.completed).length;

  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [showExpressWizard, setShowExpressWizard] = useState(!profile.lastFormData);
  const isNewUser = !profile.lastFormData;

  const motivationState = useMemo(() => {
    const disc = profile.lastFormData ? inferDISCProfile(profile.lastFormData, graph) : undefined;
    const healthObj = latestPlan ? calculateHealthScore(latestPlan.result) : undefined;
    const coi = latestPlan ? calculateCostOfInaction(latestPlan.result) : undefined;
    const baeInput: BAEInput = {
      healthScore: healthObj,
      costOfInaction: coi,
      discProfile: disc?.distribution,
      investment: profile.investment,
      modulesTotal: modules.length,
      modulesCompleted: completedModules,
      streakWeeks: streak.currentStreak,
      achievementsUnlocked: 0,
      achievementsTotal: 10,
      businessField: profile.lastFormData?.businessField || "other",
      sessionMinutes: profile.investment.totalSessionsMinutes % 60 || 1,
    };
    return computeMotivationState(baeInput);
  }, [latestPlan, profile, modules, completedModules, streak, graph]);

  const { effectiveArchetypeId, confidenceTier } = useArchetype();

  // A "focused" mode is used when the user is new and hasn't yet filled
  // the express wizard. We hide every other surface (WeeklyActionCard,
  // pulse bar, guidance, InsightFeed, sidebar) so the only thing visible
  // is the wizard. Research (Userpilot/Appcues) consistently shows that
  // multi-surface home dashboards kill activation; the single-next-action
  // framing is the lever that moves the needle in the first 72 hours.
  const isFocusedStart = isNewUser && showExpressWizard;

  // ── MOAT Flywheel: engine output snapshot (time-series history) ──────
  useEffect(() => {
    snapshotEngineOutputs({
      userId: user?.id ?? null,
      archetypeId: effectiveArchetypeId,
      confidenceTier,
      healthScore: healthTotal,
      bottleneckCount: bottlenecks.length,
      criticalBottleneckCount: bottlenecks.filter((b) => b.severity === "critical").length,
      successProbability: successForecast?.successProbability ?? null,
      planCount: plans.length,
      connectedSources: connectedCount,
    });
  // Snapshot only when meaningful summary stats change. Including the full
  // bottlenecks/plans arrays would re-snapshot on every reference change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveArchetypeId, healthTotal, bottlenecks.length, plans.length, connectedCount]);

  // ── MOAT Flywheel: content snapshot (embedding-ready text capture) ───
  useEffect(() => {
    if (!profile.lastFormData) return;
    captureContentSnapshot({
      userId: user?.id ?? null,
      archetypeId: effectiveArchetypeId,
      formData: {
        businessField: profile.lastFormData.businessField,
        audienceType: profile.lastFormData.audienceType,
        productDescription: profile.lastFormData.productDescription,
        interests: profile.lastFormData.interests,
        mainGoal: profile.lastFormData.mainGoal,
      },
    });
  // Capture content snapshot only when form data or archetype changes —
  // not when user object reference changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.lastFormData, effectiveArchetypeId]);

  const mp = reducedMotion ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

  return (
    <main className="min-h-full bg-background">
      <div className="container mx-auto max-w-5xl px-4 py-6 space-y-8">
        <IntakeReframeBanner />
        <motion.section {...mp} className="text-center space-y-2">
          {user && profile.lastFormData ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground" dir="auto">
                {tx({ he: "המהלך הבא שלך השבוע", en: "Your next move this week" }, language)}
              </h1>
              <p className="text-sm text-muted-foreground" dir="auto">
                {graph.derived.identityStatement[language]}
              </p>
            </>
          ) : showExpressWizard ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground md:text-4xl" dir="auto">
                {tx({ he: "בוא נתחיל. 2 לחיצות ויש לך מהלך", en: "Let's start. 2 clicks and you have a move" }, language)}
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto" dir="auto">
                {isHe
                  ? "פאנל שיווקי בנוי על נתונים אמיתיים מ-GA4, Meta, ו-Google Ads."
                  : "Marketing funnel built on real data from GA4, Meta, and Google Ads."}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground md:text-4xl" dir="auto">
                {tx({ he: "המהלך הבא שלך השבוע", en: "Your next move this week" }, language)}
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto" dir="auto">
                {isHe
                  ? `${totalUsers.toLocaleString()}+ בעלי עסקים כבר בפנים. תגיד לנו מה תקוע, נחזיר לך את המהלך לעשות.`
                  : `${totalUsers.toLocaleString()}+ business owners inside. Tell us what's stuck. We'll give you the move to make.`}
              </p>
            </>
          )}
        </motion.section>

        <IdentityStrip />

        {/* Focused start: a new user sees ONLY the express wizard. Every
            other surface on the Command Center is suppressed below. */}
        {isFocusedStart && (
          <section className="space-y-3" aria-label={tx({ he: "התחל כאן", en: "Start here" }, language)}>
            <ExpressWizard onComplete={(data) => {
              safeStorage.setJSON("funnelforge-last-form", data);
              // Fire the activation event: completing the express wizard is
              // the shortest path to first value (a tailored plan). Without
              // this, the AARRR dashboard can't measure time-to-activation
              // for the fast path — only for the full wizard.
              if (user?.id) Analytics.onboardingCompleted(user.id, "express");
              setShowExpressWizard(false);
              navigate("/wizard", { state: { expressData: data } });
            }} />
            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground" dir="auto">
                {tx({
                  he: "אחרי השלב הזה: פאנל מלא מותאם, קופי לשלושה ערוצים, וצעד שימור ראשון.",
                  en: "After this step: a tailored funnel, copy for three channels, and your first retention move.",
                }, language)}
              </p>
              <button
                className="text-xs text-muted-foreground underline hover:text-foreground inline-flex items-center gap-1"
                onClick={() => { setShowExpressWizard(false); navigate("/wizard"); }}
              >
                {tx({ he: "מעדיף שליטה מלאה? עבור לאשף המלא", en: "Prefer full control? Switch to full wizard" }, language)}
                <ArrowRight className="h-3 w-3 rtl:rotate-180" aria-hidden="true" />
              </button>
            </div>
          </section>
        )}

        {!isFocusedStart && (
          <>
            <WeeklyActionCard
              bottlenecks={bottlenecks}
              guidance={guidanceItems}
              hasPlan={plans.length > 0}
              hasAnyConnection={connectedCount > 0}
              stuckPoint={
                // Prefer the dedicated signal key (persists after onboarding completion).
                // Fall back to the live draft for users mid-onboarding.
                safeStorage.getJSON<string | null>("funnelforge-signal-stuck-point", null) ??
                safeStorage.getJSON<{ currentStuckPoint?: string } | null>(
                  "funnelforge-onboarding-draft",
                  null,
                )?.currentStuckPoint ??
                undefined
              }
            />

            <details className="group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground select-none list-none flex items-center gap-2" dir="auto">
                <span className="group-open:rotate-90 transition-transform">›</span>
                {tx({ he: "מצב העסק ומדדים", en: "Business status & metrics" }, language)}
              </summary>
              <div className="mt-3">
                <BusinessPulseBar
                  healthTotal={healthTotal}
                  connectedSources={connectedCount}
                  bottleneckCount={bottlenecks.filter((b) => b.severity === "critical" || b.severity === "warning").length}
                  planCount={plans.length}
                  streakWeeks={streak.currentStreak}
                  completedModules={completedModules}
                  totalModules={modules.length}
                />
              </div>
            </details>

            {!nudgeDismissed && motivationState.nudge && (
              <NudgeBanner nudge={motivationState.nudge} onDismiss={() => setNudgeDismissed(true)} />
            )}

            {(guidanceItems.length > 0 || successForecast) && (
              <div className="rounded-xl border border-blue-200/60 bg-blue-50/40 dark:border-blue-700/40 dark:bg-blue-900/20 p-4 text-start space-y-1">
                {guidanceItems.length > 0 && (
                  <p className="text-xs text-blue-900 dark:text-blue-200" dir="auto">
                    {tx({ he: "הדרכה", en: "Guidance" }, language)}: {guidanceItems.length} {tx({ he: "פעולות מומלצות", en: "recommended actions" }, language)}
                  </p>
                )}
                {successForecast && (
                  <p className="text-xs text-blue-900 dark:text-blue-200" dir="auto">
                    {tx({ he: "הסתברות הצלחה חזויה", en: "Predicted success" }, language)}:{" "}
                    <strong>{successForecast.successProbability}%</strong>
                    {" "}· {successForecast.riskFactors.length} {tx({ he: "סיכונים", en: "risks" }, language)}
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-8 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <InsightFeed
                  bottlenecks={bottlenecks}
                  pulse={pulse}
                  graph={graph}
                  hasDiff={hasDiff}
                  planCount={plans.length}
                  masteryFeatures={masteryFeatures}
                  healthScore={healthTotal}
                  connectedSources={connectedCount}
                />
              </div>
              <div className="lg:col-span-2 space-y-3">
                {/* Pipeline guide is the single directed next-step surface.
                    It runs on the cold-start archetype when confidenceTier
                    is "none" so a user who has filled the express wizard
                    but not yet been classified still sees "do X next". */}
                <ArchetypePipelineGuide />
                <InsightsCard />
                <AnalyticsConnectCard />
                <ProgressMomentum
                  modules={modules}
                  streakWeeks={streak.currentStreak}
                  investmentMinutes={profile.investment.totalSessionsMinutes}
                  plansCreated={profile.investment.plansCreated}
                />
                {connectedCount === 0 && plans.length === 0 && (
                  <p className="text-xs text-muted-foreground px-1 text-center" dir="auto">
                    {tx({ he: "חבר את המקור הראשון כדי לפתוח תובנות מותאמות.", en: "Connect your first source to unlock tailored insights." }, language)}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default CommandCenter;
