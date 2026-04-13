// ═══════════════════════════════════════════════
// ArchetypePipelineGuide — Friction-reasoned pipeline card
// Shows the user their recommended work sequence, ordered by
// their archetype's psychological friction sources.
//
// Only renders when confidenceTier !== "none".
// Each step shows the frictionReason so every adaptation is traceable.
// ═══════════════════════════════════════════════

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { useArchetype } from "@/contexts/ArchetypeContext";
import { useArchetypePipeline } from "@/hooks/useArchetypePipeline";
import { deriveHeuristicSet } from "@/engine/behavioralHeuristicEngine";
import { getPrimaryCtaVerbs } from "@/engine/behavioralHeuristicEngine";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, Circle, ChevronDown, ArrowRight } from "lucide-react";

export default function ArchetypePipelineGuide() {
  const { language } = useLanguage();
  const isHe = language === "he";
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const { effectiveArchetypeId, uiConfig } = useArchetype();
  const { steps, currentStepIndex, completedCount, isActive } = useArchetypePipeline();
  const [whyOpen, setWhyOpen] = useState(false);

  if (!isActive) return null;

  const heuristics = deriveHeuristicSet(effectiveArchetypeId);
  const ctaVerbs = getPrimaryCtaVerbs(effectiveArchetypeId);
  const { coreMotivation } = uiConfig.personalityProfile;
  const nextStep = steps[currentStepIndex] ?? null;

  const mp = reducedMotion
    ? {}
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

  return (
    <motion.div {...mp}>
      <Card className="border-primary/30 bg-gradient-to-b from-primary/4 to-transparent">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between" dir="auto">
            <span>{isHe ? "הנתיב המומלץ שלך" : "Your recommended path"}</span>
            {completedCount > 0 && (
              <Badge variant="secondary" className="text-xs font-normal">
                {completedCount}/{steps.length} {isHe ? "הושלמו" : "done"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="px-4 pb-4 space-y-1">
          {steps.map((step, i) => {
            const isCurrent = i === currentStepIndex;
            const isDone = step.completed;
            const isPast = i < currentStepIndex && isDone;

            return (
              <div
                key={step.routePath}
                className={`flex items-start gap-2.5 py-2 rounded-lg transition-colors ${
                  isCurrent ? "bg-primary/8 px-2 -mx-2" : ""
                } ${!isCurrent && !isPast ? "opacity-50" : ""}`}
              >
                {/* Step icon */}
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className={`h-4 w-4 ${isCurrent ? "text-primary" : "text-muted-foreground/40"}`} />
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium leading-tight ${
                      isCurrent ? "text-foreground" : isDone ? "text-muted-foreground line-through" : "text-muted-foreground"
                    }`}
                    dir="auto"
                  >
                    {step.label[language]}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug" dir="auto">
                      {step.frictionReason[language]}
                    </p>
                  )}
                </div>

                {/* CTA for current step */}
                {isCurrent && (
                  <Button
                    size="sm"
                    className="shrink-0 h-7 text-xs gap-1"
                    onClick={() => navigate(step.routePath)}
                  >
                    {ctaVerbs[language]}
                    <ArrowRight className="h-3 w-3 rtl:rotate-180" aria-hidden="true" />
                  </Button>
                )}
              </div>
            );
          })}

          {/* Progress bar */}
          {completedCount > 0 && (
            <div className="mt-3 h-1 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.round((completedCount / steps.length) * 100)}%` }}
              />
            </div>
          )}

          {/* "Why this order?" collapsible */}
          <Collapsible open={whyOpen} onOpenChange={setWhyOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2 pt-2 border-t border-border/40 w-full">
                <ChevronDown className={`h-3.5 w-3.5 transition-transform shrink-0 ${whyOpen ? "rotate-180" : ""}`} />
                <span dir="auto">{isHe ? "למה הסדר הזה?" : "Why this order?"}</span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2">
                <p className="text-xs text-muted-foreground italic" dir="auto">
                  {coreMotivation}
                </p>
                <div className="flex flex-wrap gap-1">
                  {heuristics.map((h) => (
                    <Badge
                      key={h.id}
                      variant="outline"
                      className="text-xs py-0 px-1.5"
                      title={h.source}
                    >
                      {h.id}: {h.principle}
                    </Badge>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </motion.div>
  );
}
