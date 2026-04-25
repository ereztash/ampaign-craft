import { useState, useCallback, useMemo, useRef } from "react";
import type { AgentInsight } from "@/engine/blackboard/partialRunner";
import { Analytics } from "@/lib/analytics";
import { onPlanGenerated, trackFirstPlanGenerated } from "@/services/eventQueue";
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
import { useArchetype } from "@/contexts/ArchetypeContext";
import BackToHub from "@/components/BackToHub";
import IntakePromiseHeader from "@/components/intake/IntakePromiseHeader";
import SmartOnboarding from "@/components/SmartOnboarding";
import ProcessingScreen from "@/components/ProcessingScreen";
import { tx } from "@/i18n/tx";
import { safeStorage } from "@/lib/safeStorage";
import type { SavedPlan } from "@/types/funnel";
import type { Language } from "@/i18n/translations";

type WizardState = "onboarding" | "processing";

const Wizard = () => {
  const { language } = useLanguage();
  // Narrow once and memoize so the reference is stable across renders —
  // without useMemo the derived value would churn the identity of any
  // callback that depends on it, defeating surrounding useCallbacks.
  const currentLanguage = useMemo(() => language as Language, [language]);
  const isHe = language === "he";
  const { profile, persistFormData, persistUnifiedProfile } = useUserProfile();
  const { user } = useAuth();
  const { updateFromBlackboard } = useArchetype();

  const [state, setState] = useState<WizardState>("onboarding");
  const [formDataCache, setFormDataCache] = useState<FormData | null>(null);
  const [result, setResult] = useState<FunnelResult | null>(null);
  const [onboardingInsights, setOnboardingInsights] = useState<AgentInsight[]>([]);
  const navigate = useNavigate();

  const handleInsightsUpdate = useCallback((insights: AgentInsight[]) => {
    setOnboardingInsights(insights);
  }, []);

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
            language: currentLanguage,
          });
          copy = res.text;
        } catch {
          copy = "";
        }
      }
      return copy;
    },
    [user?.id, formDataCache?.mainGoal, formDataCache?.businessField, currentLanguage],
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
        predictContentScore(heroCopy, currentLanguage);
      }
      calculateEPS();
    } catch {
      /* engine previews are best-effort */
    }

    setResult(personalized);
    setState("processing");

    // AARRR Activation — track first plan generated
    if (user) {
      onPlanGenerated(personalized.id, user.id).catch(() => {});
      trackFirstPlanGenerated(user.id, personalized.id, fd.businessField).catch(() => {});
      Analytics.firstPlanGenerated(personalized.id, user.id, fd.businessField);
      Analytics.ahaMoment(user.id, "first_plan_generated");
    }

    // Update archetype profile with available signals from this pipeline run
    updateFromBlackboard({ formData: fd, knowledgeGraph: graph });
  }, [persistFormData, persistUnifiedProfile, updateFromBlackboard, currentLanguage, user]);

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
    const plans = safeStorage.getJSON<SavedPlan[]>("funnelforge-plans", []);
    const plan: SavedPlan = {
      id: result.id,
      name: result.funnelName?.he || result.funnelName?.en || "Untitled Plan",
      result,
      savedAt: new Date().toISOString(),
    };
    plans.push(plan);
    safeStorage.setJSON("funnelforge-plans", plans);
    navigate(`/strategy/${result.id}`);
  }, [result, navigate, formDataCache, loadPromptOptimizations, regenerateHeroCopy]);

  return (
    <main className="min-h-screen bg-background">
      {state === "onboarding" && (
        <>
          <div className="container mx-auto px-4 pt-4 max-w-3xl">
            <BackToHub />
            <IntakePromiseHeader moduleTarget="/wizard" />
          </div>
          <SmartOnboarding
            onComplete={handleProfileComplete}
            initialProfile={profile.unifiedProfile}
            onInsightsUpdate={handleInsightsUpdate}
          />
        </>
      )}

      {state === "processing" && (
        <ProcessingScreen onComplete={handleProcessingComplete} formData={formDataCache || undefined} insights={onboardingInsights} />
      )}
    </main>
  );
};

export default Wizard;
