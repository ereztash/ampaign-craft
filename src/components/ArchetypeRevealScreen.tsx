// ArchetypeRevealScreen — IKEA-effect transparency layer
//
// Shown exactly once (when revealSeen === false) for users at
// confidenceTier "confident" or "strong". Also reachable at any time
// from Profile and the AppSidebar personalisation toggle.
//
// Behavioural science grounding:
//   • IKEA Effect (Norton, Mochon & Ariely 2011): users who co-author
//     the adaptation value it more and trust it as personalisation rather
//     than surveillance.
//   • Self-verification (Swann 1983): accurate reflection of tendencies —
//     including weaknesses — raises perceived system competence.
//   • Barnum-effect mitigation: every claim is falsifiable, product-scoped,
//     and framed as "users with your answer set" not "you are …".

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useArchetype } from "@/contexts/ArchetypeContext";
import { getBlindSpotProfile } from "@/lib/archetypeBlindSpots";
import { emitArchetypeEvent } from "@/lib/archetypeAnalytics";
import type { RevealSource } from "@/lib/archetypeAnalytics";
import { Analytics } from "@/lib/analytics";
import { useAuth } from "@/contexts/AuthContext";
import { tx } from "@/i18n/tx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, Sparkles, AlertTriangle } from "lucide-react";

// Archetype emoji icons — same set used by AdminArchetypeDebugPanel
const ARCHETYPE_ICONS: Record<string, string> = {
  strategist: "🧠",
  optimizer:  "📊",
  pioneer:    "🚀",
  connector:  "🤝",
  closer:     "⚡",
};

interface ArchetypeRevealScreenProps {
  /** Where the user navigated from — used in analytics. Defaults to "auto". */
  source?: RevealSource;
}

