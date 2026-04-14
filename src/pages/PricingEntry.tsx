import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { getLatestPlanResult } from "@/lib/minimalFormDefaults";
import { buildUserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { generatePricingIntelligence } from "@/engine/pricingIntelligenceEngine";
import { generateCLGStrategy } from "@/engine/clgEngine";
import { tx } from "@/i18n/tx";
import {
  computePricingWizardRecommendation,
  type PricingWizardInput,
} from "@/engine/pricingWizardEngine";
import { PRICING_WIZARD_STORAGE_KEY } from "@/engine/retentionPersonalizationContext";
import PricingWizard from "@/components/PricingWizard";
import PricingIntelligenceTab from "@/components/PricingIntelligenceTab";
import PricingWizardResults from "@/components/PricingWizardResults";
import BackToHub from "@/components/BackToHub";
import { ModuleNextStep } from "@/components/ModuleNextStep";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, RefreshCw } from "lucide-react";
import Illustration from "@/components/ui/illustration";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Persist wizard pricing inputs to the latest plan in localStorage.
 * This lets PricingIntelligenceTab use the derived price next time.
 */
function savePricingToLatestPlan(input: PricingWizardInput): void {
  try {
    const plans = JSON.parse(localStorage.getItem("funnelforge-plans") || "[]");
    if (!plans.length) return;
    const sorted = [...plans].sort(
      (a: { savedAt: string }, b: { savedAt: string }) =>
        new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
    );
    const latest = sorted[0];
    if (latest?.result?.formData) {
      latest.result.formData.averagePrice = input.tooChcapPrice > 0
        ? Math.round(Math.sqrt(input.tooChcapPrice * input.stretchPrice))
        : 0;
      latest.result.formData.salesModel   = input.salesModel;
    }
    localStorage.setItem("funnelforge-plans", JSON.stringify(plans));
  } catch {
    // swallow — non-critical
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

type ViewState = "wizard" | "results" | "legacy";

const PageComponent = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const navigate = useNavigate();
  const result = useMemo(() => getLatestPlanResult(), []);

  // Latest plan signals whether wizard has been completed before
  const hasPlanWithPrice = (result?.formData?.averagePrice ?? 0) > 0;

  // View: show wizard if no price set, results if wizard was just completed,
  // legacy tab if plan exists and has a price
  const [view, setView] = useState<ViewState>(
    hasPlanWithPrice ? "legacy" : "wizard",
  );
  const [wizardInput, setWizardInput] = useState<PricingWizardInput | null>(null);

  // Pricing intelligence from existing plan (legacy tab)
  const pricingAnalysis = useMemo(() => {
    if (!result?.formData) return null;
    const graph = buildUserKnowledgeGraph(result.formData);
    return generatePricingIntelligence(result.formData, graph);
  }, [result]);

  const clgStrategy = useMemo(() => {
    if (!result?.formData) return null;
    return generateCLGStrategy(result.formData);
  }, [result]);

  // Wizard completion handler
  const handleWizardComplete = useCallback((input: PricingWizardInput) => {
    savePricingToLatestPlan(input);
    // Persist full input so the retention engine can read Hormozi axes later
    try { localStorage.setItem(PRICING_WIZARD_STORAGE_KEY, JSON.stringify(input)); } catch { /* non-critical */ }
    setWizardInput(input);
    setView("results");
  }, []);

  // Compute wizard-based recommendation
  const wizardRec = useMemo(
    () => (wizardInput ? computePricingWizardRecommendation(wizardInput) : null),
    [wizardInput],
  );

  // ── Audience context for wizard ───────────────────────────────────────────
  const audienceIsB2B =
    result?.formData?.audienceType === "b2b" ||
    result?.formData?.audienceType === "both";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pt-4 pb-16 max-w-5xl">
        <BackToHub currentPage={language === "he" ? "תמחור" : "Pricing"} />

        {/* ── No plan → gate ─────────────────────────────────────────────── */}
        {!result ? (
          <div className="text-center py-16 space-y-4">
            <Illustration type="analytics" size={96} className="text-emerald-500 mx-auto" />
            <h2 className="text-2xl font-bold" dir="auto">
              {tx({ he: "אינטליגנציית תמחור", en: "Pricing Intelligence" }, language)}
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto" dir="auto">
              {isHe
                ? "כדי לייצר אסטרטגיית תמחור, צריך קודם לבנות תוכנית שיווק"
                : "To generate a pricing strategy, first build a marketing plan"}
            </p>
            <Button onClick={() => navigate("/wizard")} className="cta-warm">
              {tx({ he: "בנה תוכנית (2 דק')", en: "Build Plan (2 min)" }, language)}
            </Button>
          </div>
        ) : view === "wizard" ? (

          /* ── Wizard ──────────────────────────────────────────────────── */
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-1">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold" dir="auto">
                {tx({ he: "וויזארד תמחור", en: "Pricing Wizard" }, language)}
              </h1>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto" dir="auto">
                {isHe
                  ? "4 שאלות מבוססות מדע — נגזור את המחיר האופטימלי עבורך"
                  : "4 science-based questions — we derive your optimal price"}
              </p>
            </div>
            <PricingWizard
              initialSalesModel={result.formData?.salesModel}
              audienceIsB2B={audienceIsB2B}
              onComplete={handleWizardComplete}
            />
          </div>

        ) : view === "results" && wizardRec ? (

          /* ── Wizard results ───────────────────────────────────────────── */
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h1 className="text-xl font-bold" dir="auto">
                  {tx({ he: "אסטרטגיית התמחור שלך", en: "Your Pricing Strategy" }, language)}
                </h1>
                <p className="text-sm text-muted-foreground" dir="auto">
                  {wizardRec.methodology[language]}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView("wizard")}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {tx({ he: "ערוך תשובות", en: "Edit answers" }, language)}
              </Button>
            </div>

            <PricingWizardResults rec={wizardRec} />

            {/* Offer to show full intelligence tab if plan exists */}
            {pricingAnalysis && (
              <div className="rounded-xl border p-4 bg-muted/30 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-muted-foreground" dir="auto">
                  {isHe
                    ? "רוצה לראות גם ניתוח מלא עם סקריפטים ו-Offer Stack?"
                    : "Want to see the full analysis with scripts and Offer Stack?"}
                </p>
                <Button variant="outline" size="sm" onClick={() => setView("legacy")}>
                  {tx({ he: "הצג ניתוח מלא", en: "Show full analysis" }, language)}
                </Button>
              </div>
            )}

            <ModuleNextStep current={4} />
          </div>

        ) : (

          /* ── Legacy intelligence tab ─────────────────────────────────── */
          <div className="space-y-4">
            {(pricingAnalysis || clgStrategy) && (
              <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-4 flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-0.5">
                  {pricingAnalysis && (
                    <p className="text-xs text-emerald-900" dir="auto">
                      {tx({ he: "מודל תמחור", en: "Pricing model" }, language)}:{" "}
                      <strong>{pricingAnalysis.pricingModel.label[language]}</strong>
                      {" "}· {pricingAnalysis.tierStructure.tiers.length}{" "}
                      {tx({ he: "שכבות", en: "tiers" }, language)}
                    </p>
                  )}
                  {clgStrategy && (
                    <p className="text-xs text-emerald-900" dir="auto">
                      {tx({ he: "התאמת CLG", en: "CLG suitability" }, language)}:{" "}
                      {clgStrategy.suitabilityScore}/100
                      {" "}· LTV ×{clgStrategy.ltvImpact.multiplier.toFixed(1)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {tx({ he: "מבוסס תוכנית קיימת", en: "From existing plan" }, language)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setView("wizard")}
                    className="text-xs gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    {tx({ he: "וויזארד חדש", en: "New wizard" }, language)}
                  </Button>
                </div>
              </div>
            )}
            <PricingIntelligenceTab result={result} />
            <ModuleNextStep current={4} />
          </div>
        )}
      </main>
    </div>
  );
};

export default PageComponent;
