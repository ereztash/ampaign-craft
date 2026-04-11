// ═══════════════════════════════════════════════
// ReflectiveCard — single-action reflective surface
//
// Presentational only. Takes a pre-computed ActionCard and renders
// it in three fixed vertical rows:
//   1) Signal Row  (32px) — colored dot + signal label
//   2) Cause Row   (flexible, max 3 lines) — why text
//   3) Action Row  (64px) — next_step text
//
// No icons beyond the dot. No buttons. No "read more". 200ms fade-in.
// RTL. Total height < 200px.
//
// Empty state: if coherence_score < 0.6, only the Signal Row is shown
// and colored with the watch palette.
// ═══════════════════════════════════════════════

import { useEffect, useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import type { ActionCard, ActionSignal } from "@/engine/optimization/reflectiveAction";

interface ReflectiveCardProps {
  card: ActionCard;
}

const SIGNAL_CLASSES: Record<ActionSignal, { bg: string; border: string; text: string }> = {
  stable: { bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-600/30 dark:border-emerald-400/30", text: "text-emerald-700 dark:text-emerald-300" },
  watch: { bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-600/30 dark:border-amber-400/30", text: "text-amber-700 dark:text-amber-300" },
  act: { bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-700/30 dark:border-red-400/30", text: "text-red-700 dark:text-red-300" },
};

const SIGNAL_LABEL: Record<ActionSignal, { he: string; en: string }> = {
  stable: { he: "יציב", en: "Stable" },
  watch: { he: "עקוב", en: "Watch" },
  act: { he: "פעל", en: "Act" },
};

const ReflectiveCard = ({ card }: ReflectiveCardProps) => {
  const { language } = useLanguage();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 10);
    return () => window.clearTimeout(timer);
  }, []);

  const signal = SIGNAL_CLASSES[card.signal];
  const isEmptyState = card.coherence_score < 0.6;

  return (
    <div
      dir="auto"
      role="status"
      aria-label={`${SIGNAL_LABEL[card.signal][language]}: ${card.headline}`}
      className={`flex flex-col max-w-[520px] mx-auto px-4 py-3 bg-card text-card-foreground border rounded-md transition-opacity duration-200 ease-in ${signal.border} ${mounted ? "opacity-100" : "opacity-0"}`}
    >
      {/* Signal Row — 32px */}
      <div className="h-8 flex items-center gap-2.5 text-sm font-medium leading-tight">
        <span
          aria-hidden="true"
          className={`inline-block w-2.5 h-2.5 rounded-full ${signal.bg}`}
        />
        <span className={signal.text}>{SIGNAL_LABEL[card.signal][language]}</span>
        {!isEmptyState && (
          <span className="text-card-foreground font-semibold">{card.headline}</span>
        )}
      </div>

      {!isEmptyState && (
        <>
          {/* Cause Row — flexible, clamped to 3 lines */}
          <div className="mt-2 text-sm font-normal leading-relaxed line-clamp-3">
            {card.why}
          </div>

          {/* Action Row — 64px */}
          <div className="h-16 mt-2 flex items-center text-[13px] font-medium leading-snug text-card-foreground border-t pt-2">
            {card.next_step}
          </div>
        </>
      )}
    </div>
  );
};

export default ReflectiveCard;
