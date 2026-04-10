// ═══════════════════════════════════════════════
// Tutorial Flow
// Contextual step-by-step walkthroughs for major features.
// Extends the OnboardingOverlay pattern with completion tracking.
// ═══════════════════════════════════════════════

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CheckCircle, BookOpen } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

export type TutorialModule =
  | "funnel"
  | "differentiation"
  | "copy_lab"
  | "analytics"
  | "pricing"
  | "retention"
  | "sales"
  | "competitive_intel";

export interface TutorialStep {
  title: { he: string; en: string };
  body: { he: string; en: string };
  tip?: { he: string; en: string };
  glossaryTerm?: string;
}

export interface TutorialModuleDefinition {
  module: TutorialModule;
  name: { he: string; en: string };
  description: { he: string; en: string };
  steps: TutorialStep[];
}

// ───────────────────────────────────────────────
// Module definitions
// ───────────────────────────────────────────────

const MODULES: Record<TutorialModule, TutorialModuleDefinition> = {
  funnel: {
    module: "funnel",
    name: { he: "בניית משפך", en: "Funnel Builder" },
    description: { he: "מדריך לבניית משפך שיווק מלא", en: "Guide to building a full marketing funnel" },
    steps: [
      {
        title: { he: "מה זה משפך?", en: "What is a funnel?" },
        body: { he: "משפך שיווק הוא המסע של הלקוח מ'לא מכיר' ל'קונה חוזר'. כל שלב דורש אסטרטגיה אחרת.", en: "A marketing funnel is the customer's journey from 'unaware' to 'repeat buyer'. Each stage needs a different strategy." },
      },
      {
        title: { he: "5 השלבים", en: "The 5 stages" },
        body: { he: "מודעות → מעורבות → לידים → המרה → שימור. כל שלב מקבל אחוז מהתקציב.", en: "Awareness → Engagement → Leads → Conversion → Retention. Each stage gets a budget percentage." },
      },
      {
        title: { he: "איך להתחיל?", en: "How to start?" },
        body: { he: "מלא את הטופס שמאל — עסק, קהל, מטרה, תקציב. ה-AI יבנה לך את המשפך תוך 30 שניות.", en: "Fill the form on the left — business, audience, goal, budget. The AI will build your funnel in 30 seconds." },
        tip: { he: "התחל פשוט — תמיד תוכל לחזור ולחדד", en: "Start simple — you can always come back and refine" },
      },
    ],
  },
  differentiation: {
    module: "differentiation",
    name: { he: "בידול תחרותי", en: "Competitive Differentiation" },
    description: { he: "מצא את היתרון התחרותי שלך", en: "Find your competitive edge" },
    steps: [
      {
        title: { he: "למה בידול חשוב?", en: "Why differentiation matters" },
        body: { he: "בשוק רווי, בידול הוא ההבדל בין צמיחה לקיפאון. מחקר הראה שמותגים עם בידול חד גדלים פי 3 מהר יותר.", en: "In a saturated market, differentiation is the difference between growth and stagnation. Research shows sharply differentiated brands grow 3x faster." },
      },
      {
        title: { he: "8 זוויות הבידול", en: "The 8 differentiation angles" },
        body: { he: "מחיר, איכות, שירות, מהירות, חדשנות, סגמנט, חוויה, מותג. בחר 1-2 מובילים, לא את כולם.", en: "Price, quality, service, speed, innovation, segment, experience, brand. Pick 1-2 leaders, not all." },
      },
      {
        title: { he: "איך לבחור זווית?", en: "How to pick an angle?" },
        body: { he: "הזווית הכי טובה היא זו שאתה גם מצטיין בה וגם החברה לא — והקהל שלך אכפת לו ממנה.", en: "The best angle is one you excel at that competitors don't — and that your audience cares about." },
      },
    ],
  },
  copy_lab: {
    module: "copy_lab",
    name: { he: "מעבדת קופי", en: "Copy Lab" },
    description: { he: "ניתוח ושיפור קופי בזמן אמת", en: "Real-time copy analysis & improvement" },
    steps: [
      {
        title: { he: "מה מנוע ה-QA בודק?", en: "What the QA engine checks" },
        body: { he: "קורטיזול, אמון, reactance, התאמת פרסונה, CTA, הוכחה חברתית — ו-SOTA² stylometry לזיהוי AI.", en: "Cortisol, trust, reactance, persona fit, CTA, social proof — and SOTA² stylometry for AI detection." },
      },
      {
        title: { he: "איך לפרש את הציון?", en: "How to read the score" },
        body: { he: "85+ מוכן לפרסום. 70-84 טוב. 55-69 דרוש שיפור. מתחת ל-55 — שכתב.", en: "85+ ready to publish. 70-84 good. 55-69 needs work. Below 55 — rewrite." },
      },
    ],
  },
  analytics: {
    module: "analytics",
    name: { he: "דשבורד אנליטיקה", en: "Analytics Dashboard" },
    description: { he: "הבן את הביצועים והמגמות שלך", en: "Understand your performance and trends" },
    steps: [
      {
        title: { he: "מה זה EPS?", en: "What is EPS?" },
        body: { he: "Emotional Performance Score — ציון 0-100 המשקף את הבריאות הרגשית של המשפך שלך.", en: "Emotional Performance Score — a 0-100 score reflecting your funnel's emotional health." },
        glossaryTerm: "eps",
      },
      {
        title: { he: "Cross-Domain Insights", en: "Cross-Domain Insights" },
        body: { he: "אסטרטגיות מוצלחות מתעשיות אחרות שניתן להעביר לשלך — לדוגמה, gamification מ-EdTech ל-SaaS.", en: "Successful strategies from other industries transferable to yours — e.g., gamification from EdTech to SaaS." },
      },
      {
        title: { he: "Behavioral Cohorts", en: "Behavioral Cohorts" },
        body: { he: "12 קוהורטים התנהגותיים שמחלקים את הקהל לפי DISC × בגרות × תקציב.", en: "12 behavioral cohorts segmenting audience by DISC × maturity × budget." },
      },
    ],
  },
  pricing: {
    module: "pricing",
    name: { he: "אסטרטגיית תמחור", en: "Pricing Strategy" },
    description: { he: "תמחר נכון — נפשית ואסטרטגית", en: "Price right — psychologically and strategically" },
    steps: [
      {
        title: { he: "3 מודלי תמחור מרכזיים", en: "3 core pricing models" },
        body: { he: "Value-based, Competition-based, Cost-plus. הטוב ביותר? Value-based — מחבר מחיר לתוצאה.", en: "Value-based, Competition-based, Cost-plus. The best? Value-based — connects price to outcome." },
      },
      {
        title: { he: "עוגנים פסיכולוגיים", en: "Psychological anchoring" },
        body: { he: "הצג תחילה מחיר גבוה, ואז האפשרות הריאלית תיראה כמו מציאה.", en: "Show the high price first, then your real option looks like a bargain." },
      },
    ],
  },
  retention: {
    module: "retention",
    name: { he: "שימור לקוחות", en: "Customer Retention" },
    description: { he: "הגדל LTV ב-40% דרך שימור", en: "Grow LTV by 40% through retention" },
    steps: [
      {
        title: { he: "עלות שימור < עלות רכישה", en: "Retention cost < acquisition cost" },
        body: { he: "שימור לקוח קיים עולה פי 5-7 פחות מרכישת לקוח חדש. תעדוף — חובה.", en: "Retaining a customer costs 5-7x less than acquiring one. Prioritize — it's mandatory." },
      },
      {
        title: { he: "3 מנועי שימור", en: "3 retention engines" },
        body: { he: "Onboarding מצוין, ערך מצטבר לאורך זמן, קהילה. בלי אלה — דליפה.", en: "Excellent onboarding, cumulative value over time, community. Without these — leaks." },
      },
    ],
  },
  sales: {
    module: "sales",
    name: { he: "תהליך מכירה", en: "Sales Process" },
    description: { he: "סגור יותר עסקאות עם פחות חיכוך", en: "Close more deals with less friction" },
    steps: [
      {
        title: { he: "4 שלבי מכירה", en: "4 sales stages" },
        body: { he: "Discovery → Proposal → Negotiation → Close. כל שלב עם קריטריון מעבר ברור.", en: "Discovery → Proposal → Negotiation → Close. Each stage with a clear exit criterion." },
      },
      {
        title: { he: "המכירה מתחילה ב'לא'", en: "The sale starts with 'no'" },
        body: { he: "רוב המכירות קורות אחרי התנגדות ראשונה. למד לטפל ב-5 התנגדויות הנפוצות.", en: "Most sales happen after the first objection. Learn to handle the 5 common objections." },
      },
    ],
  },
  competitive_intel: {
    module: "competitive_intel",
    name: { he: "מודיעין תחרותי", en: "Competitive Intelligence" },
    description: { he: "דע מה מתחריך עושים — ונצל את הפערים", en: "Know what competitors do — and exploit the gaps" },
    steps: [
      {
        title: { he: "למה זה חשוב?", en: "Why it matters" },
        body: { he: "70% מהחברות לא עוקבות אחרי תחרות באופן מובנה. זה יתרון מיידי לכל מי שעושה זאת.", en: "70% of companies don't track competition systematically. That's an instant edge for anyone who does." },
      },
      {
        title: { he: "מה למדוד?", en: "What to measure" },
        body: { he: "Positioning, pricing, ערוצים, מסרים, קהל. אל תעתיק — זהה פערים.", en: "Positioning, pricing, channels, messaging, audience. Don't copy — spot gaps." },
      },
      {
        title: { he: "כלי המודיעין שלנו", en: "Our intel tools" },
        body: { he: "Radar chart, Industry Benchmarks, Differentiation Engine — שלושתם יחד נותנים תמונה שלמה.", en: "Radar chart, Industry Benchmarks, Differentiation Engine — all three together give a full picture." },
      },
    ],
  },
};

