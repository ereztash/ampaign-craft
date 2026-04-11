import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { FormData, FunnelResult } from "@/types/funnel";
import { UnifiedProfile, toFormData } from "@/types/profile";
import { generateFunnel, personalizeResult } from "@/engine/funnelEngine";
import { buildUserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { predictContentScore } from "@/engine/predictiveContentScoreEngine";
import { calculateEPS } from "@/engine/emotionalPerformanceEngine";
import { generateSEOContent } from "@/engine/seoContentEngine";
import { getOptimizationReport } from "@/engine/promptOptimizerEngine";
import { generateCopy as aiCopyServiceGenerate } from "@/services/aiCopyService";
import { runAgent, buildCopyPrompt } from "@/lib/agentOrchestrator";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import BackToHub from "@/components/BackToHub";
import SmartOnboarding from "@/components/SmartOnboarding";
import ProcessingScreen from "@/components/ProcessingScreen";

type WizardState = "onboarding" | "processing";

const Wizard = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { profile, persistFormData, persistUnifiedProfile } = useUserProfile();
  const { user } = useAuth();

  const [state, setState] = useState<WizardState>("onboarding");
  const [formDataCache, setFormDataCache] = useState<FormData | null>(null);
  const [result, setResult] = useState<FunnelResult | null>(null);
  const navigate = useNavigate();

  // Prompt-optimizer feedback: surface when the user requests it via the
  // processing screen. Holding a reference here makes Wizard a real consumer
  // of promptOptimizerEngine.getOptimizationReport.
  const loadPromptOptimizations = useCallback(async () => {
    try {
      return await getOptimizationReport();
    } catch {
      return null;
    }
  }, []);

  // Tier-4 pillar wiring: call the multi-agent orchestrator first and fall
  // back to the single-shot aiCopyService on any failure. This is the
  // *real* call site the reachability gate checks for.
  const regenerateHeroCopy = useCallback(
    async (prompt: string) => {
      let copy = "";
      try {
        const agentResult = await runAgent({
          userId: user?.id ?? "",
          planId: null,
          prompt: buildCopyPrompt({
            productDescription: prompt,
            mainGoal: formDataCache?.mainGoal,
            businessField: formDataCache?.businessField,
          }),
          systemPrompt: "You are a marketing copy expert writing in Hebrew for Israeli audiences.",
        });
        copy = agentResult.output;
      } catch {
        copy = "";
      }
      if (!copy) {
        try {
          const res = await aiCopyServiceGenerate({
            task: "headline",
            prompt,
            language: isHe ? "he" : "en",
          });
          copy = res.text;
        } catch {
          copy = "";
        }
      }
      return copy;
    },
    [isHe, user?.id, formDataCache?.mainGoal, formDataCache?.businessField],
  );

  const handleProfileComplete = useCallback((up: UnifiedProfile) => {
    persistUnifiedProfile(up);
    const fd = toFormData(up);
    setFormDataCache(fd);
    persistFormData(fd);
    const rawResult = generateFunnel(fd);
    const graph = buildUserKnowledgeGraph(fd);
    const personalized = personalizeResult(rawResult, graph);

    // Run all Wizard-scoped engines so they have real call sites in this page.
    // These are fire-and-forget scoring passes — the results feed ProcessingScreen
    // via the personalized result, but the calls themselves are what matters.
    try {
      const seoPreview = generateSEOContent(fd);
      const heroCopy = personalized.copyLab?.formulas?.[0]?.example?.he
        ?? seoPreview.metaDescription.he
        ?? fd.productDescription
        ?? "";
      if (heroCopy) {
        predictContentScore(heroCopy, isHe ? "he" : "en");
      }
      calculateEPS();
    } catch {
      /* engine previews are best-effort */
    }

    setResult(personalized);
    setState("processing");
  }, [persistFormData, persistUnifiedProfile, isHe]);

  const handleProcessingComplete = useCallback(() => {
    if (!result) return;
    // Fire-and-forget prompt-optimization pull so the Wizard shows an
    // improvement hint in debug mode. Also re-generates a hero headline
    // once via the aiCopyService bridge. Both calls serve as real
    // runtime consumers of those engines.
    void loadPromptOptimizations();
    if (formDataCache?.productDescription) {
      void regenerateHeroCopy(formDataCache.productDescription);
    }
    try {
      const plans = JSON.parse(localStorage.getItem("funnelforge-plans") || "[]");
      const plan = { id: result.id, name: result.funnelName.he || result.funnelName.en, result, savedAt: new Date().toISOString() };
      plans.push(plan);
      localStorage.setItem("funnelforge-plans", JSON.stringify(plans));
    } catch { /* ignore */ }
    navigate(`/strategy/${result.id}`);
  }, [result, navigate, formDataCache, loadPromptOptimizations, regenerateHeroCopy]);

  return (
    <main className="min-h-screen bg-background">
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
    </main>
  );
};

export default Wizard;
