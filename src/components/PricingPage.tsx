import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { TIERS, PricingTier, BillingCycle, getEffectivePrice, getAnnualSavings } from "@/lib/pricingTiers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
          {isHe ? "בחר את התוכנית שלך" : "Choose Your Plan"}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {isHe ? "התחל בחינם, שדרג כשאתה מוכן" : "Start free, upgrade when you're ready"}
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
            {isHe ? "חודשי" : "Monthly"}
          </button>
          <button
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
              cycle === "annual"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setCycle("annual")}
          >
            {isHe ? "שנתי" : "Annual"}
            <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-accent/20 text-accent border-0">
              {isHe ? "חסכו 20%" : "Save 20%"}
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
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 funnel-gradient border-0 text-accent-foreground">
                  {isHe ? "הכי פופולרי" : "Most Popular"}
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
                          {isHe ? "/חודש" : "/mo"}
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
                    {isHe ? `${tier.trialDays} ימי ניסיון חינם` : `${tier.trialDays}-day free trial`}
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
                  className={`w-full ${isPopular ? "funnel-gradient border-0 text-accent-foreground" : ""}`}
                  variant={isPopular ? "default" : "outline"}
                  disabled={isCurrent}
                  onClick={() => onSelectTier?.(tier.id, cycle)}
                >
                  {isCurrent
                    ? (isHe ? "התוכנית הנוכחית" : "Current Plan")
                    : tier.priceMonthly === 0
                      ? (isHe ? "התחל בחינם" : "Start Free")
                      : showTrialBadge
                        ? (isHe ? "התחל ניסיון חינם" : "Start Free Trial")
                        : (isHe ? "שדרג עכשיו" : "Upgrade Now")}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {isHe ? "ניתן לבטל בכל עת · ללא כרטיס אשראי לגרסה החינמית" : "Cancel anytime · No credit card for free plan"}
      </p>
    </div>
  );
};

export default PricingPage;
