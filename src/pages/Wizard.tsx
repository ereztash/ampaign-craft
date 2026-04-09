import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { FormData, FunnelResult } from "@/types/funnel";
import { UnifiedProfile, toFormData } from "@/types/profile";
import { generateFunnel, personalizeResult } from "@/engine/funnelEngine";
import { buildUserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { useUserProfile } from "@/contexts/UserProfileContext";
import BackToHub from "@/components/BackToHub";
import SmartOnboarding from "@/components/SmartOnboarding";
import ProcessingScreen from "@/components/ProcessingScreen";

type WizardState = "onboarding" | "processing";

const Wizard = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { profile, persistFormData, persistUnifiedProfile } = useUserProfile();

  const [state, setState] = useState<WizardState>("onboarding");
  const [formDataCache, setFormDataCache] = useState<FormData | null>(null);
  const [result, setResult] = useState<FunnelResult | null>(null);
  const navigate = useNavigate();

  const handleProfileComplete = useCallback((up: UnifiedProfile) => {
    persistUnifiedProfile(up);
    const fd = toFormData(up);
    setFormDataCache(fd);
    persistFormData(fd);
    const rawResult = generateFunnel(fd);
    const graph = buildUserKnowledgeGraph(fd);
    const personalized = personalizeResult(rawResult, graph);
    setResult(personalized);
    setState("processing");
  }, [persistFormData, persistUnifiedProfile]);

  const handleProcessingComplete = useCallback(() => {
    if (!result) return;
    try {
      const plans = JSON.parse(localStorage.getItem("funnelforge-plans") || "[]");
      const plan = { id: result.id, name: result.funnelName.he || result.funnelName.en, result, savedAt: new Date().toISOString() };
      plans.push(plan);
      localStorage.setItem("funnelforge-plans", JSON.stringify(plans));
    } catch { /* ignore */ }
    navigate(`/strategy/${result.id}`);
  }, [result, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {state === "onboarding" && (
        <>
          <div className="container mx-auto px-4 pt-4">
            <BackToHub />
          </div>
          <SmartOnboarding
            onComplete={handleProfileComplete}
            initialProfile={profile.unifiedProfile}
          />
        </>
      )}

      {state === "processing" && (
        <ProcessingScreen onComplete={handleProcessingComplete} formData={formDataCache || undefined} />
      )}
    </div>
  );
};

export default Wizard;
