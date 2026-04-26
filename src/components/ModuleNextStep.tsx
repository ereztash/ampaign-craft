// ═══════════════════════════════════════════════
// ModuleNextStep — Guided transition banner between modules
//
// Renders at the bottom of each module page (1-5).
// Shows the 5-step pipeline progress, describes
// what the next module unlocks, and provides a CTA.
// Module 5 shows a completion celebration instead.
// ═══════════════════════════════════════════════

import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { tx } from "@/i18n/tx";
import {
  Crosshair,
  BarChart3,
  TrendingUp,
  DollarSign,
  Heart,
  ArrowLeft,
  ArrowRight,
  Trophy,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

// ─── Module metadata ──────────────────────────────────────────────────────────

interface ModuleMeta {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  label: { he: string; en: string };
  tagline: { he: string; en: string };
  route: string;
}

const MODULES: Record<number, ModuleMeta> = {
  1: {
    icon: Crosshair,
    color: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-amber-300/60 dark:border-amber-600/40",
    label: { he: "בידול", en: "Differentiation" },
    tagline: { he: "גלה את הייחודיות שלך", en: "Discover your unique positioning" },
    route: "/differentiate",
  },
  2: {
    icon: BarChart3,
    color: "text-primary",
    bgColor: "bg-primary/5",
    borderColor: "border-primary/30",
    label: { he: "שיווק", en: "Marketing" },
    tagline: { he: "בנה תוכנית שיווק מלאה", en: "Build a full marketing plan" },
    route: "/wizard",
  },
  3: {
    icon: TrendingUp,
    color: "text-accent",
    bgColor: "bg-accent/5",
    borderColor: "border-accent/30",
    label: { he: "מכירות", en: "Sales" },
    tagline: { he: "סקריפטים ופרופיל DISC מותאמים", en: "DISC-personalized sales scripts" },
    route: "/sales",
  },
  4: {
    icon: DollarSign,
    color: "text-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    borderColor: "border-emerald-300/60 dark:border-emerald-600/40",
    label: { he: "תמחור", en: "Pricing" },
    tagline: { he: "מבנה מחירים ומודל רווח", en: "Tier structure and profit model" },
    route: "/pricing",
  },
  5: {
    icon: Heart,
    color: "text-pink-500",
    bgColor: "bg-pink-50 dark:bg-pink-900/20",
    borderColor: "border-pink-300/60 dark:border-pink-600/40",
    label: { he: "שימור", en: "Retention" },
    tagline: { he: "הפוך לקוחות לשגרירים", en: "Turn customers into advocates" },
    route: "/retention",
  },
};

// Next-step copy for each transition
const NEXT_COPY: Record<
  number,
  {
    heading: { he: string; en: string };
    body: { he: string; en: string };
    cta: { he: string; en: string };
  }
> = {
  // After module 1 → going to 2
  1: {
    heading: { he: "הבידול מוכן. עכשיו בנה את תוכנית השיווק", en: "Positioning ready. Now build the marketing plan" },
    body: { he: "כל הסקריפטים, הכותרות וה-hooks ישתמשו בבידול שגילינו כאן.", en: "All scripts, headlines, and hooks will leverage the positioning we just uncovered." },
    cta: { he: "בנה תוכנית שיווק →", en: "Build marketing plan →" },
  },
  // After module 2 → going to 3
  2: {
    heading: { he: "התוכנית מוכנה. עכשיו הכן סקריפטי מכירה", en: "Plan ready. Now build your sales scripts" },
    body: { he: "מגלים את פרופיל ה-DISC של הלקוח שלך ובונים סקריפטים שמותאמים לאישיותו.", en: "We'll detect your prospect's DISC profile and build scripts tailored to their personality." },
    cta: { he: "עבור למכירות →", en: "Go to Sales →" },
  },
  // After module 3 → going to 4
  3: {
    heading: { he: "סקריפטים מוכנים. עכשיו תכנן את המחיר הנכון", en: "Scripts ready. Now set the right price" },
    body: { he: "בונים מבנה 3 שכבות עם Decoy Tier, ומחשבים את ה-LTV:CAC האידאלי.", en: "We'll build a 3-tier structure with a Decoy Tier and calculate the ideal LTV:CAC ratio." },
    cta: { he: "עבור לתמחור →", en: "Go to Pricing →" },
  },
  // After module 4 → going to 5
  4: {
    heading: { he: "התמחור מוכן. עכשיו תכנן שימור וצמיחה", en: "Pricing ready. Now plan retention and growth" },
    body: { he: "מגדירים אסטרטגיית קליטה, מזהים אותות נטישה, ובונים לולאת צמיחה.", en: "We'll define your onboarding sequence, detect churn signals, and build a growth loop." },
    cta: { he: "עבור לשימור →", en: "Go to Retention →" },
  },
};

// ─── Pipeline Dots ────────────────────────────────────────────────────────────

function PipelineDots({
  current,
  language,
}: {
  current: number;
  language: "he" | "en";
}) {
  return (
    <div
      className="flex items-center justify-center gap-1.5"
      dir="ltr"
      aria-label={tx({ he: `שלב ${current} מתוך 5`, en: `Step ${current} of 5` }, language)}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const meta = MODULES[n];
        const Icon = meta.icon;
        const done = n < current;
        const active = n === current;
        const next = n === current + 1;

        return (
          <div key={n} className="flex items-center">
            <div
              className={[
                "flex items-center justify-center rounded-full transition-all duration-300",
                done
                  ? "w-6 h-6 bg-green-500 text-white"
                  : active
                    ? `w-8 h-8 ${meta.bgColor} border-2 ${meta.borderColor} ${meta.color}`
                    : next
                      ? `w-7 h-7 ${meta.bgColor} border ${meta.borderColor} ${meta.color} opacity-80 animate-pulse`
                      : "w-5 h-5 bg-muted border border-border text-muted-foreground opacity-50",
              ].join(" ")}
            >
              {done ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Icon className={done || active || next ? "w-3.5 h-3.5" : "w-3 h-3"} />
              )}
            </div>
            {n < 5 && (
              <div
                className={[
                  "h-0.5 w-5 mx-0.5 rounded-full transition-colors",
                  n < current ? "bg-green-400" : "bg-border",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export interface ModuleNextStepProps {
  /** The module number the user just completed (1-5) */
  current: 1 | 2 | 3 | 4 | 5;
}

export function ModuleNextStep({ current }: ModuleNextStepProps) {
  const { language } = useLanguage();
  const isHe = language === "he";
  const navigate = useNavigate();

  const isRtl = isHe;

  // ── Module 5 completion ──────────────────────────────────────────────────
  if (current === 5) {
    return (
      <div className="mt-10 mb-4">
        <Card className="border-2 border-primary/30 overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-primary to-pink-400" />
          <CardContent className="p-6 text-center space-y-4">
            <PipelineDots current={current} language={language} />
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Trophy className="h-7 w-7 text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold" dir="auto">
                {tx({ he: "כל 5 המודולים הושלמו!", en: "All 5 modules complete!" }, language)}
              </h3>
              <p className="text-sm text-muted-foreground" dir="auto">
                {isHe
                  ? "בנית בידול, תוכנית שיווק, מכירות, תמחור ושימור. מערכת צמיחה מלאה."
                  : "You've built differentiation, marketing, sales, pricing, and retention. A complete growth system."}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-1">
              <Button
                size="lg"
                onClick={() => navigate("/")}
                className="gap-2 bg-primary text-primary-foreground border-0"
              >
                <Sparkles className="h-4 w-4" />
                {tx({ he: "חזור למרכז הפקודה", en: "Back to Command Center" }, language)}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/wizard")}
                className="gap-2"
              >
                {tx({ he: "תוכנית חדשה", en: "New Plan" }, language)}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Modules 1-4: transition to next ─────────────────────────────────────
  const next = current + 1;
  const nextMeta = MODULES[next];
  const NextIcon = nextMeta.icon;
  const copy = NEXT_COPY[current];

  return (
    <div className="mt-10 mb-4">
      <Card
        className={`border-2 ${nextMeta.borderColor} overflow-hidden`}
      >
        {/* Thin gradient accent strip */}
        <div
          className={`h-1 w-full ${nextMeta.bgColor}`}
          style={{ opacity: 0.6 }}
        />
        <CardContent className="p-6 space-y-5">
          {/* Progress dots */}
          <PipelineDots current={current} language={language} />

          {/* Content row */}
          <div
            className="flex items-start gap-4"
            dir={isRtl ? "rtl" : "ltr"}
          >
            {/* Next module icon badge */}
            <div
              className={`shrink-0 flex h-12 w-12 items-center justify-center rounded-xl ${nextMeta.bgColor} border ${nextMeta.borderColor}`}
            >
              <NextIcon className={`h-6 w-6 ${nextMeta.color}`} />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide" dir="auto">
                {tx({ he: `מודול ${next} מתוך 5: ${nextMeta.label.he}`, en: `Module ${next} of 5: ${nextMeta.label.en}` }, language)}
              </p>
              <h3 className="font-bold text-foreground leading-snug" dir="auto">
                {copy.heading[language]}
              </h3>
              <p className="text-sm text-muted-foreground" dir="auto">
                {copy.body[language]}
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className={`flex ${isRtl ? "justify-start" : "justify-end"}`}>
            <Button
              size="lg"
              onClick={() => navigate(nextMeta.route)}
              className={`gap-2 ${nextMeta.bgColor} border ${nextMeta.borderColor} ${nextMeta.color} hover:opacity-90 font-semibold`}
              variant="outline"
            >
              {isRtl ? (
                <>
                  <ArrowLeft className="h-4 w-4" />
                  {copy.cta.he}
                </>
              ) : (
                <>
                  {copy.cta.en}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
