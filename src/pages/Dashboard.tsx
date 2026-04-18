import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useAchievements } from "@/hooks/useAchievements";
import { useModuleStatus } from "@/hooks/useModuleStatus";
import { generateWeeklyPulse } from "@/engine/pulseEngine";
import { buildUserKnowledgeGraph, buildDefaultKnowledgeGraph, loadChatInsights, loadImportedDataSignals, loadMetaSignals } from "@/engine/userKnowledgeGraph";
import { calculateHealthScore } from "@/engine/healthScoreEngine";
import { calculateCostOfInaction } from "@/engine/costOfInactionEngine";
import { safeStorage } from "@/lib/safeStorage";
import { assessChurnRisk } from "@/engine/churnPredictionEngine";
import { getRecommendedNextStep } from "@/engine/nextStepEngine";
import { ChurnPredictionCard } from "@/components/ChurnPredictionCard";
import ReferralDashboard from "@/components/ReferralDashboard";
import { Analytics } from "@/lib/analytics";
import { useAuth } from "@/contexts/AuthContext";
import { useArchetypePipeline } from "@/hooks/useArchetypePipeline";
import { getPrimaryCtaVerbs } from "@/engine/behavioralHeuristicEngine";
import { useArchetype } from "@/contexts/ArchetypeContext";
import { generateBenchmarks } from "@/engine/campaignAnalyticsEngine";
import { assignToCohort } from "@/engine/behavioralCohortEngine";
import { inferDISCProfile } from "@/engine/discProfileEngine";
import { structureForAllPlatforms } from "@/engine/visualExportEngine";
import { computeMotivationState, type BAEInput } from "@/engine/behavioralActionEngine";
import { SavedPlan } from "@/types/funnel";
import BackToHub from "@/components/BackToHub";
import ArchetypeProfileCard from "@/components/ArchetypeProfileCard";
import { NudgeBanner } from "@/components/NudgeBanner";
import { PeerBenchmark } from "@/components/PeerBenchmark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tx } from "@/i18n/tx";
import { Crosshair, Rocket, FileText, Flame, Clock, Plus, BarChart3, TrendingUp, DollarSign, Heart, ArrowRight, Sparkles } from "lucide-react";

