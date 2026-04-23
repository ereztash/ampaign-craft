import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bot } from "lucide-react";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { generateFunnel, personalizeResult } from "@/engine/funnelEngine";
import { buildUserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { calculateHealthScore } from "@/engine/healthScoreEngine";
import { safeStorage } from "@/lib/safeStorage";
import AiCoachChat from "@/components/AiCoachChat";
import { Button } from "@/components/ui/button";
import type { SavedPlan } from "@/types/funnel";

const AiCoachPage = () => {
  const { profile } = useUserProfile();
  const { language } = useLanguage();
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

  const healthScore = result ? calculateHealthScore(result).total : undefined;

  if (!result) {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-6">
        <div className="flex flex-col items-center justify-center text-center gap-4 py-16">
          <Bot className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
          <h1 className="text-xl font-semibold">
            {tx({ he: "יש צורך בתוכנית או בפרופיל עסקי", en: "Need a plan or business profile" }, language)}
          </h1>
          <p className="text-sm text-muted-foreground max-w-md">
            {tx(
              {
                he: "כדי לקבל ייעוץ מותאם, יש למלא את אשף המשפך הקצר. לאחר מכן הקואצ' ייתן המלצות על בסיס הנתונים שלך.",
                en: "To get personalised coaching, fill in the short funnel wizard. The coach will then draw recommendations from your data.",
              },
              language,
            )}
          </p>
          <Button onClick={() => navigate("/wizard")}>
            {tx({ he: "פתיחת האשף", en: "Open wizard" }, language)}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-2xl px-4 py-6">
      <AiCoachChat result={result} healthScore={healthScore} />
    </main>
  );
};

export default AiCoachPage;
