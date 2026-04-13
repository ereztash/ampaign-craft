
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { getLatestPlanResult } from "@/lib/minimalFormDefaults";
import { buildUserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { generatePricingIntelligence } from "@/engine/pricingIntelligenceEngine";
import { generateCLGStrategy } from "@/engine/clgEngine";
import BackToHub from "@/components/BackToHub";
import PricingIntelligenceTab from "@/components/PricingIntelligenceTab";
import { ModuleNextStep } from "@/components/ModuleNextStep";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";
import Illustration from "@/components/ui/illustration";

const PageComponent = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const navigate = useNavigate();
  const result = useMemo(() => getLatestPlanResult(), []);

  // Live pricing + CLG analyses computed from the latest plan.
  const pricingAnalysis = useMemo(() => {
    if (!result?.formData) return null;
    const graph = buildUserKnowledgeGraph(result.formData);
    return generatePricingIntelligence(result.formData, graph);
  }, [result]);

  const clgStrategy = useMemo(() => {
    if (!result?.formData) return null;
    return generateCLGStrategy(result.formData);
  }, [result]);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pt-4 pb-16 max-w-5xl">
        <BackToHub currentPage={language === "he" ? "תמחור" : "Pricing"} />
        {result ? (
          <>
            {(pricingAnalysis || clgStrategy) && (
              <div className="mb-4 rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-4 text-start">
                {pricingAnalysis && (
                  <p className="text-xs text-emerald-900" dir="auto">
                    {isHe ? "מודל תמחור" : "Pricing model"}:{" "}
                    <strong>{pricingAnalysis.pricingModel.label[language]}</strong>
                    {" "}· {pricingAnalysis.tierStructure.tiers.length} {isHe ? "שכבות" : "tiers"}
                  </p>
                )}
                {clgStrategy && (
                  <p className="text-xs text-emerald-900 mt-1" dir="auto">
                    {isHe ? "התאמת CLG" : "CLG suitability"}: {clgStrategy.suitabilityScore}/100
                    {" "}· LTV ×{clgStrategy.ltvImpact.multiplier.toFixed(1)}
                  </p>
                )}
              </div>
            )}
            <PricingIntelligenceTab result={result} />
            <ModuleNextStep current={4} />
          </>
        ) : (
          <div className="text-center py-16 space-y-4">
            <Illustration type="analytics" size={96} className="text-emerald-500 mx-auto" />
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
}

export default PageComponent;
