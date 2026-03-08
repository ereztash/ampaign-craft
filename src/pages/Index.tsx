import { useState, useCallback } from "react";
import { FormData, FunnelResult } from "@/types/funnel";
import { generateFunnel } from "@/engine/funnelEngine";
import Header from "@/components/Header";
import LandingPage from "@/components/LandingPage";
import MultiStepForm from "@/components/MultiStepForm";
import ProcessingScreen from "@/components/ProcessingScreen";
import ResultsDashboard from "@/components/ResultsDashboard";
import SavedPlansPage from "@/components/SavedPlansPage";

type AppState = "landing" | "form" | "processing" | "results" | "savedPlans";

const Index = () => {
  const [state, setState] = useState<AppState>("landing");
  const [result, setResult] = useState<FunnelResult | null>(null);
  const [formDataCache, setFormDataCache] = useState<FormData | null>(null);

  const handleFormComplete = useCallback((data: FormData) => {
    setFormDataCache(data);
    const funnelResult = generateFunnel(data);
    setResult(funnelResult);
    setState("processing");
  }, []);

  const handleProcessingComplete = useCallback(() => {
    setState("results");
  }, []);

  const handleLoadPlan = useCallback((loadedResult: FunnelResult) => {
    setResult(loadedResult);
    setState("results");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header onSavedPlans={() => setState("savedPlans")} />
      {state === "landing" && (
        <LandingPage onStart={() => setState("form")} />
      )}
      {state === "form" && (
        <MultiStepForm
          onComplete={handleFormComplete}
          onBack={() => setState("landing")}
        />
      )}
      {state === "processing" && (
        <ProcessingScreen onComplete={handleProcessingComplete} />
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
  );
};

export default Index;
