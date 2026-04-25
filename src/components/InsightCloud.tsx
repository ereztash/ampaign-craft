import { motion, AnimatePresence } from "framer-motion";
import { Brain } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { AgentInsight } from "@/engine/blackboard/partialRunner";

interface InsightCloudProps {
  insights: AgentInsight[];
}

const InsightCloud = ({ insights }: InsightCloudProps) => {
  const { language, isRTL } = useLanguage();
  const reducedMotion = useReducedMotion();
  const isHe = language === "he";

  if (insights.length === 0) return null;

  const visible = insights.slice(-3);
  const side = isRTL ? "left-4" : "right-4";

  if (reducedMotion) {
    return (
      <div className={`fixed bottom-6 ${side} z-40 w-64 pointer-events-none`} aria-live="polite">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit mb-2">
          <Brain className="h-3 w-3 text-primary" aria-hidden="true" />
          <span className="text-xs text-primary font-medium">
            {isHe ? "תובנות חיות" : "Live insights"}
          </span>
        </div>
        {visible.map((insight) => (
          <div
            key={insight.agentKey}
            className="mb-2 rounded-xl border border-primary/20 bg-background/95 shadow-lg px-3 py-2"
            dir="auto"
          >
            <p className="text-xs text-muted-foreground mb-0.5">
              {isHe ? insight.labelHe : insight.labelEn}
            </p>
            <p className="text-sm font-medium text-foreground">
              {isHe ? insight.insightHe : insight.insightEn}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`fixed bottom-6 ${side} z-40 w-64 pointer-events-none`} aria-live="polite">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit mb-2"
      >
        <Brain className="h-3 w-3 text-primary" aria-hidden="true" />
        <span className="text-xs text-primary font-medium">
          {isHe ? "תובנות חיות" : "Live insights"}
        </span>
      </motion.div>

      <AnimatePresence mode="popLayout">
        {visible.map((insight) => (
          <motion.div
            key={insight.agentKey}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="mb-2 rounded-xl border border-primary/20 bg-background/95 backdrop-blur-sm shadow-lg px-3 py-2"
            dir="auto"
          >
            <p className="text-xs text-muted-foreground mb-0.5">
              {isHe ? insight.labelHe : insight.labelEn}
            </p>
            <p className="text-sm font-medium text-foreground">
              {isHe ? insight.insightHe : insight.insightEn}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default InsightCloud;
