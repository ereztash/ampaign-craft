import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { generateFunnel, personalizeResult } from "@/engine/funnelEngine";
import { buildUserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { calculateHealthScore } from "@/engine/healthScoreEngine";
import { safeStorage } from "@/lib/safeStorage";
import AiCoachChat from "@/components/AiCoachChat";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SavedPlan } from "@/types/funnel";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { Bot } from "lucide-react";

const AiCoachPage = () => {
  const { profile } = useUserProfile();
  const { language } = useLanguage();
  const isHe = language === "he";
  const navigate = useNavigate();

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

  if (!result) {
    return (
      <main className="container mx-auto max-w-md px-4 py-12 text-center">
        <Card>
          <CardContent className="p-8 space-y-4">
            <Bot className="h-12 w-12 text-primary mx-auto" />
            <p className="font-medium" dir="auto">
              {tx({ he: "נדרשת תוכנית או שאלון עסק", en: "Need a plan or business profile" }, language)}
            </p>
            <p className="text-sm text-muted-foreground" dir="auto">
              {tx({ he: "צור תוכנית או מלא את האשף כדי שהמאמן יכיר את העסק שלך.", en: "Create a plan or run the wizard so the coach knows your business." }, language)}
            </p>
            <Button onClick={() => navigate("/wizard")}>{tx({ he: "לאשף", en: "Open wizard" }, language)}</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const healthScore = calculateHealthScore(result).total;

  return (
    <main className="container mx-auto max-w-2xl px-4 py-6">
      <AiCoachChat result={result} healthScore={healthScore} />
    </main>
  );
};

export default AiCoachPage;