export default function ArchetypeRevealScreen({ source = "auto" }: ArchetypeRevealScreenProps) {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    effectiveArchetypeId,
    confidenceTier,
    uiConfig,
    markRevealSeen,
    setAdaptationsEnabled,
    adaptationsEnabled,
  } = useArchetype();

  const blindSpots = getBlindSpotProfile(effectiveArchetypeId);
  const icon = ARCHETYPE_ICONS[effectiveArchetypeId] ?? "✦";

  // Mark reveal as seen + emit analytics on first mount only.
  // The reveal is a one-shot UI event tied to component lifecycle, not a
  // reactive subscription to archetype/confidence changes.
  useEffect(() => {
    markRevealSeen();
    emitArchetypeEvent("archetype_revealed", {
      archetypeId: effectiveArchetypeId,
      tier: confidenceTier,
      source,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAccept = () => {
    setAdaptationsEnabled(true);
    emitArchetypeEvent("archetype_opted_in", {
      archetypeId: effectiveArchetypeId,
      tier: confidenceTier,
      source,
    });
    // AARRR activation event: opt-in, not just view, is the moment the
    // personalisation contract is formed. The passive mount-time
    // archetype_revealed is in archetypeAnalytics; this one feeds the
    // AARRR funnel.
    if (user?.id) Analytics.archetypeRevealed(user.id, effectiveArchetypeId);
    navigate(-1);
  };

  const handleDecline = () => {
    setAdaptationsEnabled(false);
    emitArchetypeEvent("archetype_opted_out", {
      archetypeId: effectiveArchetypeId,
      tier: confidenceTier,
      source,
    });
    navigate(-1);
  };

  const handleDisable = () => {
    setAdaptationsEnabled(false);
    emitArchetypeEvent("archetype_opted_out", {
      archetypeId: effectiveArchetypeId,
      tier: confidenceTier,
      source,
    });
    navigate(-1);
  };

  const ChevronIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <main
      className="min-h-screen flex items-start justify-center bg-background p-4 sm:p-8"
      aria-labelledby="reveal-heading"
    >
      <article className="w-full max-w-xl space-y-8 py-8" dir={isRTL ? "rtl" : "ltr"}>

        {/* ── Header ─────────────────────────────────── */}
        <header className="space-y-3 text-center">
          <div className="text-5xl" aria-hidden="true">{icon}</div>
          <h1 id="reveal-heading" className="text-2xl font-bold text-foreground">
            {tx({ he: "הארכיטיפ שלך", en: "Your Business Archetype" }, language)}
          </h1>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secondary" className="text-base px-4 py-1.5">
              {uiConfig.label[language]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {confidenceTier === "strong"
                ? tx({ he: "ביטחון גבוה", en: "High confidence" }, language)
                : tx({ he: "ביטחון בינוני", en: "Moderate confidence" }, language)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto" dir="auto">
            {tx(
              {
                he: "זיהינו את הדפוסים בתשובות שלך. זה לא אבחון אישיות. זה תיאור של נטיות שימוש בכלים כמו FunnelForge בקרב אנשים עם פרופיל דומה לשלך.",
                en: "We identified patterns in your answers. This is not a personality diagnosis. It describes usage tendencies in tools like FunnelForge among people with a profile similar to yours.",
              },
              language,
            )}
          </p>
        </header>

        <Separator />

        {/* ── Strength ───────────────────────────────── */}
        <section aria-labelledby="strength-heading" className="space-y-2">
          <h2
            id="strength-heading"
            className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {tx({ he: "הכוח שלך בהקשר זה", en: "Your strength in this context" }, language)}
          </h2>
          <p className="text-sm text-foreground leading-relaxed" dir="auto">
            {blindSpots.strength[language]}
          </p>
        </section>

        {/* ── Blind spot ─────────────────────────────── */}
        <section aria-labelledby="blindspot-heading" className="space-y-2">
          <h2
            id="blindspot-heading"
            className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide"
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {tx({ he: "נקודה לשים אליה לב", en: "A pattern worth knowing" }, language)}
          </h2>
          <p className="text-sm text-foreground leading-relaxed" dir="auto">
            {blindSpots.blindSpot[language]}
          </p>
        </section>

        <Separator />

        {/* ── What adapts ────────────────────────────── */}
        <section aria-labelledby="what-adapts-heading" className="space-y-3">
          <h2
            id="what-adapts-heading"
            className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wide"
          >
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            {tx({ he: "מה משתנה אם תאשר", en: "What changes if you accept" }, language)}
          </h2>
          <ul className="space-y-1.5 text-sm text-muted-foreground list-none">
            {[
              tx({ he: "סדר הניווט: מוצגות הכלים שהכי רלוונטיים עבורך קודם", en: "Navigation order: the most relevant tools for you appear first" }, language),
              tx({ he: "גווני צבע: פלטה שמתאימה לסגנון העבודה שלך", en: "Colour palette: a palette matched to your work style" }, language),
              tx({ he: "עוצמת אנימציות: מותאמת לקצב שלך", en: "Animation intensity: matched to your pace" }, language),
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <ChevronIcon className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" aria-hidden="true" />
                <span dir="auto">{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground" dir="auto">
            {tx(
              {
                he: "אפשר לבטל בכל עת מהפרופיל שלך. ההתאמה לא מסתירה שום פיצ'ר.",
                en: "You can turn this off at any time from your profile. The adaptation never hides any feature.",
              },
              language,
            )}
          </p>
        </section>

        {/* ── Actions ────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {adaptationsEnabled ? (
            <>
              <Button
                variant="destructive"
                onClick={handleDisable}
                className="flex-1"
              >
                <XCircle className="h-4 w-4" aria-hidden="true" />
                {tx({ he: "כבה התאמות", en: "Turn off adaptations" }, language)}
              </Button>
              <Button variant="outline" onClick={() => navigate(-1)} className="flex-1">
                {tx({ he: "חזור", en: "Go back" }, language)}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleAccept} className="flex-1 gap-2">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {tx({ he: "התאם את הסביבה שלי", en: "Adapt my workspace" }, language)}
              </Button>
              <Button variant="outline" onClick={handleDecline} className="flex-1">
                {tx({ he: "שמור על ברירת המחדל", en: "Keep the default experience" }, language)}
              </Button>
            </>
          )}
        </div>

      </article>
    </main>
  );
}
