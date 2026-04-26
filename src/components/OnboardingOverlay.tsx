import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { safeStorage } from "@/lib/safeStorage";
import { tx } from "@/i18n/tx";
import { Target, BarChart3, Rocket, ArrowRight, X } from "lucide-react";

const STORAGE_KEY = "funnelforge-onboarding-done";

const OnboardingOverlay = () => {
  const { language } = useLanguage();
  const { profile } = useUserProfile();
  const isHe = language === "he";

  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(() => {
    return safeStorage.getString(STORAGE_KEY, "") === "true" || profile.isReturningUser;
  });

  if (dismissed) return null;

  const steps = [
    {
      icon: Target,
      color: "text-destructive",
      bg: "bg-destructive/10",
      title: { he: "ספר לנו על העסק שלך", en: "Tell us about your business" },
      desc: {
        he: "תענה על כמה שאלות פשוטות. אנחנו נבנה לך תוכנית שיווק מותאמת אישית",
        en: "Answer a few simple questions. We'll build you a personalized marketing plan",
      },
    },
    {
      icon: BarChart3,
      color: "text-primary",
      bg: "bg-primary/10",
      title: { he: "קבל אסטרטגיה מבוססת מדע", en: "Get science-based strategy" },
      desc: {
        he: "המערכת משתמשת בנוירו-סטוריטלינג ומדע התנהגותי כדי לבנות משפך שעובד",
        en: "The system uses neuro-storytelling and behavioral science to build a funnel that works",
      },
    },
    {
      icon: Rocket,
      color: "text-accent-foreground",
      bg: "bg-accent/10",
      title: { he: "שמור, השווה ומטב", en: "Save, compare & optimize" },
      desc: {
        he: "שמור תוכניות, ייבא נתונים מ-Excel, ונטר את הביצועים שלך בזמן אמת",
        en: "Save plans, import Excel data, and monitor your performance in real-time",
      },
    },
  ];

  const handleDismiss = () => {
    safeStorage.setString(STORAGE_KEY, "true");
    setDismissed(true);
  };

  const currentStep = steps[step];

  return (
    <Dialog open={!dismissed} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
      <DialogContent className="max-w-md text-center p-8" aria-describedby={undefined}>
        <button
          onClick={handleDismiss}
          className="absolute top-3 end-3 text-muted-foreground hover:text-foreground"
          aria-label={tx({ he: "סגור", en: "Close" }, language)}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Step indicator */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-8 bg-primary" : "w-4 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${currentStep.bg}`}>
          <currentStep.icon className={`h-8 w-8 ${currentStep.color}`} />
        </div>

        <h3 className="mb-3 text-xl font-bold text-foreground">
          {currentStep.title[language]}
        </h3>
        <p className="mb-8 text-sm text-muted-foreground leading-relaxed">
          {currentStep.desc[language]}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            {tx({ he: "דלג", en: "Skip" }, language)}
          </Button>

          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} className="gap-2">
              {tx({ he: "הבא", en: "Next" }, language)}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleDismiss} className="gap-2 bg-primary text-primary-foreground border-0">
              {tx({ he: "בוא נתחיל!", en: "Let's go!" }, language)}
              <Rocket className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingOverlay;
