import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { NeuroStorytellingData } from "@/types/funnel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface NeuroStorytellingTabProps {
  data: NeuroStorytellingData;
}

const NeuroStorytellingTab = ({ data }: NeuroStorytellingTabProps) => {
  const { t, language } = useLanguage();
  const reducedMotion = useReducedMotion();
  const [selectedStage, setSelectedStage] = useState(0);
  const { vectors, promptTemplates, entropyGuide, axiom } = data;

  const vectorColorMap: Record<string, string> = {
    cortisol: "bg-destructive/10 text-destructive border-destructive/20",
    oxytocin: "bg-primary/10 text-primary border-primary/20",
    dopamine: "bg-accent/20 text-accent-foreground border-accent/30",
  };

  const vectorBadgeMap: Record<string, string> = {
    cortisol: "bg-destructive text-destructive-foreground",
    oxytocin: "bg-primary text-primary-foreground",
    dopamine: "bg-accent text-accent-foreground",
  };

  return (
    <div className="space-y-6">
      {/* The Axiom */}
      <motion.div initial={reducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl" role="img" aria-hidden="true">⚛️</span>
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                  {t("neuroAxiom")}
                </div>
                <p className="text-sm leading-relaxed text-foreground italic">
                  {axiom[language]}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* The 3 Vectors */}
      <div>
        <h3 className="mb-4 text-lg font-bold text-foreground">{t("neuroVectors")}</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {vectors.map((vector, i) => (
            <motion.div
              key={vector.id}
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reducedMotion ? { duration: 0 } : { delay: i * 0.1 }}
            >
              <Card className={`h-full border ${vectorColorMap[vector.id]}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{vector.emoji}</span>
                    <CardTitle className="text-base">{vector.name[language]}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="mb-1 text-xs font-semibold text-muted-foreground">
                      {t("neuroBioFunction")}
                    </div>
                    <p className="text-xs leading-relaxed text-foreground">
                      {vector.biologicalFunction[language]}
                    </p>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-muted-foreground">
                      {t("neuroCopyApp")}
                    </div>
                    <p className="text-xs leading-relaxed text-foreground">
                      {vector.copyApplication[language]}
                    </p>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-muted-foreground">
                      {t("neuroTips")}
                    </div>
                    <ul className="space-y-1">
                      {vector.intensityTips.map((tip, j) => (
                        <li key={j} className="text-xs text-muted-foreground">
                          • {tip[language]}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Neuro-Prompt Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span role="img" aria-hidden="true">🧬</span> {t("neuroPromptGenerator")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("neuroPromptDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stage selector */}
          <div className="flex flex-wrap gap-2">
            {promptTemplates.map((pt, i) => (
              <button
                key={pt.stage}
                onClick={() => setSelectedStage(i)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                  selectedStage === i
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {pt.stageName[language]}
              </button>
            ))}
          </div>

          {/* Selected template */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedStage}
              initial={reducedMotion ? false : { opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, x: -10 }}
              className="rounded-xl border bg-muted/30 p-5"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {promptTemplates[selectedStage].stageName[language]}
                </span>
                {promptTemplates[selectedStage].vectors.map((v) => {
                  const vec = vectors.find((vec) => vec.id === v);
                  return (
                    <Badge key={v} className={`text-xs ${vectorBadgeMap[v]}`}>
                      {vec?.emoji} {vec?.name[language]}
                    </Badge>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mb-2">
                <div />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(promptTemplates[selectedStage].template[language]);
                    toast.success(t("templateCopied"));
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {t("copyTemplate")}
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground font-mono">
                {promptTemplates[selectedStage].template[language]}
              </pre>
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Entropy Balance Meter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span role="img" aria-hidden="true">⚖️</span> {t("neuroEntropy")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {entropyGuide.definition[language]}
          </p>

          {/* Visual meter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("neuroCollapse")}</span>
              <span className="font-semibold text-primary">{t("neuroSweetSpot")}</span>
              <span>{t("neuroOverload")}</span>
            </div>
            <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted">
              <div className="absolute inset-y-0 left-[30%] right-[30%] rounded-full bg-primary/30" />
              <div className="absolute inset-y-0 left-[40%] right-[40%] rounded-full bg-primary/60" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Overload signs */}
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <div className="mb-2 text-xs font-bold text-destructive">
                🔴 {t("neuroOverloadSigns")}
              </div>
              <ul className="space-y-1.5">
                {entropyGuide.overloadSigns.map((sign, i) => (
                  <li key={i} className="text-xs text-foreground">• {sign[language]}</li>
                ))}
              </ul>
            </div>

            {/* Collapse signs */}
            <div className="rounded-xl border border-muted bg-muted/30 p-4">
              <div className="mb-2 text-xs font-bold text-muted-foreground">
                ⚪ {t("neuroCollapseSigns")}
              </div>
              <ul className="space-y-1.5">
                {entropyGuide.collapseSigns.map((sign, i) => (
                  <li key={i} className="text-xs text-foreground">• {sign[language]}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Balance tips */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="mb-2 text-xs font-bold text-primary">
              ✅ {t("neuroBalanceTips")}
            </div>
            <ul className="space-y-1.5">
              {entropyGuide.balanceTips.map((tip, i) => (
                <li key={i} className="text-xs text-foreground">• {tip[language]}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NeuroStorytellingTab;
