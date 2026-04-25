// ═══════════════════════════════════════════════
// src/components/intake/IntakePromiseHeader.tsx
//
// Phase-2 surface: shows the promise the user was given at /intake,
// at the top of the relevant module entry. Disappears once the user
// has completed something tangible in this module (i.e. a saved plan
// exists), so returning users don't see it forever.
//
// Pure read on the IntakeSignal. If the signal target doesn't match
// `moduleTarget`, nothing renders — keeps each surface lean.
// ═══════════════════════════════════════════════

import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Clock } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { getIntakeSignal } from "@/engine/intake/intakeSignal";
import type { IntakeRouteTarget } from "@/engine/intake/types";

interface Props {
  moduleTarget: IntakeRouteTarget;
  /** When true, hide the header (e.g., user already has a plan in this module). */
  suppress?: boolean;
}

const IntakePromiseHeader = ({ moduleTarget, suppress }: Props) => {
  const { language } = useLanguage();
  if (suppress) return null;

  const signal = getIntakeSignal();
  if (!signal) return null;
  if (signal.routing.target !== moduleTarget) return null;

  const { headline, kicker, expectedMinutes } = signal.routing.promise;

  return (
    <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent mb-6">
      <CardContent className="p-5 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <div className="text-base font-bold" dir="auto">
            {language === "he" ? headline.he : headline.en}
          </div>
          <div className="text-xs text-muted-foreground" dir="auto">
            {language === "he" ? kicker.he : kicker.en}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
            <Clock className="h-3 w-3" />
            <span>
              {tx(
                { he: `~${expectedMinutes} דקות`, en: `~${expectedMinutes} min` },
                language,
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IntakePromiseHeader;
