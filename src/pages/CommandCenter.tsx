import { useMemo, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useDataSources } from "@/contexts/DataSourceContext";
import { buildUserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { calculateHealthScore } from "@/engine/healthScoreEngine";
import { calculateCostOfInaction } from "@/engine/costOfInactionEngine";
import { generateWeeklyPulse } from "@/engine/pulseEngine";
import { detectBottlenecks } from "@/engine/bottleneckEngine";
import { computeGaps } from "@/engine/gapEngine";
import { generateGuidance } from "@/engine/guidanceEngine";
import { predictSuccess } from "@/engine/predictiveEngine";
import { generateBenchmarks } from "@/engine/campaignAnalyticsEngine";
import { assignVariant, createABExperiment } from "@/engine/abTestEngine";
import { inferDISCProfile } from "@/engine/discProfileEngine";
import { computeMotivationState, type BAEInput } from "@/engine/behavioralActionEngine";
import type { MetaInsights } from "@/types/meta";
import { useAchievements } from "@/hooks/useAchievements";
import { useModuleStatus } from "@/hooks/useModuleStatus";
import { getTotalUsers } from "@/lib/socialProofData";
import BusinessPulseBar from "@/components/BusinessPulseBar";
import InsightFeed from "@/components/InsightFeed";
import { NudgeBanner } from "@/components/NudgeBanner";
import { ProgressMomentum } from "@/components/ProgressMomentum";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SavedPlan } from "@/types/funnel";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Database, Wand2, Compass, Map, Users } from "lucide-react";
import ExpressWizard from "@/components/ExpressWizard";
import { InsightsCard } from "@/components/InsightsCard";
import { AnalyticsConnectCard } from "@/components/AnalyticsConnectCard";
import { useArchetype } from "@/contexts/ArchetypeContext";
import { getPrimaryCtaVerbs } from "@/engine/behavioralHeuristicEngine";
import ArchetypePipelineGuide from "@/components/ArchetypePipelineGuide";

