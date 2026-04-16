// ═══════════════════════════════════════════════
// PricingWizard — 4-step behavioural-science pricing flow
//
// Step 1 — Value Quantification  (Hormozi D × T axes)
// Step 2 — Van Westendorp PSM    (too-cheap floor × stretch ceiling)
// Step 3 — Offer Architecture    (Hormozi E × P axes + differentiators)
// Step 4 — Revenue Architecture  (model + goal → LTV/CAC/customers)
//
// The wizard never asks "what's your price?" — it DERIVES the optimal
// price from customer-perception signals and value-delivery evidence.
// ═══════════════════════════════════════════════

import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { radioCard, radioGroup, checkboxCard } from "@/lib/a11y";
import { SalesModel } from "@/types/funnel";
import { tx } from "@/i18n/tx";
import {
  DIFFERENTIATOR_OPTIONS,
  type PricingWizardInput,
  type DreamOutcomeLevel,
  type TimeToValue,
  type EffortLevel,
  type SocialProofLevel,
} from "@/engine/pricingWizardEngine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, ArrowLeft, Zap, BarChart2, Layers, Target, Info } from "lucide-react";

// ── Props ────────────────────────────────────────────────────────────────

interface Props {
  /** Pre-fill from existing formData when available. */
  initialSalesModel?: SalesModel | "";
  audienceIsB2B?: boolean;
  onComplete: (data: PricingWizardInput) => void;
}

// ── Constants ────────────────────────────────────────────────────────────

const STEPS = 4;

// ── Helpers ──────────────────────────────────────────────────────────────

function formatNIS(n: number) {
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
}

