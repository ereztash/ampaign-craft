
import { useState, useEffect } from "react";
import { useUserData } from "@/hooks/useUserData";
import { useLanguage } from "@/i18n/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { toDifferentiationPrefill } from "@/types/profile";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { DifferentiationResult } from "@/types/differentiation";
import DifferentiationWizard from "@/components/DifferentiationWizard";
import DifferentiationResultView from "@/components/DifferentiationResult";
import PaywallModal from "@/components/PaywallModal";
import BackToHub from "@/components/BackToHub";
import { Button } from "@/components/ui/button";
import { Crosshair, Sparkles, Shield, Brain, Map, Zap } from "lucide-react";
import { motion } from "framer-motion";

type ViewState = "idle" | "wizard" | "results";

const PageComponent = () => {
  const { t, language } = useLanguage();
  const isHe = language === "he";
  const { checkAccess, paywallOpen, setPaywallOpen, paywallFeature, paywallTier } = useFeatureGate();
  const { profile } = useUserProfile();
  const { saveDifferentiationResult, loadDifferentiationResults } = useUserData();
  const [view, setView] = useState<ViewState>("idle");
  const [result, setResult] = useState<DifferentiationResult | null>(null);

  // Load last result from DB on mount
  useEffect(() => {
    loadDifferentiationResults().then((results) => {
      if (results.length > 0) {
        const lastResult = results[0].result || results[0];
        setResult(lastResult as DifferentiationResult);
      }
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

  const features = [
    { icon: Shield, title: isHe ? "מבחן סתירה" : "Contradiction Test", desc: isHe ? "בודק אם הבידול שלך עומד בפני ראיות" : "Tests if your differentiation survives evidence" },
    { icon: Brain, title: isHe ? "שכבה נסתרת" : "Hidden Layer", desc: isHe ? "מגלה בידול נסתר בתוך הכאבים שלך" : "Discovers hidden differentiation in your pains" },
    { icon: Map, title: isHe ? "מיפוי קרב" : "Battle Map", desc: isHe ? "מסווג מתחרים ובונה אסטרטגיות נגד" : "Classifies competitors and builds counter-strategies" },
    { icon: Zap, title: isHe ? "7 נרטיבים" : "7 Narratives", desc: isHe ? "מסר מותאם לכל תפקיד בוועדת קנייה" : "Tailored message for each buying committee role" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pt-4 pb-16">
        <BackToHub currentPage={language === "he" ? "בידול" : "Differentiation"} />
        {view === "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
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

            <Button size="lg" onClick={handleStart} className="gap-2 text-lg px-8">
              <Sparkles className="h-5 w-5" />
              {t("diffStartCta")}
            </Button>

            <p className="text-xs text-muted-foreground">
              {isHe ? "5 שלבים · ~10 דקות · מופעל ב-AI" : "5 phases · ~10 minutes · AI-powered"}
            </p>
          </motion.div>
        )}

        {view === "wizard" && (
          <DifferentiationWizard
            onComplete={handleComplete}
            onBack={handleReset}
            initialPrefill={profile.unifiedProfile ? toDifferentiationPrefill(profile.unifiedProfile) : undefined}
          />
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