const Dashboard = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { profile } = useUserProfile();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Track weekly active on Dashboard mount per distinct user.id.
  // Wrapping in useMemo (not useEffect) keeps the analytics emit inline with
  // first paint instead of after; deps include only user.id so we don't fire
  // when the user object reference changes.
  const trackedUserId = user?.id;
  useMemo(() => {
    if (trackedUserId) Analytics.weeklyActive(trackedUserId);
  }, [trackedUserId]);
  const { streak, mastery } = useAchievements(language);

  // Re-read plans from storage when count changes (proxy for non-reactive key).
  const savedPlans = useMemo<SavedPlan[]>(
    () => safeStorage.getJSON<SavedPlan[]>("funnelforge-plans", []),
    [profile.savedPlanCount], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const pulse = useMemo(() => generateWeeklyPulse(savedPlans), [savedPlans]);
  const lastPlan = savedPlans.length > 0 ? [...savedPlans].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())[0] : null;
  const hasDiff = !!safeStorage.getString("funnelforge-differentiation-result", "");

  // Personalized greeting from knowledge graph
  const graph = useMemo(() => {
    if (profile.lastFormData) return buildUserKnowledgeGraph(
      profile.lastFormData, undefined, undefined, undefined, undefined,
      { chatInsights: loadChatInsights(), importedData: loadImportedDataSignals(), metaSignals: loadMetaSignals() },
    );
    return null;
  }, [profile.lastFormData]);

  const healthScore = useMemo(() => {
    if (lastPlan) return calculateHealthScore(lastPlan.result, graph ?? undefined);
    return null;
  }, [lastPlan, graph]);

  const churnRisk = useMemo(() => {
    if (lastPlan) return assessChurnRisk(lastPlan.result.formData);
    return null;
  }, [lastPlan]);

  const staticNextStep = useMemo(() => {
    const fallbackGraph = graph || buildDefaultKnowledgeGraph();
    return getRecommendedNextStep(fallbackGraph, hasDiff, savedPlans.length, new Set<string>());
  }, [graph, hasDiff, savedPlans.length]);

  const { effectiveArchetypeId, confidenceTier } = useArchetype();
  const ctaVerbs = getPrimaryCtaVerbs(effectiveArchetypeId);
  const { nextStep: pipelineNextStep, isActive: pipelineActive } = useArchetypePipeline();

  // Resolve which next step to show — pipeline takes precedence when active
  const nextStep = pipelineActive && pipelineNextStep
    ? {
        route: pipelineNextStep.routePath,
        title: pipelineNextStep.label,
        description: pipelineNextStep.frictionReason,
        color: "text-primary",
      }
    : {
        route: staticNextStep.route,
        title: staticNextStep.title,
        description: staticNextStep.description,
        color: staticNextStep.color,
      };

  // Campaign analytics benchmarks — computed from the user's own saved plans.
  const analytics = useMemo(() => generateBenchmarks(savedPlans), [savedPlans]);
  const topIndustryInsight = analytics.industryInsights[0] ?? null;

  // Behavioral cohort assignment — driven by the latest form data + DISC.
  const cohortAssignment = useMemo(() => {
    if (!profile.lastFormData) return null;
    const disc = inferDISCProfile(profile.lastFormData, graph);
    return assignToCohort(
      profile.lastFormData,
      disc,
      healthScore?.total,
      undefined,
    );
  }, [profile.lastFormData, graph, healthScore?.total]);

  const modules = useModuleStatus();
  const completedModules = modules.filter((m) => m.completed).length;
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  const motivationState = useMemo(() => {
    const disc = profile.lastFormData ? inferDISCProfile(profile.lastFormData, graph) : undefined;
    const coi = lastPlan ? calculateCostOfInaction(lastPlan.result, graph ?? undefined) : undefined;
    const baeInput: BAEInput = {
      healthScore: healthScore ?? undefined,
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
  }, [lastPlan, profile, modules, completedModules, streak, graph, healthScore]);

  const socialPreview = useMemo(() => {
    if (!pulse?.greeting) return null;
    const source = pulse.greeting[language] ?? pulse.greeting.en;
    return structureForAllPlatforms(source, language === "he" ? "he" : "en");
  }, [pulse?.greeting, language]);

  // Truly-empty state: first-time visitor with no plan, no differentiation,
  // and no form data yet. Show a focused welcome card rather than 12 empty
  // placeholders.
  const isFirstTimeUser = savedPlans.length === 0 && !hasDiff && !profile.lastFormData;

  if (isFirstTimeUser) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 pt-4 pb-16 max-w-4xl">
          <BackToHub currentPage={tx({ he: "תוכנית שיווק", en: "Marketing Plan" }, language)} />
          <Card className="mt-8 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/5">
            <CardContent className="p-8 text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground" dir="auto">
                  {tx({ he: "ברוך הבא ל-FunnelForge", en: "Welcome to FunnelForge" }, language)}
                </h1>
                <p className="text-sm text-muted-foreground max-w-md mx-auto" dir="auto">
                  {isHe
                    ? "בוא נתחיל ביצירת תוכנית השיווק הראשונה שלך. לוקח כ-2 דקות."
                    : "Let's start by building your first marketing plan. Takes about 2 minutes."}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button
                  size="lg"
                  className="gap-2 funnel-gradient border-0 text-accent-foreground"
                  onClick={() => navigate("/wizard")}
                >
                  <Rocket className="h-5 w-5" aria-hidden="true" />
                  {tx({ he: "התחל תוכנית שיווק", en: "Start marketing plan" }, language)}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2"
                  onClick={() => navigate("/differentiate")}
                >
                  <Crosshair className="h-5 w-5 text-amber-500" aria-hidden="true" />
                  {tx({ he: "גלה בידול עמוק", en: "Discover differentiation" }, language)}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground pt-4">
                {isHe
                  ? "אין צורך בכרטיס אשראי · התוצאות נשמרות מקומית"
                  : "No credit card needed · Results saved locally"}
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pt-4 pb-16 max-w-4xl">
        <BackToHub currentPage={language === "he" ? "תוכנית שיווק" : "Marketing Plan"} />

        {/* Welcome + Streak */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground" dir="auto">
              {graph?.derived.identityStatement?.[language] || (tx({ he: "ברוך שובך!", en: "Welcome Back!" }, language))}
            </h1>
            <p className="text-sm text-muted-foreground" dir="auto">
              {healthScore
                ? `${confidenceTier !== "none" ? `${ctaVerbs.primary[language]} · ` : ""}${tx({ he: "ציון בריאות שיווקית:", en: "Marketing Health Score:" }, language)} ${healthScore.total}/100 (${healthScore.tier})`
                : (tx({ he: "הנה מה שחדש מאז הביקור האחרון שלך", en: "Here's what's new since your last visit" }, language))}
            </p>
          </div>
          {streak.currentStreak > 0 && (
            <Badge className="gap-1 text-sm"><Flame className="h-4 w-4" /> {streak.currentStreak} {tx({ he: "שבועות", en: "weeks" }, language)}</Badge>
          )}
        </div>

        {/* Behavioral Nudge */}
        {!nudgeDismissed && motivationState.nudge && (
          <NudgeBanner nudge={motivationState.nudge} onDismiss={() => setNudgeDismissed(true)} />
        )}

        {/* Weekly Pulse */}
        {pulse && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-foreground" dir="auto">{pulse.greeting[language]}</p>
              {pulse.lossFramedMessages[0] && (
                <p className="text-xs text-muted-foreground mt-1" dir="auto">{pulse.lossFramedMessages[0].message[language]}</p>
              )}
              {cohortAssignment && (
                <p className="text-xs text-muted-foreground mt-2" dir="auto">
                  {tx({ he: "קוהורט התנהגותי", en: "Behavioral cohort" }, language)}:{" "}
                  <strong>{cohortAssignment.primaryCohort.name[language]}</strong>
                  {" "}· {cohortAssignment.matchConfidence}% {tx({ he: "התאמה", en: "match" }, language)}
                </p>
              )}
              {topIndustryInsight && (
                <p className="text-xs text-muted-foreground mt-1" dir="auto">
                  {tx({ he: "בנצ'מרק תעשייה", en: "Industry benchmark" }, language)}:{" "}
                  <strong>{topIndustryInsight.industry}</strong>
                  {" "}· {tx({ he: "מדגם", en: "n" }, language)}={topIndustryInsight.sampleSize}
                  {" "}· {analytics.benchmarks.length} {tx({ he: "מדדים", en: "metrics" }, language)}
                </p>
              )}
              {socialPreview && socialPreview.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1" dir="auto">
                  {tx({ he: "גרסאות לרשתות", en: "Social variants" }, language)}: {socialPreview.length} {tx({ he: "פלטפורמות", en: "platforms" }, language)}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Adaptive Archetype Profile — Glass Box personalization card */}
        <ArchetypeProfileCard />

        {/* Dynamic Next Step CTA (adaptive) */}
        <Card className="mb-6 cursor-pointer hover:shadow-lg transition-all border-2 border-amber-500/30 hover:border-amber-500 bg-gradient-to-r from-amber-500/5 to-transparent" role="button" tabIndex={0} onClick={() => navigate(nextStep.route)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(nextStep.route); } }}>
          <CardContent className="p-5 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
              <Crosshair className={`h-6 w-6 ${nextStep.color}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-foreground text-lg" dir="auto">{nextStep.title[language]}</h3>
                <Badge className="text-xs bg-amber-500 text-white">{tx({ he: "מומלץ", en: "Recommended" }, language)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground" dir="auto">{nextStep.description[language]}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0 rtl:rotate-180" aria-hidden="true" />
          </CardContent>
        </Card>

        {/* Secondary quick actions */}
        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          <Card className="cursor-pointer hover:shadow transition-shadow" role="button" tabIndex={0} onClick={() => navigate("/wizard")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/wizard"); } }}>
            <CardContent className="p-3 flex items-center gap-3">
              <Rocket className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">{tx({ he: "תוכנית חדשה", en: "New Plan" }, language)}</p>
                <p className="text-xs text-muted-foreground">~2 {tx({ he: "דקות", en: "min" }, language)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow transition-shadow" role="button" tabIndex={0} onClick={() => navigate("/differentiate")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/differentiate"); } }}>
            <CardContent className="p-3 flex items-center gap-3">
              <Crosshair className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-medium">{isHe ? (hasDiff ? "עדכן בידול" : "גלה בידול") : (hasDiff ? "Update Diff" : "Discover Diff")}</p>
                <p className="text-xs text-muted-foreground">~10 {tx({ he: "דקות", en: "min" }, language)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Last Plan */}
        {lastPlan && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                {tx({ he: "התוכנית האחרונה שלך", en: "Your Last Plan" }, language)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{lastPlan.name}</p>
                <p className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline me-1" />
                  {new Date(lastPlan.savedAt).toLocaleDateString(tx({ he: "he-IL", en: "en-US" }, language))}
                </p>
              </div>
              <Button size="sm" onClick={() => navigate(`/strategy/${lastPlan.id}`)} className="gap-2">
                {tx({ he: "המשך", en: "Continue" }, language)}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Module Progress */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{tx({ he: "מודולים", en: "Modules" }, language)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-1" role="list" aria-label={tx({ he: "התקדמות מודולים", en: "Module progress" }, language)}>
              {[
                { icon: Crosshair, label: tx({ he: "בידול", en: "Diff" }, language), done: hasDiff, color: "text-amber-500" },
                { icon: BarChart3, label: tx({ he: "שיווק", en: "Mktg" }, language), done: savedPlans.length > 0, color: "text-primary" },
                { icon: TrendingUp, label: tx({ he: "מכירות", en: "Sales" }, language), done: savedPlans.length > 0, color: "text-accent" },
                { icon: DollarSign, label: tx({ he: "תמחור", en: "Price" }, language), done: savedPlans.length > 0, color: "text-emerald-500" },
                { icon: Heart, label: tx({ he: "שימור", en: "Retain" }, language), done: false, color: "text-pink-500" },
              ].map((mod, i, arr) => (
                <div key={i} className="flex items-center gap-1" role="listitem">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        mod.done ? "bg-accent/20" : "bg-muted"
                      }`}
                    >
                      <mod.icon className={`h-5 w-5 ${mod.done ? mod.color : "text-muted-foreground"}`} />
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{mod.label}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowRight
                      className="h-3 w-3 text-muted-foreground/50 shrink-0 mb-4 rtl:rotate-180"
                      aria-hidden="true"
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Peer Benchmark */}
        <PeerBenchmark
          businessField={profile.lastFormData?.businessField || "other"}
          healthScore={healthScore?.total}
          modulesCompleted={completedModules}
          modulesTotal={modules.length}
        />

        {/* Saved Plans */}
        {savedPlans.length > 0 && (
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground">{tx({ he: "תוכניות שמורות", en: "Saved Plans" }, language)} ({savedPlans.length})</h2>
            <Button size="sm" variant="ghost" onClick={() => navigate("/plans")}>{tx({ he: "הצג הכל", en: "View All" }, language)}</Button>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {savedPlans.slice(0, 4).map((plan) => (
            <Card key={plan.id} className="cursor-pointer hover:shadow transition-shadow" role="button" tabIndex={0} onClick={() => navigate(`/strategy/${plan.id}`)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/strategy/${plan.id}`); } }}>
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate">{plan.name}</p>
                <p className="text-xs text-muted-foreground">{new Date(plan.savedAt).toLocaleDateString(tx({ he: "he-IL", en: "en-US" }, language))}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Churn Risk (Phase 3 AARRR — Retention) */}
        {churnRisk && (
          <section>
            <ChurnPredictionCard assessment={churnRisk} />
          </section>
        )}

        {/* Referral Dashboard (Phase 5 AARRR — Referral) */}
        <section>
          <ReferralDashboard />
        </section>

        {/* New Plan FAB */}
        <div className="fixed bottom-20 end-4 z-30">
          <Button size="lg" className="rounded-full h-14 w-14 shadow-lg funnel-gradient border-0" onClick={() => navigate("/wizard")}>
            <Plus className="h-6 w-6 text-accent-foreground" />
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
