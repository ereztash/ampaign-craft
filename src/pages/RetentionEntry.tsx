
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { getLatestPlanResult } from "@/lib/minimalFormDefaults";
import { buildUserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { generateRetentionStrategy } from "@/engine/retentionGrowthEngine";
import { buildRetentionContext, PRICING_WIZARD_STORAGE_KEY, DIFF_RESULT_STORAGE_KEY } from "@/engine/retentionPersonalizationContext";
import type { PricingWizardInput } from "@/engine/pricingWizardEngine";
import type { DifferentiationResult } from "@/types/differentiation";
import BackToHub from "@/components/BackToHub";
import RetentionGrowthTab from "@/components/RetentionGrowthTab";
import { ModuleNextStep } from "@/components/ModuleNextStep";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import Illustration from "@/components/ui/illustration";

function safeParse<T>(key: string): T | null {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) as T : null; } catch { return null; }
}

const PageComponent = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const navigate = useNavigate();
  const result = useMemo(() => getLatestPlanResult(), []);

  // Live retention strategy preview, driven by the engine with data cascade.
  const retentionStrategy = useMemo(() => {
    if (!result?.formData) return null;
    const graph         = buildUserKnowledgeGraph(result.formData);
    const pricingInput  = safeParse<PricingWizardInput>(PRICING_WIZARD_STORAGE_KEY);
    const diffResult    = safeParse<DifferentiationResult>(DIFF_RESULT_STORAGE_KEY);
    const retCtx        = buildRetentionContext(result.formData, graph.discProfile, pricingInput, diffResult);
    return generateRetentionStrategy(result.formData, graph, undefined, retCtx);
  }, [result]);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pt-4 pb-16 max-w-5xl">
        <BackToHub currentPage={language === "he" ? "שימור" : "Retention"} />
        {result ? (
          <>
            {retentionStrategy && (() => {
              const hasPricing = !!safeParse(PRICING_WIZARD_STORAGE_KEY);
              const hasDiff    = !!safeParse(DIFF_RESULT_STORAGE_KEY);
              const sources = [
                isHe ? "תוכנית שיווק" : "Marketing plan",
                hasPricing ? (isHe ? "תמחור" : "Pricing") : null,
                hasDiff    ? (isHe ? "בידול" : "Differentiation") : null,
              ].filter(Boolean).join(" · ");
              return (
                <div className="mb-4 rounded-xl border border-pink-200/60 bg-pink-50/50 dark:bg-pink-900/20 p-4 text-start">
                  <p className="text-xs text-pink-900 dark:text-pink-200" dir="auto">
                    {isHe ? "אסטרטגיית שימור" : "Retention strategy"}:{" "}
                    <strong>{retentionStrategy.onboarding.type}</strong>
                    {" "}· {retentionStrategy.onboarding.steps.length} {isHe ? "שלבי קליטה" : "onboarding steps"}
                    {" "}· {retentionStrategy.triggerMap.length} {isHe ? "טריגרים" : "triggers"}
                    {" "}· <span className="opacity-70">{isHe ? "מקורות:" : "Sources:"} {sources}</span>
                  </p>
                </div>
              );
            })()}
            <RetentionGrowthTab result={result} />
            <ModuleNextStep current={5} />
          </>
        ) : (
          <div className="text-center py-16 space-y-4">
            <Illustration type="retention" size={96} className="text-pink-500 mx-auto" />
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
}

export default PageComponent;