// ───────────────────────────────────────────────
// Public helpers
// ───────────────────────────────────────────────

export function getTutorialModules(): TutorialModuleDefinition[] {
  return Object.values(MODULES);
}

export function getTutorialModule(id: TutorialModule): TutorialModuleDefinition | undefined {
  return MODULES[id];
}

function storageKey(module: TutorialModule): string {
  return `funnelforge-tutorial-${module}-done`;
}

export function isTutorialCompleted(module: TutorialModule): boolean {
  try {
    return localStorage.getItem(storageKey(module)) === "true";
  } catch {
    return false;
  }
}

export function markTutorialCompleted(module: TutorialModule): void {
  try {
    localStorage.setItem(storageKey(module), "true");
  } catch {
    /* storage unavailable */
  }
}

// ───────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────

interface TutorialFlowProps {
  module: TutorialModule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TutorialFlow({ module, open, onOpenChange }: TutorialFlowProps) {
  const { language } = useLanguage();
  const definition = MODULES[module];
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    if (open) setStepIdx(0);
  }, [open]);

  if (!definition) return null;
  const t = (he: string, en: string) => (language === "he" ? he : en);
  const step = definition.steps[stepIdx];
  const isLast = stepIdx === definition.steps.length - 1;
  const progress = ((stepIdx + 1) / definition.steps.length) * 100;

  function next() {
    if (isLast) {
      markTutorialCompleted(module);
      onOpenChange(false);
    } else {
      setStepIdx((i) => i + 1);
    }
  }

  function prev() {
    setStepIdx((i) => Math.max(0, i - 1));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <Badge variant="outline">{definition.name[language]}</Badge>
          </div>
          <DialogTitle>{step.title[language]}</DialogTitle>
          <DialogDescription>{step.body[language]}</DialogDescription>
        </DialogHeader>

        {step.tip && (
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <span className="font-medium">{t("טיפ:", "Tip:")}</span> {step.tip[language]}
          </div>
        )}

        <div className="space-y-2">
          <Progress value={progress} className="h-1" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t(`שלב ${stepIdx + 1} מתוך ${definition.steps.length}`, `Step ${stepIdx + 1} of ${definition.steps.length}`)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={prev} disabled={stepIdx === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t("הקודם", "Back")}
          </Button>
          <Button size="sm" onClick={next}>
            {isLast ? (
              <>
                <CheckCircle className="h-4 w-4 mr-1" />
                {t("סיום", "Finish")}
              </>
            ) : (
              <>
                {t("הבא", "Next")}
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TutorialFlow;
