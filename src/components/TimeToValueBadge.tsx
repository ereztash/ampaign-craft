// TimeToValueBadge — Wedge 5.
// Shows a one-time celebratory banner when a user goes from intake
// completion to first plan saved within the promised window. Uses
// existing feedbackLoop telemetry, no new collection.

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { tx } from "@/i18n/tx";
import { verifyPromise } from "@/engine/intake/feedbackLoop";
import { safeStorage } from "@/lib/safeStorage";
import {
  captureRecommendationShown,
  captureOutcome,
} from "@/engine/outcomeLoopEngine";

const SEEN_KEY = "funnelforge-ttv-badge-seen";
const QUICK_THRESHOLD_MIN = 10;

export function TimeToValueBadge() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [recommendationId, setRecommendationId] = useState<string | null>(null);
  const shownRef = useRef(false);

  const verification = useMemo(() => verifyPromise(), []);
  const seen = useMemo(() => safeStorage.getString(SEEN_KEY, "") === "1", []);

  const shouldShow =
    !dismissed &&
    !seen &&
    verification !== null &&
    verification.actualMinutes !== null &&
    verification.actualMinutes >= 0 &&
    verification.actualMinutes <= QUICK_THRESHOLD_MIN;

  useEffect(() => {
    if (!shouldShow || shownRef.current) return;
    shownRef.current = true;
    const id = captureRecommendationShown({
      user_id: user?.id ?? null,
      archetype_id: "unknown",
      confidence_tier: "tentative",
      source: "ttv_badge",
      action_id: "time_to_value_celebration",
      action_label_en: "Time-to-value celebration banner",
      context_snapshot: {
        actual_minutes: verification?.actualMinutes ?? null,
        expected_minutes: verification?.expectedMinutes ?? null,
        promise_held: verification?.promiseHeld ?? null,
      },
    });
    setRecommendationId(id);
  }, [shouldShow, user?.id, verification]);

  if (!shouldShow || !verification || verification.actualMinutes === null) return null;

  const minutes = verification.actualMinutes;

  const handleDismiss = () => {
    safeStorage.setString(SEEN_KEY, "1");
    if (recommendationId) {
      captureOutcome(recommendationId, user?.id ?? null, "dismissed", 7, 0);
    }
    setDismissed(true);
  };

  const handleAcknowledge = () => {
    safeStorage.setString(SEEN_KEY, "1");
    if (recommendationId) {
      captureOutcome(recommendationId, user?.id ?? null, "navigated", 7, minutes);
    }
    setDismissed(true);
  };

  return (
    <Card className="border-emerald-300 bg-gradient-to-br from-emerald-50 to-transparent dark:from-emerald-900/30">
      <CardContent className="p-3 flex items-start gap-2">
        <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-semibold" dir="auto">
            {tx(
              {
                he: `עברת מ-0 לתוכנית ראשונה ב-${minutes} דקות`,
                en: `Zero to first plan in ${minutes} minutes`,
              },
              language,
            )}
          </p>
          <p className="text-xs text-muted-foreground" dir="auto">
            {tx(
              {
                he: "זה מהיר. המערכת מחזיקה את ההבטחה.",
                en: "That's fast. The system kept its promise.",
              },
              language,
            )}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAcknowledge}
            className="h-7 text-xs gap-1 mt-1"
          >
            {tx({ he: "המשך", en: "Got it" }, language)}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <X className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
}
