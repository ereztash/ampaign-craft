import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useAchievements } from "@/hooks/useAchievements";
import { useModuleStatus } from "@/hooks/useModuleStatus";
import { generateWeeklyPulse } from "@/engine/pulseEngine";
import { buildUserKnowledgeGraph, buildDefaultKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { calculateHealthScore } from "@/engine/healthScoreEngine";
import { calculateCostOfInaction } from "@/engine/costOfInactionEngine";
import { getRecommendedNextStep } from "@/engine/nextStepEngine";
import { generateBenchmarks } from "@/engine/campaignAnalyticsEngine";
import { assignToCohort } from "@/engine/behavioralCohortEngine";
import { inferDISCProfile } from "@/engine/discProfileEngine";
import { structureForAllPlatforms } from "@/engine/visualExportEngine";
import { computeMotivationState, type BAEInput } from "@/engine/behavioralActionEngine";
import { SavedPlan } from "@/types/funnel";
import BackToHub from "@/components/BackToHub";
import { NudgeBanner } from "@/components/NudgeBanner";
import { PeerBenchmark } from "@/components/PeerBenchmark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crosshair, Rocket, FileText, Flame, Clock, Plus, BarChart3, TrendingUp, DollarSign, Heart, ArrowRight, Sparkles } from "lucide-react";

const Dashboard = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const { streak, mastery } = useAchievements(language);

  const savedPlans = useMemo<SavedPlan[]>(() => {
    try { return JSON.parse(localStorage.getItem("funnelforge-plans") || "[]"); } catch { return []; }
  }, [profile.savedPlanCount]);

  const pulse = useMemo(() => generateWeeklyPulse(savedPlans), [savedPlans]);
  const lastPlan = savedPlans.length > 0 ? [...savedPlans].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())[0] : null;
  const hasDiff = !!localStorage.getItem("funnelforge-differentiation-result");

  // Personalized greeting from knowledge graph
  const graph = useMemo(() => {
    if (profile.lastFormData) return buildUserKnowledgeGraph(profile.lastFormData);
    return null;
  }, [profile.lastFormData]);

  const healthScore = useMemo(() => {
    if (lastPlan) return calculateHealthScore(lastPlan.result);
    return null;
  }, [lastPlan]);

  const nextStep = useMemo(() => {
    const fallbackGraph = graph || buildDefaultKnowledgeGraph();
    return getRecommendedNextStep(fallbackGraph, hasDiff, savedPlans.length, new Set<string>());
  }, [graph, hasDiff, savedPlans.length]);

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
    const coi = lastPlan ? calculateCostOfInaction(lastPlan.result) : undefined;
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
          <BackToHub currentPage={isHe ? "תוכנית שיווק" : "Marketing Plan"} />
          <Card className="mt-8 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/5">
            <CardContent className="p-8 text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground" dir="auto">
                  {isHe ? "ברוך הבא ל-FunnelForge" : "Welcome to FunnelForge"}
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
                  {isHe ? "התחל תוכנית שיווק" : "Start marketing plan"}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2"
                  onClick={() => navigate("/differentiate")}
                >
                  <Crosshair className="h-5 w-5 text-amber-500" aria-hidden="true" />
                  {isHe ? "גלה בידול עמוק" : "Discover differentiation"}
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
              {graph?.derived.identityStatement?.[language] || (isHe ? "ברוך שובך!" : "Welcome Back!")}
            </h1>
            <p className="text-sm text-muted-foreground" dir="auto">
              {healthScore
                ? `${isHe ? "ציון בריאות שיווקית:" : "Marketing Health Score:"} ${healthScore.total}/100 (${healthScore.tier})`
                : (isHe ? "הנה מה שחדש מאז הביקור האחרון שלך" : "Here's what's new since your last visit")}
            </p>
          </div>
          {streak.currentStreak > 0 && (
            <Badge className="gap-1 text-sm"><Flame className="h-4 w-4" /> {streak.currentStreak} {isHe ? "שבועות" : "weeks"}</Badge>
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
                  {isHe ? "קוהורט התנהגותי" : "Behavioral cohort"}:{" "}
                  <strong>{cohortAssignment.primaryCohort.name[language]}</strong>
                  {" "}· {cohortAssignment.matchConfidence}% {isHe ? "התאמה" : "match"}
                </p>
              )}
              {topIndustryInsight && (
                <p className="text-xs text-muted-foreground mt-1" dir="auto">
                  {isHe ? "בנצ'מרק תעשייה" : "Industry benchmark"}:{" "}
                  <strong>{topIndustryInsight.industry}</strong>
                  {" "}· {isHe ? "מדגם" : "n"}={topIndustryInsight.sampleSize}
                  {" "}· {analytics.benchmarks.length} {isHe ? "מדדים" : "metrics"}
                </p>
              )}
              {socialPreview && socialPreview.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1" dir="auto">
                  {isHe ? "גרסאות לרשתות" : "Social variants"}: {socialPreview.length} {isHe ? "פלטפורמות" : "platforms"}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dynamic Next Step CTA (adaptive) */}
        <Card className="mb-6 cursor-pointer hover:shadow-lg transition-all border-2 border-amber-500/30 hover:border-amber-500 bg-gradient-to-r from-amber-500/5 to-transparent" role="button" tabIndex={0} onClick={() => navigate(nextStep.route)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(nextStep.route); } }}>
          <CardContent className="p-5 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
              <Crosshair className={`h-6 w-6 ${nextStep.color}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-foreground text-lg" dir="auto">{nextStep.title[language]}</h3>
                <Badge className="text-xs bg-amber-500 text-white">{isHe ? "מומלץ" : "Recommended"}</Badge>
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
                <p className="text-sm font-medium">{isHe ? "תוכנית חדשה" : "New Plan"}</p>
                <p className="text-xs text-muted-foreground">~2 {isHe ? "דקות" : "min"}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow transition-shadow" role="button" tabIndex={0} onClick={() => navigate("/differentiate")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/differentiate"); } }}>
            <CardContent className="p-3 flex items-center gap-3">
              <Crosshair className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-medium">{isHe ? (hasDiff ? "עדכן בידול" : "גלה בידול") : (hasDiff ? "Update Diff" : "Discover Diff")}</p>
                <p className="text-xs text-muted-foreground">~10 {isHe ? "דקות" : "min"}</p>
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
                {isHe ? "התוכנית האחרונה שלך" : "Your Last Plan"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{lastPlan.name}</p>
                <p className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline me-1" />
                  {new Date(lastPlan.savedAt).toLocaleDateString(isHe ? "he-IL" : "en-US")}
                </p>
              </div>
              <Button size="sm" onClick={() => navigate(`/strategy/${lastPlan.id}`)} className="gap-2">
                {isHe ? "המשך" : "Continue"}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Module Progress */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{isHe ? "מודולים" : "Modules"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-1" role="list" aria-label={isHe ? "התקדמות מודולים" : "Module progress"}>
              {[
                { icon: Crosshair, label: isHe ? "בידול" : "Diff", done: hasDiff, color: "text-amber-500" },
                { icon: BarChart3, label: isHe ? "שיווק" : "Mktg", done: savedPlans.length > 0, color: "text-primary" },
                { icon: TrendingUp, label: isHe ? "מכירות" : "Sales", done: savedPlans.length > 0, color: "text-accent" },
                { icon: DollarSign, label: isHe ? "תמחור" : "Price", done: savedPlans.length > 0, color: "text-emerald-500" },
                { icon: Heart, label: isHe ? "שימור" : "Retain", done: false, color: "text-pink-500" },
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
            <h2 className="text-sm font-bold text-foreground">{isHe ? "תוכניות שמורות" : "Saved Plans"} ({savedPlans.length})</h2>
            <Button size="sm" variant="ghost" onClick={() => navigate("/plans")}>{isHe ? "הצג הכל" : "View All"}</Button>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {savedPlans.slice(0, 4).map((plan) => (
            <Card key={plan.id} className="cursor-pointer hover:shadow transition-shadow" role="button" tabIndex={0} onClick={() => navigate(`/strategy/${plan.id}`)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/strategy/${plan.id}`); } }}>
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate">{plan.name}</p>
                <p className="text-xs text-muted-foreground">{new Date(plan.savedAt).toLocaleDateString(isHe ? "he-IL" : "en-US")}</p>
              </CardContent>
            </Card>
          ))}
        </div>

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