function OptionCard({
  selected,
  onClick,
  label,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      {...radioCard(selected, label)}
      className={`w-full text-start rounded-xl border-2 p-3.5 transition-colors ${
        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
            selected ? "border-primary" : "border-muted-foreground"
          }`}
        >
          {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </button>
  );
}

function StepHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center space-y-1">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="text-xl font-bold" dir="auto">{title}</h3>
      <p className="text-sm text-muted-foreground" dir="auto">{subtitle}</p>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────

const PricingWizard = ({
  initialSalesModel = "",
  audienceIsB2B = false,
  onComplete,
}: Props) => {
  const { language } = useLanguage();
  const isHe = language === "he";

  // Step index
  const [step, setStep] = useState(0);

  // Step 1 — Value Quantification
  const [dreamOutcome, setDreamOutcome]   = useState<DreamOutcomeLevel>("significant");
  const [timeToValue,  setTimeToValue]    = useState<TimeToValue>("moderate");

  // Step 2 — PSM
  const [tooChcapPrice, setTooChcapPrice]   = useState<number>(0);
  const [tooChcapInput, setTooChcapInput]   = useState("");
  const [stretchPrice,  setStretchPrice]    = useState<number>(0);
  const [stretchInput,  setStretchInput]    = useState("");

  // Step 3 — Offer Architecture
  const [effortLevel,     setEffortLevel]    = useState<EffortLevel>("medium");
  const [socialProof,     setSocialProof]    = useState<SocialProofLevel>("some");
  const [differentiators, setDifferentiators] = useState<string[]>([]);

  // Step 4 — Revenue Architecture
  const [salesModel,           setSalesModel]           = useState<SalesModel>(
    (initialSalesModel as SalesModel) || "oneTime",
  );
  const [retention,            setRetention]            = useState(12);
  const [revenueGoal,          setRevenueGoal]          = useState(0);
  const [revenueInput,         setRevenueInput]         = useState("");

  // ── Toggle differentiator ──────────────────────────────────────────────

  const toggleDiff = (key: string) => {
    setDifferentiators((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  // ── Validation ─────────────────────────────────────────────────────────

  const canAdvance = () => {
    if (step === 1) return tooChcapPrice > 0 && stretchPrice > tooChcapPrice;
    return true;
  };

  // ── Navigation ─────────────────────────────────────────────────────────

  const advance = () => { if (step < STEPS - 1) setStep(step + 1); };
  const back    = () => { if (step > 0) setStep(step - 1); };

  const finish = () => {
    onComplete({
      dreamOutcome,
      timeToValue,
      tooChcapPrice,
      stretchPrice,
      effortLevel,
      socialProof,
      differentiators,
      salesModel,
      avgRetentionMonths: retention,
      revenueGoalMonthly: revenueGoal,
      audienceIsB2B,
    });
  };

  // ── PSM preview ────────────────────────────────────────────────────────

  const psmMidpoint =
    tooChcapPrice > 0 && stretchPrice > tooChcapPrice
      ? Math.round(Math.sqrt(tooChcapPrice * stretchPrice))
      : null;

  // Rev4: Live price preview — monthly / annual with savings (Endowment + Anchoring)
  const liveTierLabel = psmMidpoint !== null
    ? psmMidpoint < 100 ? (isHe ? "Lite" : "Lite")
      : psmMidpoint < 200 ? (isHe ? "Pro" : "Pro")
      : (isHe ? "Business" : "Business")
    : null;
  const liveMonthly = psmMidpoint !== null ? psmMidpoint : null;
  const liveAnnual = liveMonthly !== null ? Math.round(liveMonthly * 12 * 0.8) : null;
  const liveSavings = liveMonthly !== null && liveAnnual !== null ? Math.round(liveMonthly * 12 - liveAnnual) : null;

  // ── Step content ────────────────────────────────────────────────────────

  const stepContent = [

    // ── STEP 0 — Value Quantification ────────────────────────────────────
    <div key="value" className="space-y-5">
      <StepHeader
        icon={Zap}
        title={tx({ he: "מה הלקוח מרוויח?", en: "What does your customer gain?" }, language)}
        subtitle={isHe
          ? "לא שואלים את המחיר — גוזרים אותו מהערך"
          : "We don't ask your price — we derive it from value"}
      />

      <div className="space-y-3">
        <p id="dream-outcome-label" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide" dir="auto">
          {tx({ he: "תוצאה חלומית (Dream Outcome):", en: "Dream Outcome:" }, language)}
        </p>
        <div {...radioGroup("dream-outcome-label")}>
        {(
          [
            {
              id: "transformative" as DreamOutcomeLevel,
              he: "טרנספורמציה",
              en: "Transformative",
              subHe: "שינוי חיים / עסק — תוצאה שמשנה הכל",
              subEn: "Life/business change — outcome that changes everything",
            },
            {
              id: "significant" as DreamOutcomeLevel,
              he: "משמעותי",
              en: "Significant",
              subHe: "שיפור גדול ניתן למדידה — הכנסות, זמן, לקוחות",
              subEn: "Large measurable improvement — revenue, time, clients",
            },
            {
              id: "moderate" as DreamOutcomeLevel,
              he: "בינוני",
              en: "Moderate",
              subHe: "עזרה ממוקדת — תוצאה ברורה אבל מוגבלת",
              subEn: "Focused help — clear but limited outcome",
            },
            {
              id: "incremental" as DreamOutcomeLevel,
              he: "שיפור קטן",
              en: "Incremental",
              subHe: "שיפור הדרגתי — ניסוי ולמידה",
              subEn: "Gradual improvement — trial and learning",
            },
          ] as const
        ).map((opt) => (
          <OptionCard
            key={opt.id}
            selected={dreamOutcome === opt.id}
            onClick={() => setDreamOutcome(opt.id)}
            label={tx(opt, language)}
          >
            <div className="font-medium text-sm" dir="auto">{tx(opt, language)}</div>
            <div className="text-xs text-muted-foreground" dir="auto">{isHe ? opt.subHe : opt.subEn}</div>
          </OptionCard>
        ))}
        </div>
      </div>

      <div className="space-y-3">
        <p id="time-to-value-label" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide" dir="auto">
          {tx({ he: "מהירות לתוצאה (Time to Value):", en: "Time to Value:" }, language)}
        </p>
        <div {...radioGroup("time-to-value-label")} className="grid grid-cols-2 gap-2">
          {(
            [
              { id: "immediate" as TimeToValue, he: "מיידי (< שבוע)",   en: "Immediate (< 1 week)" },
              { id: "fast"      as TimeToValue, he: "מהיר (2–4 שבועות)", en: "Fast (2–4 weeks)" },
              { id: "moderate"  as TimeToValue, he: "בינוני (1–3 חודשים)", en: "Moderate (1–3 months)" },
              { id: "slow"      as TimeToValue, he: "ארוך (3+ חודשים)",   en: "Slow (3+ months)" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setTimeToValue(opt.id)}
              {...radioCard(timeToValue === opt.id, tx(opt, language))}
              className={`rounded-lg border-2 px-3 py-2 text-sm text-center transition-colors ${
                timeToValue === opt.id
                  ? "border-primary bg-primary/5 font-medium"
                  : "border-border hover:border-primary/40"
              }`}
              dir="auto"
            >
              {tx(opt, language)}
            </button>
          ))}
        </div>
      </div>
    </div>,

    // ── STEP 1 — Van Westendorp PSM ───────────────────────────────────────
    <div key="psm" className="space-y-5">
      <StepHeader
        icon={BarChart2}
        title={tx({ he: "מה הרגישות של הלקוח למחיר?", en: "What is your customer's price sensitivity?" }, language)}
        subtitle={isHe
          ? "שתי שאלות — מגדירות את טווח ה-WTP (Van Westendorp PSM)"
          : "Two questions — define the WTP range (Van Westendorp PSM)"}
      />

      <div className="rounded-xl border bg-muted/30 p-3 flex items-start gap-2">
        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground" dir="auto">
          {isHe
            ? "חשוב: ענה מנקודת מבט הלקוח שלך — כמה הוא ישלם, לא כמה העלות שלך."
            : "Important: answer from your customer's perspective — what they'd pay, not your cost."}
        </p>
      </div>

      {/* Too cheap */}
      <div className="space-y-2">
        <label htmlFor="psm-too-cheap" className="text-sm font-medium" dir="auto">
          {isHe
            ? "🟡 מחיר שמרגיש זול מדי — לקוח יתחיל לפקפק באיכות:"
            : "🟡 Price that feels too cheap — customer starts doubting quality:"}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-muted-foreground" aria-hidden="true">₪</span>
          <input
            id="psm-too-cheap"
            type="number"
            min={0}
            placeholder="0"
            value={tooChcapInput}
            aria-label={tx({ he: "מחיר זול מדי (בשקלים)", en: "Too-cheap price threshold (ILS)" }, language)}
            onChange={(e) => {
              setTooChcapInput(e.target.value);
              const n = parseFloat(e.target.value);
              if (!isNaN(n) && n >= 0) setTooChcapPrice(n);
            }}
            className="w-32 text-2xl font-bold text-center bg-transparent border-b-2 border-amber-400 focus:outline-none focus:border-amber-500"
            dir="ltr"
          />
        </div>
      </div>

      {/* Stretch price */}
      <div className="space-y-2">
        <label className="text-sm font-medium" dir="auto">
          {isHe
            ? "🔴 מחיר שמרגיש יקר אבל שווה — לקוח יהסס אבל ישלם:"
            : "🔴 Price that feels expensive but worth it — customer hesitates but pays:"}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-muted-foreground">₪</span>
          <input
            type="number"
            min={0}
            placeholder="0"
            value={stretchInput}
            onChange={(e) => {
              setStretchInput(e.target.value);
              const n = parseFloat(e.target.value);
              if (!isNaN(n) && n > 0) setStretchPrice(n);
            }}
            className="w-32 text-2xl font-bold text-center bg-transparent border-b-2 border-rose-400 focus:outline-none focus:border-rose-500"
            dir="ltr"
          />
        </div>
        {stretchPrice > 0 && stretchPrice <= tooChcapPrice && (
          <p className="text-xs text-destructive" dir="auto">
            {tx({ he: "המחיר היקר חייב להיות גבוה מהמחיר הזול", en: "Stretch price must be higher than the floor" }, language)}
          </p>
        )}
      </div>

      {/* PSM preview */}
      {psmMidpoint !== null && (
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground" dir="auto">
              {tx({ he: "טווח מחיר מקובל:", en: "Acceptable price range:" }, language)}
            </span>
            <Badge>
              {formatNIS(tooChcapPrice)} — {formatNIS(stretchPrice)}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground" dir="auto">
              {tx({ he: "נקודת מחיר אופטימלית (PSM):", en: "Optimal Price Point (PSM):" }, language)}
            </span>
            <Badge variant="default" className="font-bold">
              ~ {formatNIS(psmMidpoint)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground" dir="auto">
            {isHe
              ? "המחיר הסופי ישתנה בהתאם לציון הערך ועוצמת הבידול"
              : "Final price adjusts based on value score and differentiation premium"}
          </p>
        </div>
      )}
    </div>,

    // ── STEP 2 — Offer Architecture ───────────────────────────────────────
    <div key="offer" className="space-y-5">
      <StepHeader
        icon={Layers}
        title={tx({ he: "עוצמת ההצעה שלך", en: "Your offer strength" }, language)}
        subtitle={isHe
          ? "קובע את כפולת המחיר (Hormozi E×P + בידול)"
          : "Determines your price multiplier (Hormozi E×P + differentiation)"}
      />

      {/* Effort level */}
      <div className="space-y-2">
        <p id="effort-level-label" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide" dir="auto">
          {tx({ he: "כמה מאמץ מצד הלקוח?", en: "How much effort does the customer need?" }, language)}
        </p>
        <div {...radioGroup("effort-level-label")} className="grid grid-cols-2 gap-2">
          {(
            [
              { id: "zero"   as EffortLevel, he: "אפס — הכל מוכן",        en: "Zero — fully done-for-you" },
              { id: "low"    as EffortLevel, he: "נמוך — ניהול קל",        en: "Low — light management" },
              { id: "medium" as EffortLevel, he: "בינוני — צריך לתרגל",    en: "Medium — requires practice" },
              { id: "high"   as EffortLevel, he: "גבוה — תהליך ארוך",      en: "High — lengthy process" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setEffortLevel(opt.id)}
              {...radioCard(effortLevel === opt.id, tx(opt, language))}
              className={`rounded-lg border-2 px-3 py-2 text-sm text-center transition-colors ${
                effortLevel === opt.id
                  ? "border-primary bg-primary/5 font-medium"
                  : "border-border hover:border-primary/40"
              }`}
              dir="auto"
            >
              {tx(opt, language)}
            </button>
          ))}
        </div>
      </div>

      {/* Social proof */}
      <div className="space-y-2">
        <p id="social-proof-label" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide" dir="auto">
          {tx({ he: "כמה הוכחה חברתית יש לך?", en: "How much social proof do you have?" }, language)}
        </p>
        <div {...radioGroup("social-proof-label")} className="grid grid-cols-2 gap-2">
          {(
            [
              { id: "none"        as SocialProofLevel, he: "אין עדיין",          en: "None yet" },
              { id: "some"        as SocialProofLevel, he: "כמה ביקורות",         en: "A few reviews" },
              { id: "strong"      as SocialProofLevel, he: "המלצות + תוצאות",    en: "Testimonials + results" },
              { id: "exceptional" as SocialProofLevel, he: "Case Studies מוכחים", en: "Proven case studies" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSocialProof(opt.id)}
              {...radioCard(socialProof === opt.id, tx(opt, language))}
              className={`rounded-lg border-2 px-3 py-2 text-sm text-center transition-colors ${
                socialProof === opt.id
                  ? "border-primary bg-primary/5 font-medium"
                  : "border-border hover:border-primary/40"
              }`}
              dir="auto"
            >
              {tx(opt, language)}
            </button>
          ))}
        </div>
      </div>

      {/* Differentiators (multi-select) */}
      <div className="space-y-2">
        <p id="differentiators-label" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide" dir="auto">
          {tx({ he: "מה מבדל אותך? (בחר הכל שרלוונטי)", en: "What differentiates you? (select all that apply)" }, language)}
        </p>
        <div role="group" aria-labelledby="differentiators-label" className="space-y-1.5">
          {DIFFERENTIATOR_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => toggleDiff(opt.key)}
              {...checkboxCard(differentiators.includes(opt.key), tx(opt, language))}
              className={`w-full flex items-center gap-2.5 rounded-lg border-2 px-3 py-2 text-start transition-colors ${
                differentiators.includes(opt.key)
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-accent/40"
              }`}
            >
              <div
                aria-hidden="true"
                className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                  differentiators.includes(opt.key)
                    ? "bg-accent border-accent"
                    : "border-muted-foreground"
                }`}
              >
                {differentiators.includes(opt.key) && (
                  <span className="text-accent-foreground text-[10px] font-bold leading-none">✓</span>
                )}
              </div>
              <div className="flex items-center justify-between flex-1 min-w-0">
                <span className="text-sm" dir="auto">{tx(opt, language)}</span>
                <Badge variant="outline" className="text-xs shrink-0 ms-2">+{opt.premiumPct}%</Badge>
              </div>
            </button>
          ))}
        </div>
        {differentiators.length > 0 && (
          <p className="text-xs text-accent text-center" dir="auto">
            {isHe
              ? `פרמיה כוללת: ~${differentiators.reduce((s, k) => s + (DIFFERENTIATOR_OPTIONS.find((o) => o.key === k)?.premiumPct ?? 0), 0)}% מעל ה-OPP`
              : `Total premium: ~${differentiators.reduce((s, k) => s + (DIFFERENTIATOR_OPTIONS.find((o) => o.key === k)?.premiumPct ?? 0), 0)}% above OPP`}
          </p>
        )}
      </div>
    </div>,

    // ── STEP 3 — Revenue Architecture ────────────────────────────────────
    <div key="revenue" className="space-y-5">
      <StepHeader
        icon={Target}
        title={tx({ he: "ארכיטקטורת הכנסות", en: "Revenue architecture" }, language)}
        subtitle={isHe
          ? "מודל המכירה ויעד הכנסה → LTV + CAC מומלץ"
          : "Sales model + revenue goal → LTV + recommended CAC"}
      />

      {/* Sales model */}
      <div {...radioGroup()} className="grid gap-2">
        {(
          [
            {
              id:    "oneTime"      as SalesModel,
              he:    "תשלום חד-פעמי",
              en:    "One-time payment",
              subHe: "קורס, מוצר, פרויקט",
              subEn: "Course, product, project",
            },
            {
              id:    "subscription" as SalesModel,
              he:    "מנוי חוזר",
              en:    "Recurring subscription",
              subHe: "חודשי / שנתי",
              subEn: "Monthly / annual",
            },
            {
              id:    "leads"        as SalesModel,
              he:    "ליד / שיחת מכירה",
              en:    "Lead / sales call",
              subHe: "שירות, ייעוץ",
              subEn: "Service, consulting",
            },
          ] as const
        ).map((opt) => (
          <OptionCard
            key={opt.id}
            selected={salesModel === opt.id}
            onClick={() => setSalesModel(opt.id)}
            label={tx(opt, language)}
          >
            <div className="font-medium text-sm" dir="auto">{tx(opt, language)}</div>
            <div className="text-xs text-muted-foreground" dir="auto">{isHe ? opt.subHe : opt.subEn}</div>
          </OptionCard>
        ))}
      </div>

      {salesModel === "subscription" && (
        <div className="space-y-2 rounded-xl border p-3 bg-muted/30">
          <div className="flex items-center justify-between text-sm">
            <span dir="auto">{tx({ he: "תקופת שימור ממוצעת:", en: "Avg retention:" }, language)}</span>
            <Badge variant="outline">
              {retention} {tx({ he: "חודשים", en: "months" }, language)}
            </Badge>
          </div>
          <Slider
            value={[retention]}
            onValueChange={([v]) => setRetention(v)}
            min={1}
            max={36}
            step={1}
            aria-label={tx({ he: "תקופת שימור ממוצעת בחודשים", en: "Average retention in months" }, language)}
            aria-valuenow={retention}
            aria-valuemin={1}
            aria-valuemax={36}
          />
        </div>
      )}

      {/* Revenue goal */}
      <div className="space-y-2">
        <label className="text-sm font-medium" dir="auto">
          {tx({ he: "יעד הכנסה חודשי (אופציונלי):", en: "Monthly revenue goal (optional):" }, language)}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-muted-foreground">₪</span>
          <input
            type="number"
            min={0}
            placeholder="0"
            value={revenueInput}
            onChange={(e) => {
              setRevenueInput(e.target.value);
              const n = parseFloat(e.target.value);
              if (!isNaN(n) && n >= 0) setRevenueGoal(n);
            }}
            className="w-32 text-2xl font-bold text-center bg-transparent border-b-2 border-primary focus:outline-none"
            dir="ltr"
          />
          <span className="text-sm text-muted-foreground" dir="auto">
            {tx({ he: "/חודש", en: "/month" }, language)}
          </span>
        </div>
      </div>

      {/* PSM range reminder */}
      {psmMidpoint !== null && (
        <div className="rounded-xl border bg-muted/30 p-3 text-sm space-y-1" dir="auto">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{tx({ he: "OPP (PSM):", en: "OPP (PSM):" }, language)}</span>
            <span className="font-medium">~ {formatNIS(psmMidpoint)}</span>
          </div>
          {revenueGoal > 0 && psmMidpoint > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{tx({ he: "לקוחות נדרשים:", en: "Customers needed:" }, language)}</span>
              <span className="font-bold text-primary">
                {Math.ceil(revenueGoal / psmMidpoint)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>,
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto space-y-8 py-4">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span dir="auto">
            {tx({ he: `שלב ${step + 1} מתוך ${STEPS}`, en: `Step ${step + 1} of ${STEPS}` }, language)}
          </span>
          <span>{Math.round(((step + 1) / STEPS) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground/60" dir="auto">
          {[
            tx({ he: "ערך", en: "Value" }, language),
            tx({ he: "PSM", en: "PSM" }, language),
            tx({ he: "הצעה", en: "Offer" }, language),
            tx({ he: "הכנסות", en: "Revenue" }, language),
          ].map((label, i) => (
            <span key={i} className={i === step ? "text-primary font-medium" : ""}>{label}</span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[360px]">
        {stepContent[step]}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={back}
          disabled={step === 0}
          className="gap-1"
        >
          {isHe ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          {tx({ he: "חזור", en: "Back" }, language)}
        </Button>

        {step < STEPS - 1 ? (
          <Button
            onClick={advance}
            disabled={!canAdvance()}
            className="gap-1 flex-1 cta-warm"
          >
            {tx({ he: "המשך", en: "Next" }, language)}
            {isHe ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          </Button>
        ) : (
          <Button
            onClick={finish}
            className="gap-1 flex-1 cta-warm"
          >
            {tx({ he: "ייצר אסטרטגיית תמחור", en: "Generate Pricing Strategy" }, language)}
            {isHe ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Rev4: Live price preview strip (Endowment + Anchoring) */}
      {liveMonthly !== null && liveTierLabel !== null && (
        <div className="rounded-xl border-2 border-accent/30 bg-accent/5 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <div dir="auto">
            <span className="text-muted-foreground">{tx({ he: "תוכנית מומלצת:", en: "Recommended tier:" }, language)}</span>
            <span className="font-bold text-foreground ms-2">{liveTierLabel}</span>
          </div>
          <div className="flex gap-3 flex-wrap">
            <span className="font-bold text-foreground">{formatNIS(liveMonthly)}{isHe ? "/חודש" : "/mo"}</span>
            {liveAnnual !== null && (
              <span className="text-muted-foreground">
                {isHe ? "שנתי:" : "Annual:"} {formatNIS(liveAnnual)}
                {liveSavings !== null && liveSavings > 0 && (
                  <span className="text-accent ms-1">{isHe ? `חיסכון ${formatNIS(liveSavings)}` : `Save ${formatNIS(liveSavings)}`}</span>
                )}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Methodology footnote */}
      <p className="text-center text-[10px] text-muted-foreground/60" dir="auto">
        Van Westendorp PSM · Hormozi Value Eq. · Kahneman Prospect Theory · Ariely Decoy Effect
      </p>
    </div>
  );
};

export default PricingWizard;
