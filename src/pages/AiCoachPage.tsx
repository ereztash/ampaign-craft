import { useMemo } from "react";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { generateFunnel, personalizeResult } from "@/engine/funnelEngine";
import { buildUserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { calculateHealthScore } from "@/engine/healthScoreEngine";
import { safeStorage } from "@/lib/safeStorage";
import AiCoachChat from "@/components/AiCoachChat";
import type { SavedPlan } from "@/types/funnel";

const AiCoachPage = () => {
  const { profile } = useUserProfile();

  const result = useMemo(() => {
    const plans = safeStorage.getJSON<SavedPlan[]>("funnelforge-plans", []);
    const sorted = plans.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    if (sorted[0]?.result) return sorted[0].result;
    if (profile.lastFormData) {
      const raw = generateFunnel(profile.lastFormData);
      const graph = buildUserKnowledgeGraph(profile.lastFormData);
      return personalizeResult(raw, graph);
    }
    return null;
  }, [profile.lastFormData]);

  const healthScore = result ? calculateHealthScore(result).total : undefined;

  return (
    <main className="container mx-auto max-w-2xl px-4 py-6">
      <AiCoachChat result={result} healthScore={healthScore} />
    </main>
  );
};

export default AiCoachPage;
