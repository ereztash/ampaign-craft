import { useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { SavedPlan } from "@/types/funnel";
import ResultsDashboard from "@/components/ResultsDashboard";
import StrategyMap from "@/components/StrategyMap";
import { detectBottlenecks } from "@/engine/bottleneckEngine";
import { calculateHealthScore } from "@/engine/healthScoreEngine";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, FileText, Plus } from "lucide-react";

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
        <div className="container mx-auto max-w-lg px-4 py-10 text-center">
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
        </div>
      );
    }

    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-bold mb-4" dir="auto">
          {isHe ? "בחר תוכנית" : "Choose a plan"}
        </h1>
        <div className="space-y-2">
          {plans
            .slice()
            .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
            .map((p) => (
              <Link key={p.id} to={`/strategy/${p.id}`}>
                <Card className="hover:bg-muted/40 transition-colors">
                  <CardContent className="p-4 flex justify-between items-center">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.savedAt).toLocaleDateString(isHe ? "he-IL" : "en-US")}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
        </div>
      </div>
    );
  }

  const plan = plans.find((p) => p.id === planId) || null;

  if (!plan) {
    return (
      <div className="container mx-auto px-4 py-16 flex flex-col items-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2" dir="auto">
          {isHe ? "התוכנית לא נמצאה" : "Plan not found"}
        </p>
        <Button variant="outline" onClick={() => navigate("/plans")}>
          {isHe ? "חזור לתוכניות" : "Back to plans"}
        </Button>
      </div>
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

  return (
    <div className="px-4 pb-8">
      <div className="mx-auto max-w-5xl pt-4">
        <StrategyMap result={plan.result} bottlenecks={bottlenecks} hasDifferentiation={hasDiff} />
      </div>
      <ResultsDashboard
        result={plan.result}
        defaultTab={focus}
        embeddedInShell
        onEdit={() => navigate("/wizard")}
        onNewPlan={() => navigate("/wizard")}
      />
    </div>
  );
};

export default StrategyCanvas;
