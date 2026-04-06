import { useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { getLatestPlanResult } from "@/lib/minimalFormDefaults";
import Header from "@/components/Header";
import PricingIntelligenceTab from "@/components/PricingIntelligenceTab";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PricingEntry = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const navigate = useNavigate();
  const result = useMemo(() => getLatestPlanResult(), []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-20 pb-16 max-w-5xl">
        {result ? (
          <PricingIntelligenceTab result={result} />
        ) : (
          <div className="text-center py-16 space-y-4">
            <DollarSign className="h-12 w-12 text-emerald-500 mx-auto" />
            <h2 className="text-2xl font-bold" dir="auto">{isHe ? "אינטליגנציית תמחור" : "Pricing Intelligence"}</h2>
            <p className="text-muted-foreground max-w-md mx-auto" dir="auto">
              {isHe ? "כדי לייצר אסטרטגיית תמחור, צריך קודם לבנות תוכנית שיווק" : "To generate a pricing strategy, first build a marketing plan"}
            </p>
            <Button onClick={() => navigate("/wizard")} className="cta-warm">{isHe ? "בנה תוכנית (2 דק')" : "Build Plan (2 min)"}</Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default PricingEntry;
