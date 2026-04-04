import { useState, useCallback, useEffect, useRef } from "react";
import { FormData, FunnelResult, ExperienceLevel } from "@/types/funnel";
import { generateFunnel } from "@/engine/funnelEngine";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import LandingPage from "@/components/LandingPage";
import MultiStepForm from "@/components/MultiStepForm";
import ProcessingScreen from "@/components/ProcessingScreen";
import ResultsDashboard from "@/components/ResultsDashboard";
import SavedPlansPage from "@/components/SavedPlansPage";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import { useAdaptiveTheme } from "@/hooks/useAdaptiveTheme";

type AppState = "landing" | "form" | "processing" | "results" | "savedPlans";

const Index = () => {
  const [state, setState] = useState<AppState>("landing");
  const [result, setResult] = useState<FunnelResult | null>(null);
  const [formDataCache, setFormDataCache] = useState<FormData | null>(null);
  const { persistFormData, refreshSavedPlanCount, setExperienceLevel } = useUserProfile();
  const { t } = useLanguage();
  const mainContentRef = useRef<HTMLDivElement>(null);
  useAdaptiveTheme();

  // Focus management on state transitions
  useEffect(() => {
    if (state === "results" && mainContentRef.current) {
      mainContentRef.current.focus();
    }
  }, [state]);

  const handleFormComplete = useCallback((data: FormData) => {
    setFormDataCache(data);
    persistFormData(data);
    const funnelResult = generateFunnel(data);
    setResult(funnelResult);
    setState("processing");
  }, [persistFormData]);

  const handleProcessingComplete = useCallback(() => {
    setState("results");
  }, []);

  const handleLoadPlan = useCallback((loadedResult: FunnelResult) => {
    setResult(loadedResult);
    setState("results");
  }, []);

  const handleLoadLastPlan = useCallback((loadedResult: FunnelResult) => {
    setResult(loadedResult);
    setState("results");
  }, []);

  const handleStartWithSegment = useCallback((segment: ExperienceLevel) => {
    setExperienceLevel(segment);
    setState("form");
  }, [setExperienceLevel]);

  return (
    <div className="min-h-screen bg-background">
      <a href="#main-content" className="skip-to-content">
        {t("skipToContent")}
      </a>
      <Header onSavedPlans={() => setState("savedPlans")} />
      <OnboardingOverlay />
      <div id="main-content" ref={mainContentRef} tabIndex={-1} className="outline-none">
      {state === "landing" && (
        <LandingPage onStart={() => setState("form")} onStartWithSegment={handleStartWithSegment} onLoadLastPlan={handleLoadLastPlan} />
      )}
      {state === "form" && (
        <MultiStepForm
          onComplete={handleFormComplete}
          onBack={() => setState("landing")}
        />
      )}
      {state === "processing" && (
        <ProcessingScreen onComplete={handleProcessingComplete} formData={formDataCache || undefined} />
      )}
      {state === "results" && result && (
        <ResultsDashboard
          result={result}
          onEdit={() => setState("form")}
          onNewPlan={() => { setResult(null); setFormDataCache(null); setState("landing"); }}
        />
      )}
      {state === "savedPlans" && (
        <SavedPlansPage
          onBack={() => setState("landing")}
          onLoadPlan={handleLoadPlan}
        />
      )}
      </div>
    </div>
  );
};

export default Index;
