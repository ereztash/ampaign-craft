import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lock } from "lucide-react";
import type { OnboardingMilestones } from "@/contexts/UserProfileContext";

interface StepDef {
  milestoneKey: keyof OnboardingMilestones;
  label: { he: string; en: string };
  description: { he: string; en: string };
  route: string;
  unlocks: { he: string; en: string } | null;
}

const STEPS: StepDef[] = [
  {
    milestoneKey: "formCompleted",
    label: { he: "צור אסטרטגיה ראשונה", en: "Create your first strategy" },
    description: { he: "2 לחיצות ויש לך תוכנית שיווקית מלאה", en: "2 clicks and you have a full marketing plan" },
    route: "/wizard",
    unlocks: null,
  },
  {
    milestoneKey: "firstPlanSaved",
    label: { he: "שמור את התוכנית", en: "Save your plan" },
    description: { he: "שמור כדי לעקוב אחר ההתקדמות שלך לאורך זמן", en: "Save to track your progress over time" },
    route: "/wizard",
    unlocks: { he: "פותח: Data Hub", en: "Unlocks: Data Hub" },
  },
  {
    milestoneKey: "dataSourceConnected",
    label: { he: "חבר מקור נתונים", en: "Connect a data source" },
    description: { he: "ייבא נתוני Meta, Google Ads, CRM או Excel", en: "Import Meta, Google Ads, CRM or Excel data" },
    route: "/data",
    unlocks: { he: "פותח: 5 הודעות AI Coach חינם", en: "Unlocks: 5 free AI Coach messages" },
  },
  {
    milestoneKey: "stylomeAnalyzed",
    label: { he: "צור טביעת סגנון", en: "Create your style fingerprint" },
    description: { he: "ניתוח הסגנון שלך לקופי מותאם אישית", en: "Analyze your style for personalized copy" },
    route: "/strategy",
    unlocks: { he: "פותח: התאמה ארכיטיפית מלאה", en: "Unlocks: Full archetype personalization" },
  },
  {
    milestoneKey: "coachUsed",
    label: { he: "שאל את ה-AI Coach", en: "Ask the AI Coach" },
    description: { he: "קבל תשובות אסטרטגיות בשניות", en: "Get strategic answers in seconds" },
    route: "/ai",
    unlocks: null,
  },
];

interface NextStepCardProps {
  milestones: OnboardingMilestones;
}

export function NextStepCard({ milestones }: NextStepCardProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const completedCount = STEPS.filter((s) => milestones[s.milestoneKey]).length;
  const nextStep = STEPS.find((s) => !milestones[s.milestoneKey]);

  if (!nextStep) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/8 to-transparent">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {tx({ he: "הצעד הבא שלך", en: "Your next step" }, language)}
          </span>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{STEPS.length}
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground" dir="auto">
            {language === "he" ? nextStep.label.he : nextStep.label.en}
          </p>
          <p className="text-xs text-muted-foreground" dir="auto">
            {language === "he" ? nextStep.description.he : nextStep.description.en}
          </p>
        </div>

        {nextStep.unlocks && (
          <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <Lock className="h-3 w-3" />
            <span dir="auto">
              {language === "he" ? nextStep.unlocks.he : nextStep.unlocks.en}
            </span>
          </div>
        )}

        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${Math.max(8, (completedCount / STEPS.length) * 100)}%` }}
          />
        </div>

        <Button
          size="sm"
          className="w-full gap-2"
          onClick={() => navigate(nextStep.route)}
        >
          <span dir="auto">
            {language === "he" ? nextStep.label.he : nextStep.label.en}
          </span>
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Button>
      </CardContent>
    </Card>
  );
}
