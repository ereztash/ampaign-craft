import { useLanguage } from "@/i18n/LanguageContext";
import type { BehavioralNudge } from "@/engine/behavioralActionEngine";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { AlertTriangle, TrendingUp, Users, Clock, Trophy, Zap, Heart } from "lucide-react";

const NUDGE_CONFIG: Record<string, { icon: typeof AlertTriangle; accent: string }> = {
  loss_aversion: { icon: AlertTriangle, accent: "border-destructive/30 bg-destructive/5 dark:bg-destructive/10" },
  goal_gradient: { icon: TrendingUp, accent: "border-primary/30 bg-primary/5 dark:bg-primary/10" },
  social_proof: { icon: Users, accent: "border-blue-500/30 bg-blue-50 dark:bg-blue-900/20" },
  investment_sunk: { icon: Clock, accent: "border-amber-500/30 bg-amber-50 dark:bg-amber-900/20" },
  achievement_near: { icon: Trophy, accent: "border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/20" },
  urgency_temporal: { icon: Zap, accent: "border-orange-500/30 bg-orange-50 dark:bg-orange-900/20" },
  cor_recovery: { icon: Heart, accent: "border-violet-500/30 bg-violet-50 dark:bg-violet-900/20" },
};

interface NudgeBannerProps {
  nudge: BehavioralNudge | null;
  onDismiss?: () => void;
}

export function NudgeBanner({ nudge, onDismiss }: NudgeBannerProps) {
  const { language } = useLanguage();
  const reducedMotion = useReducedMotion();
  const navigate = useNavigate();

  if (!nudge) return null;

  const config = NUDGE_CONFIG[nudge.type] || NUDGE_CONFIG.social_proof;
  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.3 }}
        className={`rounded-xl border p-3 mb-4 ${config.accent}`}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-4 w-4 shrink-0 text-foreground/70" />
          <p className="text-sm text-foreground flex-1" dir="auto">
            {nudge.message[language]}
          </p>
          {nudge.cta && nudge.route && (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 text-xs"
              onClick={() => navigate(nudge.route!)}
            >
              {nudge.cta[language]}
            </Button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-muted-foreground hover:text-foreground text-xs px-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={language === "he" ? "סגור" : "Dismiss"}
            >
              ✕
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
