import { useState, useCallback } from "react";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { FormData, FunnelResult } from "@/types/funnel";
import { generateFunnel } from "@/engine/funnelEngine";
import Header from "@/components/Header";
import LandingPage from "@/components/LandingPage";
import MultiStepForm from "@/components/MultiStepForm";
import ProcessingScreen from "@/components/ProcessingScreen";
import ResultsDashboard from "@/components/ResultsDashboard";

type AppState = "landing" | "form" | "processing" | "results";

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

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-background">
        <Header />
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
      </div>
    </LanguageProvider>
  );
};

export default Index;
