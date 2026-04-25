// ═══════════════════════════════════════════════
// src/pages/Intake.tsx
//
// Two-question pre-flight intake. Total time budget: ~30 seconds.
//
// Flow:
//   Step 1 — IntakeNeed (time / money / attention)
//   Step 2 — IntakePain (finance / product / sales / marketing)
//   Confirm — show resolved promise + route to relevant module
//
// Design rules:
// 1. No back navigation between steps. Going back resets — friction
//    is the wrong tool here. The user can re-take from settings if
//    they want a different answer.
// 2. Each step is one screen, large hit targets, no text inputs.
// 3. The "promise reveal" before navigation gives the user a reason
//    to commit to the next module.
// ═══════════════════════════════════════════════

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Wallet, Eye, Banknote, Package, Handshake, Megaphone, ArrowRight, Sparkles } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { setIntakeSignal } from "@/engine/intake/intakeSignal";
import type { IntakeNeed, IntakePain, IntakeRouting } from "@/engine/intake/types";
import { resolveIntake } from "@/engine/intake/intakeMatrix";

type Step = "need" | "pain" | "confirm";

const NEED_OPTIONS: { id: IntakeNeed; he: string; en: string; icon: typeof Clock }[] = [
  { id: "time",      he: "זמן",     en: "Time",      icon: Clock },
  { id: "money",     he: "כסף",     en: "Money",     icon: Wallet },
  { id: "attention", he: "קשב",    en: "Attention",  icon: Eye },
];

const PAIN_OPTIONS: { id: IntakePain; he: string; en: string; sub: { he: string; en: string }; icon: typeof Banknote }[] = [
  {
    id: "finance",
    he: "פיננסים",
    en: "Finance",
    sub: { he: "תמחור, תזרים, רווחיות", en: "Pricing, cashflow, margins" },
    icon: Banknote,
  },
  {
    id: "product",
    he: "מוצר",
    en: "Product",
    sub: { he: "בידול, מיצוב, מה מיוחד בי", en: "Differentiation, positioning" },
    icon: Package,
  },
  {
    id: "sales",
    he: "מכירות",
    en: "Sales",
    sub: { he: "סקריפטים, סגירה, התנגדויות", en: "Scripts, closing, objections" },
    icon: Handshake,
  },
  {
    id: "marketing",
    he: "שיווק",
    en: "Marketing",
    sub: { he: "ערוצים, hooks, תוכנית", en: "Channels, hooks, planning" },
    icon: Megaphone,
  },
];

const Intake = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("need");
  const [need, setNeed] = useState<IntakeNeed | null>(null);
  const [pain, setPain] = useState<IntakePain | null>(null);

  const routing: IntakeRouting | null =
    need && pain ? resolveIntake(need, pain) : null;

  const handleNeedSelect = (id: IntakeNeed) => {
    setNeed(id);
    setStep("pain");
  };

  const handlePainSelect = (id: IntakePain) => {
    setPain(id);
    setStep("confirm");
  };

  const handleConfirm = () => {
    if (!need || !pain) return;
    setIntakeSignal(need, pain);
    navigate(routing!.target);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Step indicator */}
      <div className="flex justify-center gap-2 mb-8">
        {(["need", "pain", "confirm"] as Step[]).map((s) => (
          <div
            key={s}
            className={`h-1.5 w-12 rounded-full transition-colors ${
              step === s ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === "need" && (
          <motion.div
            key="need"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2" dir="auto">
              {tx({ he: "מה הכי חסר לך עכשיו?", en: "What's missing most right now?" }, language)}
            </h1>
            <p className="text-sm text-muted-foreground text-center mb-8" dir="auto">
              {tx({ he: "שתי שאלות, פחות מ-30 שניות.", en: "Two questions, under 30 seconds." }, language)}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {NEED_OPTIONS.map(({ id, he, en, icon: Icon }) => (
                <Card
                  key={id}
                  data-testid={`intake-need-${id}`}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleNeedSelect(id)}
                >
                  <CardContent className="p-6 flex flex-col items-center gap-2 text-center">
                    <Icon className="h-8 w-8 text-primary" />
                    <span className="text-lg font-semibold" dir="auto">
                      {isHe ? he : en}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {step === "pain" && (
          <motion.div
            key="pain"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2" dir="auto">
              {tx({ he: "איפה הכאב חזק ביותר?", en: "Where's the pain strongest?" }, language)}
            </h1>
            <p className="text-sm text-muted-foreground text-center mb-8" dir="auto">
              {tx({ he: "בחר את האזור הכי לוחץ.", en: "Pick the most pressing area." }, language)}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PAIN_OPTIONS.map(({ id, he, en, sub, icon: Icon }) => (
                <Card
                  key={id}
                  data-testid={`intake-pain-${id}`}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handlePainSelect(id)}
                >
                  <CardContent className="p-5 flex items-center gap-3">
                    <Icon className="h-7 w-7 text-primary shrink-0" />
                    <div>
                      <div className="text-base font-semibold" dir="auto">
                        {isHe ? he : en}
                      </div>
                      <div className="text-xs text-muted-foreground" dir="auto">
                        {isHe ? sub.he : sub.en}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {step === "confirm" && routing && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-8 space-y-4 text-center">
                <Sparkles className="h-10 w-10 text-primary mx-auto" />
                <h2 className="text-2xl font-bold" dir="auto">
                  {isHe ? routing.promise.headline.he : routing.promise.headline.en}
                </h2>
                <p className="text-sm text-muted-foreground" dir="auto">
                  {isHe ? routing.promise.kicker.he : routing.promise.kicker.en}
                </p>
                <Button
                  size="lg"
                  className="gap-2 mt-4"
                  data-testid="intake-confirm"
                  onClick={handleConfirm}
                >
                  {tx({ he: "בוא נתחיל", en: "Let's start" }, language)}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="text-xs text-muted-foreground pt-2" dir="auto">
                  {tx(
                    { he: `זמן משוער: ~${routing.promise.expectedMinutes} דקות`, en: `Estimated time: ~${routing.promise.expectedMinutes} min` },
                    language,
                  )}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Intake;
