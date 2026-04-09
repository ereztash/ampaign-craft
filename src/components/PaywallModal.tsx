import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { TIERS, PricingTier, Feature } from "@/lib/pricingTiers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Lock } from "lucide-react";
import { toast } from "sonner";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: Feature;
  requiredTier: PricingTier;
}

const PaywallModal = ({ open, onOpenChange, feature, requiredTier }: PaywallModalProps) => {
  const { language } = useLanguage();
  const { setTier, isLocalAuth } = useAuth();
  const isHe = language === "he";
  const tier = TIERS.find((t) => t.id === requiredTier) || TIERS[1];

  const handleUpgrade = () => {
    if (import.meta.env.DEV && isLocalAuth) {
      // Dev-only: instant tier change for testing
      setTier(requiredTier);
      toast.success(isHe ? `שודרגת ל-${tier.name.he}!` : `Upgraded to ${tier.name.en}!`);
      onOpenChange(false);
    } else {
      // Redirect to checkout (Stripe Edge Function)
      window.open("/pricing-plans", "_blank");
    }
  };

  const FEATURE_NAMES: Record<Feature, { he: string; en: string }> = {
    maxFunnels: { he: "משפכים ללא הגבלה", en: "Unlimited funnels" },
    aiCoachMessages: { he: "מאמן שיווק AI", en: "AI Marketing Coach" },
    pdfExport: { he: "ייצוא PDF", en: "PDF Export" },
    whatsappTemplates: { he: "תבניות WhatsApp", en: "WhatsApp Templates" },
    campaignCockpit: { he: "Campaign Cockpit", en: "Campaign Cockpit" },
    templatePublishing: { he: "פרסום תבניות", en: "Template Publishing" },
    differentiationAgent: { he: "סוכן בידול", en: "Differentiation Agent" },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-center">
            <Lock className="h-5 w-5 text-primary" />
            {isHe ? "שדרג את החשבון שלך" : "Upgrade Your Account"}
          </DialogTitle>
        </DialogHeader>

        <div className="text-center space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">
            {isHe
              ? `${FEATURE_NAMES[feature]?.he || feature} זמין בתוכנית ${tier.name.he}`
              : `${FEATURE_NAMES[feature]?.en || feature} is available in the ${tier.name.en} plan`}
          </p>

          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6">
            <Badge className="mb-2">{tier.name[language]}</Badge>
            <div className="text-3xl font-bold text-foreground mb-4">{tier.price[language]}</div>
            <div className="space-y-2 text-start">
              {tier.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>{f[language]}</span>
                </div>
              ))}
            </div>
          </div>

          <Button className="w-full cta-warm" size="lg" onClick={handleUpgrade}>
            {isHe ? `שדרג ל-${tier.name.he}` : `Upgrade to ${tier.name.en}`}
          </Button>

          <p className="text-xs text-muted-foreground">
            {isHe ? "ניתן לבטל בכל עת" : "Cancel anytime"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaywallModal;
