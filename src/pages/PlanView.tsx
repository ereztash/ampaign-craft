import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { SavedPlan } from "@/types/funnel";
import ResultsDashboard from "@/components/ResultsDashboard";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertCircle } from "lucide-react";

const PlanView = () => {
  const { planId, tab } = useParams<{ planId: string; tab?: string }>();
  const { language } = useLanguage();
  const isHe = language === "he";
  const navigate = useNavigate();

  const plan = useMemo<SavedPlan | null>(() => {
    try {
      const plans: SavedPlan[] = JSON.parse(localStorage.getItem("funnelforge-plans") || "[]");
      return plans.find((p) => p.id === planId) || null;
    } catch { return null; }
  }, [planId]);

  if (!plan) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground mb-2" dir="auto">
            {isHe ? "התוכנית לא נמצאה" : "Plan not found"}
          </p>
          <Button onClick={() => navigate("/plans")} className="gap-2">
            <ArrowRight className={`h-4 w-4 ${isHe ? "" : "rotate-180"}`} />
            {isHe ? "חזור לתוכניות" : "Back to Plans"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ResultsDashboard
      result={plan.result}
      defaultTab={tab}
      onEdit={() => navigate("/wizard")}
      onNewPlan={() => navigate("/wizard")}
    />
  );
};

export default PlanView;
