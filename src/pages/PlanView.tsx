
import { useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { SavedPlan } from "@/types/funnel";
import ResultsDashboard from "@/components/ResultsDashboard";
import { Button } from "@/components/ui/button";
import { tx } from "@/i18n/tx";
import { ArrowRight, AlertCircle } from "lucide-react";

const PageComponent = () => {
  const { planId } = useParams<{ planId: string }>();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? undefined;
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
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 pt-8">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground mb-2" dir="auto">
            {tx({ he: "התוכנית לא נמצאה", en: "Plan not found" }, language)}
          </p>
          <Button onClick={() => navigate("/plans")} className="gap-2">
            <ArrowRight className={`h-4 w-4 ${tx({ he: "", en: "rotate-180" }, language)}`} />
            {tx({ he: "חזור לתוכניות", en: "Back to Plans" }, language)}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ResultsDashboard
      result={plan.result}
      defaultTab={tab}
      embeddedInShell
      onEdit={() => navigate("/wizard")}
      onNewPlan={() => navigate("/wizard")}
    />
  );
}

export default PageComponent;
