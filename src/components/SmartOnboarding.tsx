import { useState, useMemo, useCallback, useEffect } from "react";
import { trackOnboardingAbandoned, trackArchetypeRevealed } from "@/services/eventQueue";
import { Analytics } from "@/lib/analytics";
import { useLanguage } from "@/i18n/LanguageContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AdaptiveSlider } from "@/components/ui/adaptive-slider";
import BusinessDNACard from "@/components/BusinessDNACard";
import { tx } from "@/i18n/tx";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, Check, GripVertical } from "lucide-react";
import {
  ShoppingBag, Monitor, UtensilsCrossed, Briefcase,
  GraduationCap, Heart, Building, Plane, User, MoreHorizontal,
} from "lucide-react";
import type { BusinessField, AudienceType, MainGoal, SalesModel } from "@/types/funnel";
import type { UnifiedProfile, ValuePriority } from "@/types/profile";
import { getIndustryDefaults, INITIAL_UNIFIED_PROFILE } from "@/types/profile";
import { computeFingerprint } from "@/engine/businessFingerprintEngine";

const ONBOARDING_DRAFT_KEY = "funnelforge-onboarding-draft";

interface SmartOnboardingProps {
  onComplete: (profile: UnifiedProfile) => void;
  initialProfile?: UnifiedProfile | null;
  userId?: string;
}

type Step = 1 | 2 | 3 | 4;

// Miller's Law: show 7±2 primary options, hide the rest behind "More"
const INDUSTRY_OPTIONS_PRIMARY: { id: BusinessField; icon: React.ElementType; label: { he: string; en: string } }[] = [
  { id: "fashion", icon: ShoppingBag, label: { he: "אופנה וקמעונאות", en: "Fashion & Retail" } },
  { id: "tech", icon: Monitor, label: { he: "טכנולוגיה", en: "Technology" } },
  { id: "food", icon: UtensilsCrossed, label: { he: "מזון ומשקאות", en: "Food & Beverage" } },
  { id: "services", icon: Briefcase, label: { he: "שירותים מקצועיים", en: "Professional Services" } },
  { id: "education", icon: GraduationCap, label: { he: "חינוך והדרכה", en: "Education & Training" } },
  { id: "health", icon: Heart, label: { he: "בריאות ורווחה", en: "Health & Wellness" } },
  { id: "personalBrand", icon: User, label: { he: "מותג אישי", en: "Personal Brand" } },
];

const INDUSTRY_OPTIONS_SECONDARY: { id: BusinessField; icon: React.ElementType; label: { he: string; en: string } }[] = [
  { id: "realEstate", icon: Building, label: { he: "נדל״ן", en: "Real Estate" } },
  { id: "tourism", icon: Plane, label: { he: "תיירות ואירוח", en: "Tourism & Hospitality" } },
  { id: "other", icon: MoreHorizontal, label: { he: "אחר", en: "Other" } },
];

const AUDIENCE_OPTIONS: { id: AudienceType; label: { he: string; en: string }; desc: { he: string; en: string } }[] = [
  { id: "b2c", label: { he: "צרכנים (B2C)", en: "Consumers (B2C)" }, desc: { he: "אנשים פרטיים", en: "Individual people" } },
  { id: "b2b", label: { he: "עסקים (B2B)", en: "Businesses (B2B)" }, desc: { he: "חברות וארגונים", en: "Companies & orgs" } },
  { id: "both", label: { he: "שניהם", en: "Both" }, desc: { he: "צרכנים + עסקים", en: "Consumers + businesses" } },
];

const GOAL_OPTIONS: { id: MainGoal; label: { he: string; en: string }; emoji: string }[] = [
  { id: "awareness", label: { he: "מודעות ונראות", en: "Brand Awareness" }, emoji: "📢" },
  { id: "leads", label: { he: "לידים ופניות", en: "Lead Generation" }, emoji: "🎯" },
  { id: "sales", label: { he: "מכירות והכנסות", en: "Sales & Revenue" }, emoji: "💰" },
  { id: "loyalty", label: { he: "שימור ונאמנות", en: "Retention & Loyalty" }, emoji: "💎" },
];