const CommandCenter = () => {
  const { language, t } = useLanguage();
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

  const plans = useMemo((): SavedPlan[] => {
    try {
      return JSON.parse(localStorage.getItem("funnelforge-plans") || "[]");
    } catch {
      return [];
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.savedPlanCount, profile.lastPlanSummary, location.key]);

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

  const hasDiff = !!localStorage.getItem("funnelforge-differentiation-result");
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

  // Deterministic A/B assignment for the command-center CTA. This makes
  // the abTestEngine a real runtime consumer of pages/components.
  const ctaExperiment = useMemo(
    () => createABExperiment("command_center_cta", "Command Center CTA"),
    [],
  );
  const ctaVariant = useMemo(
    () => assignVariant(user?.id ?? "anon", ctaExperiment),
    [ctaExperiment, user?.id],
  );

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
  const ctaVerbs = getPrimaryCtaVerbs(effectiveArchetypeId);
  const hasArchetype = confidenceTier !== "none";

  const mp = reducedMotion ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

  return (
    <main className="min-h-full bg-background">
      <div className="container mx-auto max-w-5xl px-4 py-6 space-y-8">
        <motion.section {...mp} className="text-center space-y-2">
          {user && profile.lastFormData ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground" dir="auto">
                {graph.derived.identityStatement[language]}
              </h1>
              <p className="text-sm text-muted-foreground" dir="auto">
                {hasArchetype
                  ? `${ctaVerbs[language]} · ${isHe ? "סקירת עסק ותובנות בזמן אמת" : "Live business snapshot"}`
                  : isHe ? "סקירת עסק ותובנות בזמן אמת" : "Live business snapshot and intelligence"}
              </p>
            </>
          ) : showExpressWizard ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground md:text-4xl" dir="auto">
                {isHe ? "בוא נתחיל — 2 לחיצות ויש לך תוכנית" : "Let's start — 2 clicks and you have a plan"}
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto" dir="auto">
                {isHe
                  ? `${totalUsers.toLocaleString()}+ בעלי עסקים כבר בפנים.`
                  : `${totalUsers.toLocaleString()}+ business owners inside.`}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground md:text-4xl" dir="auto">
                {isHe ? "הפוך נתונים לאסטרטגיה" : "Turn data into strategy"}
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto" dir="auto">
                {isHe
                  ? `${totalUsers.toLocaleString()}+ בעלי עסקים כבר בפנים. התחל מחיבור נתונים או תוכנית ראשונה.`
                  : `${totalUsers.toLocaleString()}+ business owners inside. Start by connecting data or your first plan.`}
              </p>
            </>
          )}
        </motion.section>

        <BusinessPulseBar
          healthTotal={healthTotal}
          connectedSources={connectedCount}
          bottleneckCount={bottlenecks.filter((b) => b.severity === "critical" || b.severity === "warning").length}
          planCount={plans.length}
          streakWeeks={streak.currentStreak}
          completedModules={completedModules}
          totalModules={modules.length}
        />

        {isNewUser && showExpressWizard && (
          <div className="space-y-2">
            <ExpressWizard onComplete={(data) => {
              localStorage.setItem("funnelforge-last-form", JSON.stringify(data));
              setShowExpressWizard(false);
              navigate("/wizard", { state: { expressData: data } });
            }} />
            <p className="text-center text-xs text-muted-foreground" dir="auto">
              <button className="underline hover:text-foreground" onClick={() => { setShowExpressWizard(false); navigate("/wizard"); }}>
                {isHe ? "מעדיף שליטה מלאה? עבור לאשף המלא" : "Prefer full control? Switch to full wizard"}
              </button>
            </p>
          </div>
        )}

        {!nudgeDismissed && motivationState.nudge && (
          <NudgeBanner nudge={motivationState.nudge} onDismiss={() => setNudgeDismissed(true)} />
        )}

        {(guidanceItems.length > 0 || successForecast) && (
          <div className="rounded-xl border border-blue-200/60 bg-blue-50/40 dark:border-blue-700/40 dark:bg-blue-900/20 p-4 text-start space-y-1">
            {guidanceItems.length > 0 && (
              <p className="text-xs text-blue-900 dark:text-blue-200" dir="auto">
                {isHe ? "הדרכה" : "Guidance"}: {guidanceItems.length} {isHe ? "פעולות מומלצות" : "recommended actions"}
              </p>
            )}
            {successForecast && (
              <p className="text-xs text-blue-900 dark:text-blue-200" dir="auto">
                {isHe ? "הסתברות הצלחה חזויה" : "Predicted success"}:{" "}
                <strong>{successForecast.successProbability}%</strong>
                {" "}· {successForecast.riskFactors.length} {isHe ? "סיכונים" : "risks"}
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
            />
          </div>
          <div className="lg:col-span-2 space-y-3">
            {hasArchetype ? (
              // Archetype pipeline guide replaces static quick actions (H5: Choice Architecture)
              <ArchetypePipelineGuide />
            ) : (
              // Cold-start fallback: static quick actions
              <>
                <h2 className="text-lg font-bold text-foreground px-1" dir="auto">
                  {isHe ? "פעולות מהירות" : "Quick actions"}
                </h2>
                <Card>
                  <CardContent className="p-4 grid gap-2">
                    <Button className="w-full justify-start gap-2" variant={ctaVariant.id.endsWith("_treatment") ? "default" : "outline"} onClick={() => navigate("/data")}>
                      <Database className="h-4 w-4" />
                      {isHe ? "חבר מקור נתונים" : "Connect data source"}
                    </Button>
                    <Button className="w-full justify-start gap-2" variant="outline" onClick={() => navigate("/wizard")}>
                      <Wand2 className="h-4 w-4" />
                      {isHe ? "תוכנית חדשה" : "New plan"}
                    </Button>
                    <Button className="w-full justify-start gap-2" variant="outline" onClick={() => navigate("/differentiate")}>
                      <Compass className="h-4 w-4" />
                      {isHe ? "בידול" : "Differentiation"}
                    </Button>
                    <Button className="w-full justify-start gap-2" variant="outline" onClick={() => navigate(plans.length ? `/strategy/${latestPlan?.id}` : "/strategy")}>
                      <Map className="h-4 w-4" />
                      {t("navStrategyCanvas")}
                    </Button>
                    <Button className="w-full justify-start gap-2" variant="outline" onClick={() => navigate("/crm")}>
                      <Users className="h-4 w-4" />
                      {isHe ? "ניהול לידים (CRM)" : "Lead Management (CRM)"}
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
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
                {isHe ? "חבר את המקור הראשון כדי לפתוח תובנות מותאמות." : "Connect your first source to unlock tailored insights."}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default CommandCenter;
