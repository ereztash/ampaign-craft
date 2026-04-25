
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useUserData } from "@/hooks/useUserData";
import { logger } from "@/lib/logger";
import { useLanguage } from "@/i18n/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { toDifferentiationPrefill } from "@/types/profile";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { DifferentiationResult } from "@/types/differentiation";
import DifferentiationWizard from "@/components/DifferentiationWizard";
import DifferentiationResultView from "@/components/DifferentiationResult";
import DifferentiationTranscriptWizard from "@/components/DifferentiationTranscriptWizard";
import PaywallModal from "@/components/PaywallModal";
import BackToHub from "@/components/BackToHub";
import IntakePromiseHeader from "@/components/intake/IntakePromiseHeader";
import { Button } from "@/components/ui/button";
import { tx } from "@/i18n/tx";
import { Crosshair, Sparkles, Shield, Brain, Map, Zap, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { generateDifferentiation } from "@/engine/differentiationEngine";
import { getQuestionsForPhase } from "@/engine/differentiationPhases";
import { generateCrossDomainInsights, type Industry as CrossDomainIndustry } from "@/engine/crossDomainBenchmarkEngine";
import type { Tables } from "@/integrations/supabase/types";

type ViewState = "idle" | "wizard" | "results" | "transcript";

const PageComponent = () => {
  const { t, language } = useLanguage();
  const reducedMotion = useReducedMotion();
  const isHe = language === "he";
  const location = useLocation();
  const { checkAccess, paywallOpen, setPaywallOpen, paywallFeature, paywallTier } = useFeatureGate();
  const { profile } = useUserProfile();
  const { saveDifferentiationResult, loadDifferentiationResults } = useUserData();

  // ?mode=transcript deep-link support
  const initialView: ViewState = new URLSearchParams(location.search).get("mode") === "transcript"
    ? "transcript"
    : "idle";
  const [view, setView] = useState<ViewState>(initialView);
  const [result, setResult] = useState<DifferentiationResult | null>(null);

  // Load last result from DB on mount
  useEffect(() => {
    loadDifferentiationResults()
      .then((results) => {
        if (results.length > 0) {
          const latest = results[0] as Tables<"differentiation_results"> | Record<string, unknown>;
          const lastResult = "result" in latest ? latest.result : latest;
          setResult(lastResult as DifferentiationResult);
        }
      })
      .catch((err) => {
        logger.error("Differentiate.loadResults", err);
      });
  }, [loadDifferentiationResults]);

  const handleStart = () => {
    setView("wizard");
  };

  const handleComplete = (res: DifferentiationResult) => {
    setResult(res);
    setView("results");
    // Persist to DB + localStorage
    saveDifferentiationResult({}, res as unknown as Record<string, unknown>);
  };

  const handleReset = () => {
    setResult(null);
    setView("idle");
  };

  // Engine-backed intro previews — run live on mount so the page is a
  // real consumer of the differentiation/phases/cross-domain engines.
  const introIndustry = useMemo<CrossDomainIndustry>(() => {
    const field = (profile.unifiedProfile?.businessField || "tech") as string;
    const allowed: CrossDomainIndustry[] = [
      "fashion", "tech", "food", "services", "education",
      "health", "realEstate", "ecommerce", "beauty", "sports",
    ];
    return (allowed.includes(field as CrossDomainIndustry) ? field : "tech") as CrossDomainIndustry;
  }, [profile.unifiedProfile?.businessField]);

  const crossDomainIntro = useMemo(
    () => generateCrossDomainInsights(introIndustry),
    [introIndustry],
  );

  const phase1Questions = useMemo(() => {
    if (!profile.unifiedProfile) return [];
    const prefill = toDifferentiationPrefill(profile.unifiedProfile);
    return getQuestionsForPhase("surface", prefill as never);
  }, [profile.unifiedProfile]);

  // Provide a synthesis fallback for users who have no wizard data yet:
  // if they open the page and we already have a unified profile, run the
  // generator once so the intro card can show a live strength estimate.
  const strengthPreview = useMemo(() => {
    if (!profile.unifiedProfile || result) return null;
    try {
      const prefill = toDifferentiationPrefill(profile.unifiedProfile);
      const synth = generateDifferentiation(prefill as never);
      return synth.differentiationStrength;
    } catch {
      return null;
    }
  }, [profile.unifiedProfile, result]);

  const features = [
    { icon: Shield, title: tx({ he: "מבחן סתירה", en: "Contradiction Test" }, language), desc: tx({ he: "בודק אם הבידול שלך עומד בפני ראיות", en: "Tests if your differentiation survives evidence" }, language) },
    { icon: Brain, title: tx({ he: "שכבה נסתרת", en: "Hidden Layer" }, language), desc: tx({ he: "מגלה בידול נסתר בתוך הכאבים שלך", en: "Discovers hidden differentiation in your pains" }, language) },
    { icon: Map, title: tx({ he: "מיפוי קרב", en: "Battle Map" }, language), desc: tx({ he: "מסווג מתחרים ובונה אסטרטגיות נגד", en: "Classifies competitors and builds counter-strategies" }, language) },
    { icon: Zap, title: tx({ he: "7 נרטיבים", en: "7 Narratives" }, language), desc: tx({ he: "מסר מותאם לכל תפקיד בוועדת קנייה", en: "Tailored message for each buying committee role" }, language) },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pt-4 pb-16">
        <BackToHub currentPage={language === "he" ? "בידול" : "Differentiation"} />
        <IntakePromiseHeader moduleTarget="/differentiate" suppress={view !== "idle"} />
        {view === "idle" && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto text-center space-y-8"
          >
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10">
                <Crosshair className="h-8 w-8 text-amber-600" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground" dir="auto">{t("diffPageTitle")}</h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto" dir="auto">{t("diffPageSubtitle")}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((f, i) => (
                <div key={i} className="rounded-xl border p-4 text-start">
                  <f.icon className="h-5 w-5 text-primary mb-2" />
                  <div className="text-sm font-medium">{f.title}</div>
                  <p className="text-xs text-muted-foreground mt-1" dir="auto">{f.desc}</p>
                </div>
              ))}
            </div>

            {(strengthPreview !== null || crossDomainIntro.topLift) && (
              <div className="rounded-xl border border-amber-200/50 bg-amber-50/50 dark:bg-amber-900/20 p-4 text-start">
                {strengthPreview !== null && (
                  <div className="text-xs text-amber-800">
                    {tx({ he: "אומדן בידול ראשוני", en: "Initial differentiation estimate" }, language)}: <strong>{strengthPreview}/100</strong>
                    {phase1Questions.length > 0 && (
                      <span className="ms-2 text-muted-foreground">
                        · {phase1Questions.length} {tx({ he: "שאלות מוכנות", en: "questions ready" }, language)}
                      </span>
                    )}
                  </div>
                )}
                {crossDomainIntro.topLift && (
                  <div className="text-xs text-amber-800 mt-1" dir="auto">
                    {tx({ he: "לקחי תעשייה צולבים", en: "Cross-industry lesson" }, language)}:{" "}
                    <strong>{crossDomainIntro.topLift.expectedLift}</strong>:{" "}
                    {tx(crossDomainIntro.topLift.transferableStrategy, language)}
                  </div>
                )}
              </div>
            )}

            {/* Primary CTA: 5-phase form wizard */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" onClick={handleStart} className="gap-2 text-lg px-8">
                <Sparkles className="h-5 w-5" />
                {t("diffStartCta")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setView("transcript")}
                className="gap-2 text-lg px-8"
              >
                <FileText className="h-5 w-5" />
                {tx({ he: "העלה תמלול פגישה", en: "Upload Meeting Transcript" }, language)}
              </Button>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {tx({ he: "5 שלבים · ~10 דקות · מופעל ב-AI", en: "5 phases · ~10 minutes · AI-powered" }, language)}
              </p>
              <p className="text-xs text-muted-foreground">
                {tx({ he: "או: 12 עקרונות במקביל על תמלול קיים · ~3 דקות", en: "or: 12 parallel principles on existing transcript · ~3 min" }, language)}
              </p>
            </div>
          </motion.div>
        )}

        {view === "wizard" && (
          <DifferentiationWizard
            onComplete={handleComplete}
            onBack={handleReset}
            initialPrefill={profile.unifiedProfile ? toDifferentiationPrefill(profile.unifiedProfile) : undefined}
          />
        )}

        {view === "transcript" && (
          <DifferentiationTranscriptWizard onBack={handleReset} />
        )}

        {view === "results" && result && (
          <DifferentiationResultView result={result} onBack={handleReset} />
        )}
      </main>

      <PaywallModal
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        feature={paywallFeature}
        requiredTier={paywallTier}
      />
    </div>
  );
}

export default PageComponent;
