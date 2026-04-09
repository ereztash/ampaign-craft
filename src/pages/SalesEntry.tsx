
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { getLatestPlanResult } from "@/lib/minimalFormDefaults";
import BackToHub from "@/components/BackToHub";
import SalesTab from "@/components/SalesTab";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import Illustration from "@/components/ui/illustration";

const PageComponent = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const navigate = useNavigate();
  const result = useMemo(() => getLatestPlanResult(), []);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pt-4 pb-16 max-w-5xl">
        <BackToHub currentPage={language === "he" ? "מכירות" : "Sales"} />
        {result ? (
          <SalesTab result={result} />
        ) : (
          <div className="text-center py-16 space-y-4">
            <Illustration type="sales" size={96} className="text-accent mx-auto" />
            <h2 className="text-2xl font-bold" dir="auto">{isHe ? "סקריפטי מכירה מותאמים" : "Personalized Sales Scripts"}</h2>
            <p className="text-muted-foreground max-w-md mx-auto" dir="auto">
              {isHe ? "כדי לייצר סקריפטים מותאמים, צריך קודם לבנות תוכנית שיווק" : "To generate personalized scripts, first build a marketing plan"}
            </p>
            <Button onClick={() => navigate("/wizard")} className="cta-warm">{isHe ? "בנה תוכנית (2 דק')" : "Build Plan (2 min)"}</Button>
          </div>
        )}
      </main>
    </div>
  );
}

export default PageComponent;
