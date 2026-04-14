import { useEffect, useRef } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import type { BehavioralNudge } from "@/engine/behavioralActionEngine";
import { useArchetypeCopyTone } from "@/hooks/useArchetypeCopyTone";
import { useAuth } from "@/contexts/AuthContext";
import { useArchetype } from "@/contexts/ArchetypeContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { AlertTriangle, TrendingUp, Users, Clock, Trophy, Zap, Heart } from "lucide-react";
import {
  captureRecommendationShown,
  captureVariantPick,
  captureOutcome,
} from "@/engine/outcomeLoopEngine";

const NUDGE_CONFIG: Record<string, { icon: typeof AlertTriangle; accent: string }> = {
  loss_aversion:    { icon: AlertTriangle, accent: "border-destructive/30 bg-destructive/5 dark:bg-destructive/10" },
  goal_gradient:    { icon: TrendingUp,   accent: "border-primary/30 bg-primary/5 dark:bg-primary/10" },
  social_proof:     { icon: Users,        accent: "border-blue-500/30 bg-blue-50 dark:bg-blue-900/20" },
  investment_sunk:  { icon: Clock,        accent: "border-amber-500/30 bg-amber-50 dark:bg-amber-900/20" },
  achievement_near: { icon: Trophy,       accent: "border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/20" },
  urgency_temporal: { icon: Zap,          accent: "border-orange-500/30 bg-orange-50 dark:bg-orange-900/20" },
  cor_recovery:     { icon: Heart,        accent: "border-violet-500/30 bg-violet-50 dark:bg-violet-900/20" },
};

interface NudgeBannerProps {
  nudge: BehavioralNudge | null;
  onDismiss?: () => void;
}

// Tone → border-start accent class (H3: Regulatory Fit)
const TONE_BORDER: Record<string, string> = {
  urgency:       "border-s-4 border-s-red-500",
  relational:    "border-s-4 border-s-green-500",
  analytical:    "border-s-4 border-s-blue-700",
  inspirational: "border-s-4 border-s-purple-500",
  direct:        "",
};

export function NudgeBanner({ nudge, onDismiss }: NudgeBannerProps) {
  const { language } = useLanguage();
  const reducedMotion = useReducedMotion();
  const navigate = useNavigate();
  const tone = useArchetypeCopyTone();
  const { user } = useAuth();
  const { effectiveArchetypeId, confidenceTier } = useArchetype();
  const recIdRef = useRef<string | null>(null);

  // Capture recommendation shown once when nudge mounts
  useEffect(() => {
    if (!nudge) return;
    recIdRef.current = captureRecommendationShown({
      user_id: user?.id ?? null,
      archetype_id: effectiveArchetypeId,
      confidence_tier: confidenceTier,
      source: "nudge_banner",
      action_id: nudge.type,
      action_label_en: nudge.type,
      context_snapshot: { route: nudge.route ?? null, has_cta: !!nudge.cta },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nudge?.type]);

  if (!nudge) return null;

  const config = NUDGE_CONFIG[nudge.type] || NUDGE_CONFIG.social_proof;
  const Icon = config.icon;
  const toneBorder = tone ? (TONE_BORDER[tone] ?? "") : "";
  const recId = () => recIdRef.current ?? nudge.type;

  const handleCta = () => {
    captureVariantPick(recId(), "primary", 0, user?.id ?? null);
    captureOutcome(recId(), user?.id ?? null, "navigated");
    navigate(nudge.route!);
  };

  const handleDismiss = () => {
    captureVariantPick(recId(), "skip", 0, user?.id ?? null);
    captureOutcome(recId(), user?.id ?? null, "dismissed");
    onDismiss?.();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.3 }}
        className={`rounded-xl border p-3 mb-4 ${config.accent} ${toneBorder}`}
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
              onClick={handleCta}
            >
              {nudge.cta[language]}
            </Button>
          )}
          {onDismiss && (
            <button
              onClick={handleDismiss}
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
