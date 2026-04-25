// ═══════════════════════════════════════════════
// src/components/intake/IntakeReframeBanner.tsx
//
// Phase-3 surface (gated): when the system observes that the user's
// behavior contradicts their stated intake, offer a non-pushy reframe.
//
// Activation gates (all must be true):
//   1. VITE_INTAKE_FEEDBACK_ENABLED === "true"
//   2. detectBehaviorMismatch() returns mismatched: true
//   3. The user hasn't dismissed the banner this session
//
// We deliberately don't auto-redirect — the user keeps agency.
// ═══════════════════════════════════════════════

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, RefreshCw } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { detectBehaviorMismatch } from "@/engine/intake/feedbackLoop";

const IntakeReframeBanner = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  const flagOn = import.meta.env.VITE_INTAKE_FEEDBACK_ENABLED === "true";
  const mismatch = useMemo(
    () => (flagOn ? detectBehaviorMismatch() : null),
    [flagOn],
  );

  if (!flagOn) return null;
  if (dismissed) return null;
  if (!mismatch || !mismatch.mismatched) return null;

  return (
    <Card className="border-amber-400/50 bg-amber-50/50 dark:bg-amber-900/10 mb-4">
      <CardContent className="p-4 flex items-start gap-3">
        <RefreshCw className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium" dir="auto">
            {tx(
              {
                he: "שמנו לב שאתה מבלה יותר זמן באזור אחר ממה שכיוונו אותך אליו. אולי הצורך השתנה?",
                en: "We noticed you're spending more time in a different area than where we routed you. Maybe the need shifted?",
              },
              language,
            )}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/intake")}
              data-testid="intake-reframe-retake"
            >
              {tx({ he: "שאלות מחדש (30 שניות)", en: "Re-take (30 seconds)" }, language)}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
              data-testid="intake-reframe-dismiss"
              aria-label={tx({ he: "סגור", en: "Dismiss" }, language)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IntakeReframeBanner;
