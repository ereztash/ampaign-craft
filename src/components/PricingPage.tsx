import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { TIERS, PricingTier, BillingCycle, getEffectivePrice, getAnnualSavings } from "@/lib/pricingTiers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { tx } from "@/i18n/tx";
import { Check } from "lucide-react";

interface PricingPageProps {
  currentTier?: PricingTier;
  onSelectTier?: (tier: PricingTier, cycle: BillingCycle) => void;
}

const PricingPage = ({ currentTier = "free", onSelectTier }: PricingPageProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <div className="space-y-8 py-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground">
          {tx({ he: "בחר את התוכנית שלך", en: "Choose Your Plan" }, language)}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {tx({ he: "התחל בחינם, שדרג כשאתה מוכן", en: "Start free, upgrade when you're ready" }, language)}
        </p>
      </div>

      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center gap-2">
        <div className="inline-flex items-center rounded-full border bg-muted p-1 gap-1">
          <button
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              cycle === "monthly"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setCycle("monthly")}
          >
            {tx({ he: "חודשי", en: "Monthly" }, language)}
          </button>
          <button
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
              cycle === "annual"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setCycle("annual")}
          >
            {tx({ he: "שנתי", en: "Annual" }, language)}
            <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-accent/20 text-accent border-0">
              {tx({ he: "חסכו 20%", en: "Save 20%" }, language)}
            </Badge>
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
        {TIERS.map((tier) => {
          const isCurrent = tier.id === currentTier;
          const isPopular = tier.id === "pro";
          const effectivePrice = getEffectivePrice(tier.id, cycle);
          const annualSavings = getAnnualSavings(tier.id);
          const showTrialBadge = cycle === "monthly" && tier.trialDays > 0;

          return (
            <Card
              key={tier.id}
              className={`relative ${isPopular ? "border-primary shadow-lg" : ""} ${isCurrent ? "ring-2 ring-accent" : ""}`}
            >
              {isPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground border-0">
                  {tx({ he: "הכי פופולרי", en: "Most Popular" }, language)}
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle>{tier.name[language]}</CardTitle>

                <div className="mt-2">
                  {tier.priceMonthly === 0 ? (
                    <div className="text-3xl font-bold">₪0</div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold">
                        ₪{effectivePrice}
                        <span className="text-base font-normal text-muted-foreground">
                          {tx({ he: "/חודש", en: "/mo" }, language)}
                        </span>
                      </div>
                      {cycle === "annual" && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isHe
                            ? `₪${tier.priceAnnualTotal} לשנה · חסכון ₪${annualSavings}`
                            : `₪${tier.priceAnnualTotal}/year · save ₪${annualSavings}`}
                        </p>
                      )}
                      {cycle === "monthly" && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isHe
                            ? `₪${tier.priceAnnualMonthly}/חודש בחיוב שנתי`
                            : `₪${tier.priceAnnualMonthly}/mo billed annually`}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {showTrialBadge && (
                  <Badge variant="outline" className="mx-auto mt-1 text-xs">
                    {tx({ he: `${tier.trialDays} ימי ניסיון חינם`, en: `${tier.trialDays}-day free trial` }, language)}
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {tier.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <span>{f[language]}</span>
                    </div>
                  ))}
                </div>
                <Button
                  className={`w-full ${isPopular ? "bg-primary text-primary-foreground border-0" : ""}`}
                  variant={isPopular ? "default" : "outline"}
                  disabled={isCurrent}
                  onClick={() => onSelectTier?.(tier.id, cycle)}
                >
                  {isCurrent
                    ? (tx({ he: "התוכנית הנוכחית", en: "Current Plan" }, language))
                    : tier.priceMonthly === 0
                      ? (tx({ he: "התחל בחינם", en: "Start Free" }, language))
                      : showTrialBadge
                        ? (tx({ he: "התחל ניסיון חינם", en: "Start Free Trial" }, language))
                        : (tx({ he: "שדרג עכשיו", en: "Upgrade Now" }, language))}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {tx({ he: "ניתן לבטל בכל עת · ללא כרטיס אשראי לגרסה החינמית", en: "Cancel anytime · No credit card for free plan" }, language)}
      </p>
    </div>
  );
};

export default PricingPage;