const VALUE_OPTIONS: { id: ValuePriority; label: { he: string; en: string }; emoji: string }[] = [
  { id: "speed", label: { he: "מהירות ליישום", en: "Speed to Market" }, emoji: "⚡" },
  { id: "quality", label: { he: "איכות ועומק", en: "Quality & Depth" }, emoji: "💎" },
  { id: "cost", label: { he: "חיסכון בעלויות", en: "Cost Efficiency" }, emoji: "💰" },
  { id: "innovation", label: { he: "חדשנות ובידול", en: "Innovation" }, emoji: "🚀" },
];

const SmartOnboarding = ({ onComplete, initialProfile, userId }: SmartOnboardingProps) => {
  const { language, isRTL } = useLanguage();
  const isHe = language === "he";
  const reducedMotion = useReducedMotion();

  // Restore draft from localStorage if no initialProfile passed
  const restoredProfile = useMemo(() => {
    if (initialProfile) return initialProfile;
    try {
      const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
      if (raw) return JSON.parse(raw) as UnifiedProfile;
    } catch { /* ignore */ }
    return null;
  }, [initialProfile]);

  const [step, setStep] = useState<Step>(1);
  const [profile, setProfile] = useState<UnifiedProfile>(
    restoredProfile || { ...INITIAL_UNIFIED_PROFILE }
  );
  const [showAllIndustries, setShowAllIndustries] = useState(false);

  // Persist draft on every profile change
  const update = useCallback((patch: Partial<UnifiedProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Track abandon on unmount (if not completed)
  const completedRef = { current: false };
  useEffect(() => {
    Analytics.onboardingStarted(userId);
    return () => {
      if (!completedRef.current && step > 1) {
        if (userId) {
          trackOnboardingAbandoned(userId, step).catch(() => {});
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fingerprint = useMemo(() => computeFingerprint(profile), [profile]);

  const personalizationPercent = useMemo(() => {
    const weights = [
      profile.businessField !== "other" ? 25 : 0,
      profile.mainGoal ? 20 : 0,
      profile.audienceType ? 15 : 0,
      step >= 3 ? 25 : 0,
      step >= 4 ? 15 : 0,
    ];
    return weights.reduce((a, b) => a + b, 0);
  }, [profile, step]);

  const canProceed = useMemo(() => {
    if (step === 1) return profile.businessField !== "other" || profile.businessField === "other";
    if (step === 2) return !!profile.audienceType && !!profile.mainGoal;
    return true;
  }, [step, profile]);

  const handleIndustrySelect = useCallback((field: BusinessField) => {
    const defaults = getIndustryDefaults(field);
    update({
      businessField: field,
      audienceType: defaults.audienceType,
      salesModel: defaults.salesModel,
      ageRange: defaults.ageRange,
      channels: defaults.channels,
      pricePositioning: defaults.pricePositioning,
      competitiveIntensity: defaults.competitiveIntensity,
      budgetCapacity: defaults.budgetCapacity,
      teamSize: defaults.teamSize,
      marketMaturity: defaults.marketMaturity,
    });
  }, [update]);

  const handleReorderValue = useCallback((fromIndex: number, direction: -1 | 1) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= 4) return;
    update({
      valuePriorities: profile.valuePriorities.map((v, i, arr) => {
        if (i === fromIndex) return arr[toIndex];
        if (i === toIndex) return arr[fromIndex];
        return v;
      }),
    });
  }, [profile.valuePriorities, update]);

  const mp = reducedMotion
    ? {}
    : { initial: { opacity: 0, x: isRTL ? -20 : 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: isRTL ? 20 : -20 }, transition: { duration: 0.2 } };

  return (
    <div className="min-h-screen px-4 pt-4 pb-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {tx({ he: `שלב ${step} מתוך 4`, en: `Step ${step} of 4` }, language)}
            </span>
            <Badge variant="outline" className="text-xs gap-1">
              <Sparkles className="h-3 w-3" />
              {tx({ he: `התאמה ${personalizationPercent}%`, en: `${personalizationPercent}% personalized` }, language)}
            </Badge>
          </div>
          <Progress value={step * 25} className="h-2" />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" {...mp}>
              <h1 className="text-2xl font-bold text-foreground mb-2 text-center" dir="auto">
                {tx({ he: "מה התחום שלך?", en: "What's your industry?" }, language)}
              </h1>
              <p className="text-muted-foreground text-center mb-6" dir="auto">
                {tx({ he: "בחר את התחום שהכי מתאים", en: "Select the best fit" }, language)}
              </p>
              {/* Primary 7 industries (Miller's Law compliant) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  ...INDUSTRY_OPTIONS_PRIMARY,
                  ...(showAllIndustries ? INDUSTRY_OPTIONS_SECONDARY : []),
                ].map((opt) => {
                  const selected = profile.businessField === opt.id;
                  return (
                    <Card
                      key={opt.id}
                      role="button"
                      tabIndex={0}
                      className={`cursor-pointer transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary ${
                        selected ? "border-primary border-2 bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => handleIndustrySelect(opt.id)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleIndustrySelect(opt.id); }}
                    >
                      <CardContent className="p-4 text-center">
                        <opt.icon className={`h-6 w-6 mx-auto mb-2 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`text-sm font-medium ${selected ? "text-primary" : "text-foreground"}`}>
                          {opt.label[language]}
                        </span>
                        {selected && <Check className="h-4 w-4 text-primary mx-auto mt-1" />}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {/* Show more / less toggle */}
              {!showAllIndustries && (
                <button
                  onClick={() => setShowAllIndustries(true)}
                  className="mt-3 text-sm text-muted-foreground hover:text-primary underline-offset-2 hover:underline w-full text-center"
                >
                  {tx({ he: "תחומים נוספים (נדל״ן, תיירות, אחר)...", en: "More industries (Real Estate, Tourism, Other)..." }, language)}
                </button>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" {...mp}>
              <h1 className="text-2xl font-bold text-foreground mb-2 text-center" dir="auto">
                {tx({ he: "למי ומה?", en: "Who & What?" }, language)}
              </h1>
              <p className="text-muted-foreground text-center mb-6" dir="auto">
                {tx({ he: "קהל יעד ומטרה עיקרית", en: "Target audience & primary goal" }, language)}
              </p>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3" dir="auto">
                    {tx({ he: "קהל יעד", en: "Target Audience" }, language)}
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {AUDIENCE_OPTIONS.map((opt) => {
                      const selected = profile.audienceType === opt.id;
                      return (
                        <Card
                          key={opt.id}
                          role="button"
                          tabIndex={0}
                          className={`cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                            selected ? "border-primary border-2 bg-primary/5" : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => update({ audienceType: opt.id })}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") update({ audienceType: opt.id }); }}
                        >
                          <CardContent className="p-3 text-center">
                            <span className={`text-sm font-medium block ${selected ? "text-primary" : "text-foreground"}`}>
                              {opt.label[language]}
                            </span>
                            <span className="text-xs text-muted-foreground">{opt.desc[language]}</span>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3" dir="auto">
                    {tx({ he: "מטרה עיקרית", en: "Primary Goal" }, language)}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {GOAL_OPTIONS.map((opt) => {
                      const selected = profile.mainGoal === opt.id;
                      return (
                        <Card
                          key={opt.id}
                          role="button"
                          tabIndex={0}
                          className={`cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                            selected ? "border-primary border-2 bg-primary/5" : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => update({ mainGoal: opt.id })}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") update({ mainGoal: opt.id }); }}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <span className="text-xl">{opt.emoji}</span>
                            <span className={`text-sm font-medium ${selected ? "text-primary" : "text-foreground"}`}>
                              {opt.label[language]}
                            </span>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" {...mp}>
              <h1 className="text-2xl font-bold text-foreground mb-2 text-center" dir="auto">
                {tx({ he: "ה-DNA העסקי שלך", en: "Your Business DNA" }, language)}
              </h1>
              <p className="text-muted-foreground text-center mb-6" dir="auto">
                {tx({ he: "כוונן את הסליידרים — הם כבר מכוילים לפי התחום שלך", en: "Fine-tune the sliders — they're pre-calibrated to your industry" }, language)}
              </p>

              <div className="space-y-5">
                <AdaptiveSlider
                  value={profile.pricePositioning}
                  onChange={(v) => update({ pricePositioning: v })}
                  label={{ he: "מיצוב מחיר", en: "Price Positioning" }}
                  labelLeft={{ he: "תקציבי", en: "Budget" }}
                  labelRight={{ he: "פרימיום", en: "Premium" }}
                />
                <AdaptiveSlider
                  value={profile.competitiveIntensity}
                  onChange={(v) => update({ competitiveIntensity: v })}
                  label={{ he: "עוצמת תחרות", en: "Competitive Intensity" }}
                  labelLeft={{ he: "אוקיינוס כחול", en: "Blue Ocean" }}
                  labelRight={{ he: "אוקיינוס אדום", en: "Red Ocean" }}
                />
                <AdaptiveSlider
                  value={profile.budgetCapacity}
                  onChange={(v) => update({ budgetCapacity: v })}
                  label={{ he: "יכולת תקציב", en: "Budget Capacity" }}
                  labelLeft={{ he: "בוטסטראפ", en: "Bootstrap" }}
                  labelRight={{ he: "ממומן היטב", en: "Well-funded" }}
                />
                <AdaptiveSlider
                  value={profile.teamSize}
                  onChange={(v) => update({ teamSize: v })}
                  label={{ he: "גודל צוות", en: "Team Size" }}
                  labelLeft={{ he: "סולו", en: "Solo" }}
                  labelRight={{ he: "צוות 50+", en: "Team 50+" }}
                />
                <AdaptiveSlider
                  value={profile.marketMaturity}
                  onChange={(v) => update({ marketMaturity: v })}
                  label={{ he: "בשלות שוק", en: "Market Maturity" }}
                  labelLeft={{ he: "קטגוריה חדשה", en: "New Category" }}
                  labelRight={{ he: "שוק מבוסס", en: "Established" }}
                />

                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium text-foreground mb-3" dir="auto">
                    {tx({ he: "סדר עדיפויות (גרור לסידור)", en: "Value Priorities (tap arrows to reorder)" }, language)}
                  </h3>
                  <div className="space-y-2">
                    {profile.valuePriorities.map((vId, idx) => {
                      const opt = VALUE_OPTIONS.find((o) => o.id === vId)!;
                      return (
                        <div
                          key={vId}
                          className="flex items-center gap-2 p-2 rounded-lg border bg-card"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                          <Badge variant="outline" className="text-xs shrink-0 w-5 h-5 p-0 flex items-center justify-center">
                            {idx + 1}
                          </Badge>
                          <span className="text-sm">{opt.emoji}</span>
                          <span className="text-sm font-medium flex-1">{opt.label[language]}</span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 min-h-[44px] min-w-[44px]"
                              disabled={idx === 0}
                              onClick={() => handleReorderValue(idx, -1)}
                            >
                              <ChevronLeft className="h-3 w-3 rotate-90" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 min-h-[44px] min-w-[44px]"
                              disabled={idx === profile.valuePriorities.length - 1}
                              onClick={() => handleReorderValue(idx, 1)}
                            >
                              <ChevronRight className="h-3 w-3 rotate-90" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" {...mp}>
              <h1 className="text-2xl font-bold text-foreground mb-2 text-center" dir="auto">
                {tx({ he: "הפרופיל שלך מוכן", en: "Your Profile is Ready" }, language)}
              </h1>
              <p className="text-muted-foreground text-center mb-6" dir="auto">
                {tx({ he: "ככה המערכת רואה את העסק שלך — נכון?", en: "This is how the system sees your business — look right?" }, language)}
              </p>

              <BusinessDNACard fingerprint={fingerprint} />

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground mb-4" dir="auto">
                  {isHe
                    ? "כל התוכן, ההמלצות והניתוח יותאמו לפרופיל הזה"
                    : "All content, recommendations, and analysis will adapt to this profile"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mt-8">
          {step > 1 ? (
            <Button
              variant="ghost"
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="gap-1"
            >
              {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              {tx({ he: "חזור", en: "Back" }, language)}
            </Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button
              onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={!canProceed}
              className="gap-1"
            >
              {tx({ he: "הבא", en: "Next" }, language)}
              {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          ) : (
            <Button
              onClick={() => {
                completedRef.current = true;
                // Clear draft — onboarding complete
                try { localStorage.removeItem(ONBOARDING_DRAFT_KEY); } catch { /* ignore */ }
                // Track completion
                if (userId) {
                  Analytics.firstPlanGenerated("pending", userId, profile.businessField);
                  trackArchetypeRevealed(userId, "pending", 0).catch(() => {});
                }
                onComplete(profile);
              }}
              className="gap-2 cta-warm"
            >
              <Sparkles className="h-4 w-4" />
              {tx({ he: "בנה את התוכנית שלי", en: "Build My Plan" }, language)}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartOnboarding;
