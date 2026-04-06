import { useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { getLatestPlanResult } from "@/lib/minimalFormDefaults";
import Header from "@/components/Header";
import BackToHub from "@/components/BackToHub";
import RetentionGrowthTab from "@/components/RetentionGrowthTab";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RetentionEntry = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const navigate = useNavigate();
  const result = useMemo(() => getLatestPlanResult(), []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-20 pb-16 max-w-5xl">
        <BackToHub />
        {result ? (
          <RetentionGrowthTab result={result} />
        ) : (
          <div className="text-center py-16 space-y-4">
            <Heart className="h-12 w-12 text-pink-500 mx-auto" />
            <h2 className="text-2xl font-bold" dir="auto">{isHe ? "שימור וצמיחה" : "Retention & Growth"}</h2>
            <p className="text-muted-foreground max-w-md mx-auto" dir="auto">
              {isHe ? "כדי לייצר אסטרטגיית שימור, צריך קודם לבנות תוכנית שיווק" : "To generate a retention strategy, first build a marketing plan"}
            </p>
            <Button onClick={() => navigate("/wizard")} className="cta-warm">{isHe ? "בנה תוכנית (2 דק')" : "Build Plan (2 min)"}</Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default RetentionEntry;
