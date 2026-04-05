import { useLanguage } from "@/i18n/LanguageContext";
import { TIERS, PricingTier } from "@/lib/pricingTiers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface PricingPageProps {
  currentTier?: PricingTier;
  onSelectTier?: (tier: PricingTier) => void;
}

const PricingPage = ({ currentTier = "free", onSelectTier }: PricingPageProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";

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

      <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
        {TIERS.map((tier) => {
          const isCurrent = tier.id === currentTier;
          const isPopular = tier.id === "pro";
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
                <div className="text-3xl font-bold mt-2">{tier.price[language]}</div>
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
                  onClick={() => onSelectTier?.(tier.id)}
                >
                  {isCurrent
                    ? (isHe ? "התוכנית הנוכחית" : "Current Plan")
                    : tier.priceMonthly === 0
                      ? (isHe ? "התחל בחינם" : "Start Free")
                      : (isHe ? "שדרג עכשיו" : "Upgrade Now")}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PricingPage;
