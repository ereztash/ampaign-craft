
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { getLatestPlanResult } from "@/lib/minimalFormDefaults";
import { safeStorage } from "@/lib/safeStorage";
import { buildUserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { generateRetentionStrategy } from "@/engine/retentionGrowthEngine";
import { buildRetentionContext, PRICING_WIZARD_STORAGE_KEY, DIFF_RESULT_STORAGE_KEY } from "@/engine/retentionPersonalizationContext";
import type { PricingWizardInput } from "@/engine/pricingWizardEngine";
import type { DifferentiationResult } from "@/types/differentiation";
import BackToHub from "@/components/BackToHub";
import RetentionGrowthTab from "@/components/RetentionGrowthTab";
import { ModuleNextStep } from "@/components/ModuleNextStep";
import { DidThisHelp } from "@/components/DidThisHelp";
import { Button } from "@/components/ui/button";
import { tx } from "@/i18n/tx";
import { Heart } from "lucide-react";
import Illustration from "@/components/ui/illustration";

function safeParse<T>(key: string): T | null {
  return safeStorage.getJSON<T | null>(key, null);
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
                tx({ he: "תוכנית שיווק", en: "Marketing plan" }, language),
                hasPricing ? (tx({ he: "תמחור", en: "Pricing" }, language)) : null,
                hasDiff    ? (tx({ he: "בידול", en: "Differentiation" }, language)) : null,
              ].filter(Boolean).join(" · ");
              return (
                <div className="mb-4 rounded-xl border border-pink-200/60 bg-pink-50/50 dark:bg-pink-900/20 p-4 text-start">
                  <p className="text-xs text-pink-900 dark:text-pink-200" dir="auto">
                    {tx({ he: "אסטרטגיית שימור", en: "Retention strategy" }, language)}:{" "}
                    <strong>{retentionStrategy.onboarding.type}</strong>
                    {" "}· {retentionStrategy.onboarding.steps.length} {tx({ he: "שלבי קליטה", en: "onboarding steps" }, language)}
                    {" "}· {retentionStrategy.triggerMap.length} {tx({ he: "טריגרים", en: "triggers" }, language)}
                    {" "}· <span className="opacity-70">{tx({ he: "מקורות:", en: "Sources:" }, language)} {sources}</span>
                  </p>
                </div>
              );
            })()}
            <RetentionGrowthTab result={result} />
            <ModuleNextStep current={5} />
            <DidThisHelp module="retention" className="mt-4 justify-center" />
          </>
        ) : (
          <div className="text-center py-16 space-y-4">
            <Illustration type="retention" size={96} className="text-pink-500 mx-auto" />
            <h2 className="text-2xl font-bold" dir="auto">{tx({ he: "שימור וצמיחה", en: "Retention & Growth" }, language)}</h2>
            <p className="text-muted-foreground max-w-md mx-auto" dir="auto">
              {tx({ he: "כדי לייצר אסטרטגיית שימור, צריך קודם לבנות תוכנית שיווק", en: "To generate a retention strategy, first build a marketing plan" }, language)}
            </p>
            <Button onClick={() => navigate("/wizard")} className="cta-warm">{tx({ he: "בנה תוכנית (2 דק')", en: "Build Plan (2 min)" }, language)}</Button>
          </div>
        )}
      </main>
    </div>
  );
}

export default PageComponent;
