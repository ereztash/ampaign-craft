import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FormData, FunnelResult } from "@/types/funnel";
import { generateFunnel, personalizeResult } from "@/engine/funnelEngine";
import { buildUserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { useUserProfile } from "@/contexts/UserProfileContext";
import Header from "@/components/Header";
import MultiStepForm from "@/components/MultiStepForm";
import ProcessingScreen from "@/components/ProcessingScreen";

type WizardState = "form" | "processing";

const Wizard = () => {
  const [state, setState] = useState<WizardState>("form");
  const [formDataCache, setFormDataCache] = useState<FormData | null>(null);
  const [result, setResult] = useState<FunnelResult | null>(null);
  const { persistFormData } = useUserProfile();
  const navigate = useNavigate();

  const handleFormComplete = useCallback((data: FormData) => {
    setFormDataCache(data);
    persistFormData(data);
    const rawResult = generateFunnel(data);
    const graph = buildUserKnowledgeGraph(data);
    const personalized = personalizeResult(rawResult, graph);
    setResult(personalized);
    setState("processing");
  }, [persistFormData]);

  const handleProcessingComplete = useCallback(() => {
    if (!result) return;
    // Save plan and navigate to it
    try {
      const plans = JSON.parse(localStorage.getItem("funnelforge-plans") || "[]");
      const plan = { id: result.id, name: result.funnelName.he || result.funnelName.en, result, savedAt: new Date().toISOString() };
      plans.push(plan);
      localStorage.setItem("funnelforge-plans", JSON.stringify(plans));
    } catch { /* ignore */ }
    navigate(`/plans/${result.id}`);
  }, [result, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {state === "form" && (
        <MultiStepForm onComplete={handleFormComplete} onBack={() => navigate("/dashboard")} />
      )}
      {state === "processing" && (
        <ProcessingScreen onComplete={handleProcessingComplete} formData={formDataCache || undefined} />
      )}
    </div>
  );
};

export default Wizard;
