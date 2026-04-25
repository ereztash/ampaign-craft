
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { getLatestPlanResult } from "@/lib/minimalFormDefaults";
import BackToHub from "@/components/BackToHub";
import SalesTab from "@/components/SalesTab";
import { ModuleNextStep } from "@/components/ModuleNextStep";
import { DidThisHelp } from "@/components/DidThisHelp";
import { Button } from "@/components/ui/button";
import { tx } from "@/i18n/tx";
import { TrendingUp } from "lucide-react";
import Illustration from "@/components/ui/illustration";
import IntakePromiseHeader from "@/components/intake/IntakePromiseHeader";

const PageComponent = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const navigate = useNavigate();
  const result = useMemo(() => getLatestPlanResult(), []);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pt-4 pb-16 max-w-5xl">
        <BackToHub currentPage={language === "he" ? "מכירות" : "Sales"} />
        <IntakePromiseHeader moduleTarget="/sales" suppress={!!result} />
        {result ? (
          <>
            <SalesTab result={result} />
            <ModuleNextStep current={3} />
            <DidThisHelp module="sales" className="mt-4 justify-center" />
          </>
        ) : (
          <div className="text-center py-16 space-y-4">
            <Illustration type="sales" size={96} className="text-accent mx-auto" />
            <h2 className="text-2xl font-bold" dir="auto">{tx({ he: "סקריפטי מכירה מותאמים", en: "Personalized Sales Scripts" }, language)}</h2>
            <p className="text-muted-foreground max-w-md mx-auto" dir="auto">
              {tx({ he: "כדי לייצר סקריפטים מותאמים, צריך קודם לבנות תוכנית שיווק", en: "To generate personalized scripts, first build a marketing plan" }, language)}
            </p>
            <Button onClick={() => navigate("/wizard")} className="cta-warm">{tx({ he: "בנה תוכנית (2 דק')", en: "Build Plan (2 min)" }, language)}</Button>
          </div>
        )}
      </main>
    </div>
  );
}

export default PageComponent;
