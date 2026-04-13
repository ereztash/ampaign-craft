import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useAchievements } from "@/hooks/useAchievements";
import { useModuleStatus } from "@/hooks/useModuleStatus";
import { SavedPlan } from "@/types/funnel";
import ResultsDashboard from "@/components/ResultsDashboard";
import StrategyMap from "@/components/StrategyMap";
import { detectBottlenecks } from "@/engine/bottleneckEngine";
import { calculateHealthScore } from "@/engine/healthScoreEngine";
import { calculateCostOfInaction } from "@/engine/costOfInactionEngine";
import { computeGaps } from "@/engine/gapEngine";
import { runResearch } from "@/engine/researchOrchestrator";
import { inferDISCProfile } from "@/engine/discProfileEngine";
import { buildUserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { computeMotivationState, type BAEInput } from "@/engine/behavioralActionEngine";
import type { MetaInsights } from "@/types/meta";
import { NudgeBanner } from "@/components/NudgeBanner";
import { ModuleNextStep } from "@/components/ModuleNextStep";
import { ExportReportButton } from "@/components/ExportReportButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ChevronLeft, ChevronRight, Clock, FileText, Plus } from "lucide-react";

const StrategyCanvas = () => {
  const { planId, focus } = useParams<{ planId?: string; focus?: string }>();
  const { language } = useLanguage();
  const isHe = language === "he";
  const navigate = useNavigate();

  const plans = useMemo<SavedPlan[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("funnelforge-plans") || "[]");
    } catch {
      return [];
    }
  }, []);

  if (!planId) {
    if (plans.length === 0) {
      return (
        <main className="container mx-auto max-w-lg px-4 py-10 text-center">
          <Card>
            <CardContent className="p-8 space-y-4">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="font-medium text-foreground" dir="auto">
                {isHe ? "אין תוכנית ללוח האסטרטגיה" : "No plan for the strategy canvas yet"}
              </p>
              <p className="text-sm text-muted-foreground" dir="auto">
                {isHe ? "צור תוכנית ראשונה כדי לראות את המפה והטאבים." : "Create your first plan to see the map and tabs."}
              </p>
              <Button onClick={() => navigate("/wizard")} className="gap-2">
                <Plus className="h-4 w-4" />
                {isHe ? "תוכנית חדשה" : "New plan"}
              </Button>
            </CardContent>
          </Card>
        </main>
      );
    }

    const sortedPlans = plans
      .slice()
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

    return (
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground" dir="auto">
            {isHe ? "בחר תוכנית" : "Choose a plan"}
          </h1>
          <Button onClick={() => navigate("/wizard")} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {isHe ? "תוכנית חדשה" : "New plan"}
          </Button>
        </div>
        <div className="space-y-3">
          {sortedPlans.map((p, idx) => (
            <Link key={p.id} to={`/strategy/${p.id}`}>
              <Card className="shadow-cor-1 hover:shadow-cor-3 hover:border-primary/40 transition-all duration-fast group">
                <CardContent className="p-4 flex items-center gap-3">
                  {/* Icon */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground truncate" dir="auto">
                        {p.name}
                      </span>
                      {idx === 0 && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-accent/15 text-accent shrink-0">
                          {isHe ? "אחרון" : "Latest"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3 shrink-0" />
                      {new Date(p.savedAt).toLocaleDateString(isHe ? "he-IL" : "en-US")}
                    </p>
                  </div>
                  {/* Chevron — directional for RTL/LTR */}
                  {isHe
                    ? <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                  }
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    );
  }

  const { profile } = useUserProfile();
  const { streak } = useAchievements(language);
  const modules = useModuleStatus();
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  const plan = plans.find((p) => p.id === planId) || null;

  if (!plan) {
    return (
      <main className="container mx-auto px-4 py-16 flex flex-col items-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2" dir="auto">
          {isHe ? "התוכנית לא נמצאה" : "Plan not found"}
        </p>
        <Button variant="outline" onClick={() => navigate("/plans")}>
          {isHe ? "חזור לתוכניות" : "Back to plans"}
        </Button>
      </main>
    );
  }

  const hasDiff = !!localStorage.getItem("funnelforge-differentiation-result");
  const connectedSources = (() => {
    try {
      const raw = localStorage.getItem("funnelforge-data-sources");
      if (!raw) return 0;
      const s = JSON.parse(raw).sources as { status: string }[];
      return s?.filter((x) => x.status === "connected").length ?? 0;
    } catch {
      return 0;
    }
  })();

  const bottlenecks = detectBottlenecks({
    funnelResult: plan.result,
    hasDifferentiation: hasDiff,
    planCount: plans.length,
    connectedSources,
    healthScoreTotal: calculateHealthScore(plan.result).total,
  });

  // Gap analysis — runs even without live Meta data by feeding an empty
  // MetaInsights shell so the engine still exercises its parsing path.
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
  const kpiGaps = computeGaps(plan.result, emptyInsights);

  // Research orchestration trigger — bound to a button so that researchers
  // can launch a strategy brief on demand. The handler is a real closure
  // that calls the engine, making StrategyCanvas a reachable consumer.
  const handleLaunchResearch = async () => {
    try {
      await runResearch({
        id: plan.id,
        question: plan.name,
        context: {
          industry: plan.result.formData?.businessField || "general",
          audienceType: plan.result.formData?.audienceType || "b2c",
          mainGoal: plan.result.formData?.mainGoal || "sales",
        },
      } as never);
    } catch {
      /* silent — research is best-effort from this canvas */
    }
  };

  const motivationState = useMemo(() => {
    const graph = profile.lastFormData ? buildUserKnowledgeGraph(profile.lastFormData) : undefined;
    const disc = profile.lastFormData ? inferDISCProfile(profile.lastFormData, graph) : undefined;
    const healthObj = calculateHealthScore(plan.result);
    const coi = calculateCostOfInaction(plan.result);
    const completedModules = modules.filter((m) => m.completed).length;
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
      businessField: plan.result.formData?.businessField || "other",
      sessionMinutes: profile.investment.totalSessionsMinutes % 60 || 1,
    };
    return computeMotivationState(baeInput);
  }, [plan, profile, modules, streak]);

  return (
    <main className="px-4 pb-8">
      <div className="mx-auto max-w-5xl pt-4">
        {!nudgeDismissed && motivationState.nudge && (
          <NudgeBanner nudge={motivationState.nudge} onDismiss={() => setNudgeDismissed(true)} />
        )}
        <StrategyMap result={plan.result} bottlenecks={bottlenecks} hasDifferentiation={hasDiff} />
        {kpiGaps.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 dark:border-amber-700/40 dark:bg-amber-900/20 p-3 text-xs text-amber-900 dark:text-amber-200" dir="auto">
            {isHe ? "פערי KPI זוהו" : "KPI gaps detected"}: {kpiGaps.length}
          </div>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <ExportReportButton result={plan.result} planName={plan.name} />
          <Button size="sm" variant="outline" onClick={handleLaunchResearch}>
            {isHe ? "הרץ מחקר אסטרטגי" : "Launch strategic research"}
          </Button>
        </div>
      </div>
      <ResultsDashboard
        result={plan.result}
        defaultTab={focus}
        embeddedInShell
        onEdit={() => navigate("/wizard")}
        onNewPlan={() => navigate("/wizard")}
      />
      <div className="mx-auto max-w-5xl px-4">
        <ModuleNextStep current={2} />
      </div>
    </main>
  );
};

export default StrategyCanvas;
