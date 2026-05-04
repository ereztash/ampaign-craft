// ═══════════════════════════════════════════════
// ProspectWelcomeScreen — first screen shown after signup.
//
// High confidence (≥0.6): show what we inferred about the business and offer
// a fast-lane entry ("זה נכון? בוא נרוץ →")
//
// Low confidence (<0.6): skip the inference reveal and prompt the user to
// describe their business in their own words — less presumptuous UX.
//
// Rendered by Index.tsx / App shell after a fresh registration is detected.
// ═══════════════════════════════════════════════

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import type { ProspectProfile } from "@/viewmodels";
import { ArrowRight, Sparkles, HelpCircle } from "lucide-react";

interface ProspectWelcomeScreenProps {
  profile: ProspectProfile | null;
  /** Called when the user confirms or skips — moves to the main flow */
  onContinue: () => void;
  /** Called when the user wants to correct the inference ("זה לא נכון") */
  onCorrect?: () => void;
}

const BUSINESS_TYPE_LABEL: Record<string, { he: string; en: string }> = {
  freelancer:    { he: "פרילנסר",    en: "Freelancer"     },
  agency:        { he: "סוכנות",     en: "Agency"         },
  ecommerce:     { he: "חנות אונליין",en: "eCommerce"     },
  saas:          { he: "SaaS",       en: "SaaS"           },
  local_service: { he: "עסק מקומי",  en: "Local service"  },
  b2b_services:  { he: "שירותי B2B", en: "B2B services"   },
  unknown:       { he: "עסק",        en: "Business"       },
};

const FOGG_LEG_COPY: Record<string, { he: string; en: string }> = {
  motivation: {
    he: "נתחיל בהגדרת מטרה אחת ברורה לחודש הקרוב",
    en: "Let's start by defining one clear goal for the next month",
  },
  ability: {
    he: "נמצא 3 פעולות שאפשר לבצע עכשיו — ללא תקציב גדול",
    en: "Let's find 3 actions you can take right now — no big budget needed",
  },
  trigger: {
    he: "כבר יש לך בסיס — נייצר את ה-trigger שיזיז את הגלגל",
    en: "You already have a foundation — let's create the trigger that gets things moving",
  },
};

export default function ProspectWelcomeScreen({
  profile,
  onContinue,
  onCorrect,
}: ProspectWelcomeScreenProps) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const isHe = language === "he";

  const highConfidence = (profile?.confidence ?? 0) >= 0.6;

  const handleContinue = () => {
    setLoading(true);
    onContinue();
  };

  // ─── Low-confidence path ──────────────────────────────────────────────────
  if (!profile || !highConfidence) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="text-3xl">👋</div>
              <h1 className="text-xl font-bold" dir="auto">
                {tx({ he: "ברוך הבא!", en: "Welcome!" }, language)}
              </h1>
              <p className="text-sm text-muted-foreground" dir="auto">
                {tx(
                  {
                    he: "ספר לנו קצת על העסק שלך — כך נוכל להתאים את כל ההמלצות בדיוק לך",
                    en: "Tell us a bit about your business — so we can tailor every recommendation to you",
                  },
                  language,
                )}
              </p>
            </div>
            <Button className="w-full" onClick={handleContinue} disabled={loading}>
              <ArrowRight className={`h-4 w-4 ${isHe ? "me-2 rtl:rotate-180" : "me-2"}`} />
              {tx({ he: "מלא שאלון קצר (2 דקות)", en: "Quick intake (2 min)" }, language)}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── High-confidence path ─────────────────────────────────────────────────
  const bizTypeLabel =
    BUSINESS_TYPE_LABEL[profile.inferredBusinessType ?? "unknown"]?.[language] ??
    BUSINESS_TYPE_LABEL.unknown[language];

  const legCopy = FOGG_LEG_COPY[profile.weakestLeg]?.[language];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-medium uppercase tracking-wide">
              {tx({ he: "נמצאנו כמה תובנות", en: "We found some insights" }, language)}
            </span>
          </div>

          <div className="space-y-3">
            <p className="text-lg font-semibold" dir="auto">
              {profile.firstScreenMessage[language]}
            </p>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{bizTypeLabel}</Badge>
              {profile.inferredIndustry && (
                <Badge variant="outline">{profile.inferredIndustry}</Badge>
              )}
            </div>

            {legCopy && (
              <p className="text-sm text-muted-foreground border-s-2 border-primary/30 ps-3" dir="auto">
                {legCopy}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Button className="w-full" onClick={handleContinue} disabled={loading}>
              <ArrowRight className={`h-4 w-4 ${isHe ? "rtl:rotate-180 me-2" : "me-2"}`} />
              {tx({ he: "נכון — בוא נרוץ", en: "That's right — let's go" }, language)}
            </Button>
            {onCorrect && (
              <Button variant="ghost" size="sm" className="w-full gap-1.5" onClick={onCorrect}>
                <HelpCircle className="h-3.5 w-3.5" />
                {tx({ he: "לא מדויק — אתקן", en: "Not quite — let me correct it" }, language)}
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground" dir="auto">
            {tx(
              {
                he: `ביטחון ההסקה: ${Math.round(profile.confidence * 100)}%`,
                en: `Inference confidence: ${Math.round(profile.confidence * 100)}%`,
              },
              language,
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
