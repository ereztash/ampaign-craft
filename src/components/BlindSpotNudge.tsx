// BlindSpotNudge — context-aware dwell-time reminder
//
// Fires when the user has been on a single module for longer than the
// archetype's dwellThresholdDays without hitting the completion key.
// Rate-limited: once per 72 hours per module per user (plan §6 Phase B).
//
// Accessibility:
//   • role="status" aria-live="polite" — non-intrusive announcement
//   • Escape key + explicit close button for keyboard users
//   • Never blocks primary CTAs; positioned as a persistent banner
//   • Respects prefers-reduced-motion via MotionConfig in AppShell

import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useArchetype } from "@/contexts/ArchetypeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useModuleDwell, setDismissRecord } from "@/hooks/useModuleDwell";
import { emitArchetypeEvent } from "@/lib/archetypeAnalytics";
import { tx } from "@/i18n/tx";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, ArrowRight, ArrowLeft } from "lucide-react";

export function BlindSpotNudge() {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { effectiveArchetypeId, confidenceTier } = useArchetype();
  const { moduleId, daysSinceFirstVisit, blindSpotEntry, shouldNudge } = useModuleDwell();

  const userId = user?.id ?? "anonymous";

  // Emit analytics when the nudge first becomes visible
  useEffect(() => {
    if (!shouldNudge || !moduleId || !blindSpotEntry) return;
    emitArchetypeEvent("blindspot_nudge_shown", {
      archetypeId: effectiveArchetypeId,
      tier: confidenceTier,
      moduleId,
      dwellDays: daysSinceFirstVisit,
    });
  // Only fire on initial shouldNudge=true transition, not on every re-render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldNudge, moduleId]);

  const dismiss = useCallback((reason: "x" | "cta_followed") => {
    if (!moduleId) return;
    setDismissRecord(userId, moduleId);
    emitArchetypeEvent("blindspot_nudge_dismissed", {
      archetypeId: effectiveArchetypeId,
      tier: confidenceTier,
      moduleId,
      dismissReason: reason,
    });
  }, [userId, moduleId, effectiveArchetypeId, confidenceTier]);

  const handleClose = useCallback(() => dismiss("x"), [dismiss]);

  const handleCTA = useCallback(() => {
    if (!blindSpotEntry) return;
    dismiss("cta_followed");
    navigate(blindSpotEntry.suggestedNextRoutePath);
  }, [blindSpotEntry, dismiss, navigate]);

  // Keyboard: Escape dismisses
  useEffect(() => {
    if (!shouldNudge) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [shouldNudge, handleClose]);

  if (!shouldNudge || !blindSpotEntry) return null;

  const ChevronIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <aside
      aria-label={tx({ he: "תזכורת ארכיטיפ", en: "Archetype reminder" }, language)}
      className="fixed bottom-20 md:bottom-4 start-4 end-4 md:start-auto md:end-4 md:max-w-sm z-50"
    >
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 shadow-lg p-4 space-y-3"
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle
              className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              {tx({ he: "נקודה לשים אליה לב", en: "A pattern worth knowing" }, language)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label={tx({ he: "סגור תזכורת", en: "Close reminder" }, language)}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 shrink-0 rounded focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Nudge message */}
        <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed" dir="auto">
          {blindSpotEntry.nudge[language]}
        </p>

        {/* CTA */}
        <Button
          size="sm"
          variant="outline"
          onClick={handleCTA}
          className="w-full gap-1.5 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900"
        >
          {tx({ he: "עבור ל", en: "Go to" }, language)} {blindSpotEntry.suggestedNextModule}
          <ChevronIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </aside>
  );
}
