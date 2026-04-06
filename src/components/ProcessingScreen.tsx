import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { FormData } from "@/types/funnel";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface ProcessingScreenProps {
  onComplete: () => void;
  formData?: FormData;
}

const ProcessingScreen = ({ onComplete, formData }: ProcessingScreenProps) => {
  const { t, language } = useLanguage();
  const reducedMotion = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const isHe = language === "he";

  // Contextual messages based on formData (Health-Tech pattern)
  const messages = formData
    ? getContextualMessages(formData, isHe)
    : [t("processingStep1"), t("processingStep2"), t("processingStep3"), t("processingStep4")];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setCelebrating(true);
          setTimeout(() => setShowContinue(true), 2000);
          return 100;
        }
        return prev + 2;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [onComplete]);

  useEffect(() => {
    const idx = Math.min(Math.floor(progress / 25), messages.length - 1);
    setMsgIndex(idx);
  }, [progress, messages.length]);

  // Neuro-spectrum gradient: cortisol → oxytocin → dopamine
  const gradientStops = progress < 33
    ? "hsl(var(--destructive)), hsl(var(--chart-3))"   // cortisol→opportunity (red→orange)
    : progress < 66
    ? "hsl(var(--primary)), hsl(var(--chart-4))"        // oxytocin→insight (blue→purple)
    : "hsl(var(--accent)), hsl(var(--primary))";         // dopamine→trust (green→blue)

  // Celebration state
  if (celebrating) {
    const fieldName = formData?.businessField
      ? (isHe ? getFieldNameForCelebration(formData.businessField, true) : getFieldNameForCelebration(formData.businessField, false))
      : "";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="flex flex-col items-center text-center"
        >
          <div className="text-6xl mb-4" role="img" aria-label="celebration">🎉</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2" dir="auto">
            {isHe ? "התוכנית שלך מוכנה!" : "Your plan is ready!"}
          </h2>
          <p className="text-lg text-muted-foreground" dir="auto">
            {fieldName
              ? (isHe ? `תוכנית שיווק מותאמת ל${fieldName} — בוא נראה את התוצאות` : `Personalized ${fieldName} marketing plan — let's see the results`)
              : (isHe ? "בוא נראה מה בנינו" : "Let's see what we built")}
          </p>
          <div className="mt-4 flex gap-2">
            {["🚀", "📊", "💡", "🎯", "✨"].map((e, i) => (
              <motion.span
                key={i}
                role="img"
                aria-hidden="true"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 * i }}
                className="text-2xl"
              >{e}</motion.span>
            ))}
          </div>
          {showContinue && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <Button size="lg" onClick={onComplete} className="funnel-gradient text-accent-foreground font-semibold px-8">
                {isHe ? "בוא נראה את התוצאות →" : "See your results →"}
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  if (reducedMotion) {
    // Static fallback for reduced motion
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center">
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl funnel-gradient">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-accent-foreground">
              <path d="M3 4h18l-6 8v6l-6 2V12L3 4z" fill="currentColor" opacity="0.9" />
            </svg>
          </div>
          <h2 className="mb-4 text-2xl font-bold text-foreground">{t("processingTitle")}</h2>
          <div className="mb-4 h-2 w-64 overflow-hidden rounded-full bg-muted">
            <div className="h-full funnel-gradient" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-muted-foreground" aria-live="polite">{messages[msgIndex]}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center"
      >
        {/* Animated Funnel with neuro-spectrum gradient */}
        <div className="relative mb-8 h-32 w-32">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <defs>
              <clipPath id="funnelClip">
                <path d="M15 10 L85 10 L65 45 L65 80 L35 90 L35 45 Z" />
              </clipPath>
              <linearGradient id="fillGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor={`hsl(var(--accent))`} />
                <stop offset="50%" stopColor={`hsl(var(--primary))`} />
                <stop offset="100%" stopColor={`hsl(var(--destructive))`} />
              </linearGradient>
            </defs>
            <path
              d="M15 10 L85 10 L65 45 L65 80 L35 90 L35 45 Z"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="2"
            />
            <g clipPath="url(#funnelClip)">
              <motion.rect
                x="0"
                width="100"
                height="100"
                fill="url(#fillGrad)"
                initial={{ y: 100 }}
                animate={{ y: 100 - progress }}
                transition={{ ease: "easeOut" }}
              />
            </g>
          </svg>
        </div>

        <h2 className="mb-4 text-2xl font-bold text-foreground">{t("processingTitle")}</h2>

        {/* Progress bar with neuro-spectrum */}
        <div className="mb-4 h-2 w-64 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${gradientStops})`,
            }}
          />
        </div>

        <motion.p
          key={msgIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-muted-foreground"
          aria-live="polite"
        >
          {messages[msgIndex]}
        </motion.p>
      </motion.div>
    </div>
  );
};

function getContextualMessages(formData: FormData, isHe: boolean): string[] {
  const fieldNames: Record<string, { he: string; en: string }> = {
    fashion: { he: "אופנה", en: "fashion" },
    tech: { he: "טכנולוגיה", en: "tech" },
    food: { he: "מזון", en: "food" },
    services: { he: "שירותים", en: "services" },
    education: { he: "חינוך", en: "education" },
    health: { he: "בריאות", en: "health" },
    realEstate: { he: "נדל\"ן", en: "real estate" },
    tourism: { he: "תיירות", en: "tourism" },
    personalBrand: { he: "מותג אישי", en: "personal brand" },
    other: { he: "העסק שלך", en: "your business" },
  };

  const field = fieldNames[formData.businessField || "other"] || fieldNames.other;
  const expLabels: Record<string, { he: string; en: string }> = {
    beginner: { he: "מתחילים", en: "beginner-friendly" },
    intermediate: { he: "בינוניים", en: "intermediate" },
    advanced: { he: "מתקדמים", en: "advanced" },
  };
  const exp = expLabels[formData.experienceLevel || "beginner"] || expLabels.beginner;

  if (isHe) {
    return [
      `מנתח את שוק ה${field.he}...`,
      `בונה אסטרטגיית ערוצים עבור תקציב ${formData.budgetRange || ""}...`,
      `מתאים המלצות לרמת ${exp.he}...`,
      `מייצר את תוכנית הפעולה שלך!`,
    ];
  }
  return [
    `Analyzing the ${field.en} market...`,
    `Building channel strategy for ${formData.budgetRange || ""} budget...`,
    `Tailoring ${exp.en} recommendations...`,
    `Generating your action plan!`,
  ];
}

function getFieldNameForCelebration(field: string, isHe: boolean): string {
  const map: Record<string, { he: string; en: string }> = {
    fashion: { he: "אופנה", en: "fashion" }, tech: { he: "טכנולוגיה", en: "tech" },
    food: { he: "מזון", en: "food" }, services: { he: "שירותים", en: "services" },
    education: { he: "חינוך", en: "education" }, health: { he: "בריאות", en: "health" },
    realEstate: { he: "נדל\"ן", en: "real estate" }, tourism: { he: "תיירות", en: "tourism" },
    personalBrand: { he: "מיתוג אישי", en: "personal brand" }, other: { he: "עסקים", en: "business" },
  };
  return isHe ? (map[field]?.he || "") : (map[field]?.en || "");
}

export default ProcessingScreen;
