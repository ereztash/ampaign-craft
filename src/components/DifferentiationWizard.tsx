import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useIsMobile } from "@/hooks/use-mobile";
import { DifferentiationFormData, DifferentiationResult, initialDifferentiationFormData, AiPhase2Result, AiPhase3Result, AiPhase4Result, AiPhase5Result } from "@/types/differentiation";
import { PHASES } from "@/engine/differentiationPhases";
import { generateDifferentiation, AiResults } from "@/engine/differentiationEngine";
import { canProceedPhase, getPhaseColor } from "@/lib/differentiationFormRules";
import DifferentiationPhaseCard from "@/components/DifferentiationPhaseCard";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { tx } from "@/i18n/tx";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";

interface DifferentiationWizardProps {
  onComplete: (result: DifferentiationResult) => void;
  onBack: () => void;
  initialPrefill?: Partial<DifferentiationFormData>;
}

const DifferentiationWizard = ({ onComplete, onBack, initialPrefill }: DifferentiationWizardProps) => {
  const { t, language, isRTL } = useLanguage();
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const isHe = language === "he";

  const [phaseIndex, setPhaseIndex] = useState(0);
  const [formData, setFormData] = useState<DifferentiationFormData>({
    ...initialDifferentiationFormData,
    ...initialPrefill,
  });
  const [direction, setDirection] = useState(1);
  const [aiResults, setAiResults] = useState<AiResults>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiInsights, setAiInsights] = useState<string[]>([]);

  const currentPhase = PHASES[phaseIndex];
  const progress = ((phaseIndex + 1) / PHASES.length) * 100;
  const canProceed = canProceedPhase(currentPhase.id, formData);

  const update = (partial: Partial<DifferentiationFormData>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  };

  const variants = reducedMotion
    ? { enter: {}, center: {}, exit: {} }
    : {
        enter: (d: number) => ({ x: d > 0 ? (isRTL ? -200 : 200) : (isRTL ? 200 : -200), opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (d: number) => ({ x: d > 0 ? (isRTL ? 200 : -200) : (isRTL ? -200 : 200), opacity: 0 }),
      };

  const callAi = async (phaseName: string) => {
    setAiLoading(true);
    setAiError(null);
    setAiInsights([]);

    try {
      const _resp = await fetch("/api/growth/differentiation-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: phaseName, formData, previousResults: aiResults }),
      });
      const data = await _resp.json();
      const error = _resp.ok ? null : (data?.error || _resp.statusText);

      if (error) throw new Error(error || "Edge Function error");
      if (data?.error) throw new Error(data.error);

      const result = data?.result;
      if (!result) throw new Error("Empty AI response");

      // Store AI results by phase
      if (phaseName === "contradiction") {
        setAiResults((prev) => ({ ...prev, phase2: result as AiPhase2Result }));
        // Update formData with verified claims
        if (result.verifiedClaims) {
          update({ claimExamples: result.verifiedClaims });
        }
        const verified = (result.verifiedClaims || []).filter((c: { verified: boolean }) => c.verified).length;
        const total = (result.verifiedClaims || []).length;
        setAiInsights([
          tx({ he: `${verified} מתוך ${total} טענות אומתו`, en: `${verified} of ${total} claims verified` }, language),
        ]);
      } else if (phaseName === "hidden") {
        setAiResults((prev) => ({ ...prev, phase3: result as AiPhase3Result }));
        const insights = (result.ashamedPainInsights || []).length;
        setAiInsights([
          tx({ he: `${insights} הזדמנויות בידול זוהו מתוך הכאבים הנסתרים`, en: `${insights} differentiation opportunities identified from hidden pains` }, language),
        ]);
      } else if (phaseName === "mapping") {
        setAiResults((prev) => ({ ...prev, phase4: result as AiPhase4Result }));
        setAiInsights([
          tx({ he: "אסטרטגיות נגד ונרטיבים מותאמים נוצרו", en: "Counter-strategies and tailored narratives generated" }, language),
        ]);
      } else if (phaseName === "synthesis") {
        setAiResults((prev) => ({ ...prev, phase5: result as AiPhase5Result }));
        // Generate final result and complete
        const finalResult = generateDifferentiation(formData, { ...aiResults, phase5: result as AiPhase5Result });
        onComplete(finalResult);
        return;
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setAiLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentPhase.aiEnrichment) {
      await callAi(currentPhase.id);
      if (currentPhase.id === "synthesis") return; // onComplete called in callAi
      // If AI failed, don't block — user can still proceed (insights will be empty)
      if (aiError) return; // stay on phase, show error + skip button
    }
    setDirection(1);
    setPhaseIndex((i) => Math.min(i + 1, PHASES.length - 1));
  };

  const handleSkipAi = () => {
    // Skip AI enrichment and continue with local-only results
    setAiError(null);
    setAiInsights([]);
    if (currentPhase.id === "synthesis") {
      // Generate without AI
      const finalResult = generateDifferentiation(formData, aiResults);
      onComplete(finalResult);
      return;
    }
    setDirection(1);
    setPhaseIndex((i) => Math.min(i + 1, PHASES.length - 1));
  };

  const handlePrev = () => {
    setDirection(-1);
    setAiInsights([]);
    setAiError(null);
    setPhaseIndex((i) => Math.max(i - 1, 0));
  };

  // Phase 5 auto-triggers AI
  const isSynthesisPhase = currentPhase.id === "synthesis";

  return (
    <div className={`max-w-2xl mx-auto ${isMobile ? "space-y-4 px-1" : "space-y-6"}`}>
      {/* Progress bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          {PHASES.map((phase, i) => (
            <div key={phase.id} className="flex flex-col items-center gap-1">
              <div
                className={`${isMobile ? "w-7 h-7 text-xs" : "w-8 h-8 text-xs"} rounded-full flex items-center justify-center font-bold transition-colors ${
                  i <= phaseIndex ? "text-white" : "text-muted-foreground bg-muted"
                }`}
                style={i <= phaseIndex ? { backgroundColor: phase.color } : undefined}
              >
                {i < phaseIndex ? "✓" : phase.number}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block">{phase.title[language]}</span>
            </div>
          ))}
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Phase header */}
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold" dir="auto" style={{ color: currentPhase.color }}>
          {currentPhase.title[language]}
        </h2>
        <p className="text-sm text-muted-foreground" dir="auto">{currentPhase.description[language]}</p>
      </div>

      {/* Phase content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentPhase.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={reducedMotion ? { duration: 0 } : { duration: 0.3, ease: "easeInOut" }}
        >
          {isSynthesisPhase ? (
            <Card>
              <CardContent className="p-8 text-center space-y-4">
                {aiLoading ? (
                  <>
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="text-lg font-medium">{t("diffLoading")}</p>
                    <p className="text-sm text-muted-foreground">
                      {tx({ he: "מסנתז 5 שלבים של ניתוח...", en: "Synthesizing 5 phases of analysis..." }, language)}
                    </p>
                  </>
                ) : aiError ? (
                  <>
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                    <p className="text-sm text-destructive">{aiError}</p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Button onClick={() => { setAiError(null); callAi("synthesis"); }}>
                        {tx({ he: "🔄 נסה שוב", en: "🔄 Try Again" }, language)}
                      </Button>
                      <Button variant="outline" onClick={handleSkipAi}>
                        {tx({ he: "צור דוח בלי AI", en: "Generate without AI" }, language)}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-12 w-12 text-amber-600 mx-auto" />
                    <p className="text-lg font-medium" dir="auto">
                      {tx({ he: "הכל מוכן. לחץ לסינתזה סופית", en: "Everything ready. Click for final synthesis" }, language)}
                    </p>
                    <Button size="lg" onClick={() => callAi("synthesis")} className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      {tx({ he: "צור דוח בידול", en: "Generate Differentiation Report" }, language)}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <DifferentiationPhaseCard
                  questions={currentPhase.questions}
                  formData={formData}
                  onUpdate={update}
                />
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* AI Insights (shown between phases) */}
      {aiInsights.length > 0 && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 shrink-0" />
            <div className="space-y-1">
              {aiInsights.map((insight, i) => (
                <p key={i} className="text-sm text-foreground" dir="auto">{insight}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Error */}
      {/* AI Error with retry + skip */}
      {aiError && !isSynthesisPhase && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-destructive">{aiError}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("diffError")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => { setAiError(null); handleNext(); }}>
                {tx({ he: "🔄 נסה שוב", en: "🔄 Try again" }, language)}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleSkipAi} className="text-muted-foreground">
                {tx({ he: "המשך בלי AI →", en: "Continue without AI →" }, language)}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      {!isSynthesisPhase && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={phaseIndex === 0 ? onBack : handlePrev} className="gap-1">
            {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {t("diffBack")}
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed || aiLoading}
            className="gap-1"
          >
            {aiLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : currentPhase.aiEnrichment ? (
              <>
                <Sparkles className="h-4 w-4" />
                {t("diffAnalyze")}
              </>
            ) : (
              <>
                {t("diffNext")}
                {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default DifferentiationWizard;
